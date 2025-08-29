import config from '../config.cjs';
import { 
    generateWAMessageFromContent, 
    proto,
    areJidsSameUser 
} from 'baileys';

/**
 * Converts text to a fancy font style
 * @param {string} text - The text to convert
 * @param {boolean} [toUpperCase=false] - Whether to convert to uppercase first
 * @returns {string} The converted fancy text
 */
function toFancyFont(text, toUpperCase = false) {
    const fontMap = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ',
        'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
        'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ',
        'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    };
    
    const processedText = toUpperCase ? text.toUpperCase() : text.toLowerCase();
    
    return processedText
        .split('')
        .map(char => fontMap[char] || char)
        .join('');
}

/**
 * Deletes a quoted message when requested by authorized users
 * @param {object} message - The message object containing command and quoted message
 * @param {object} client - The WhatsApp client instance
 * @returns {Promise<void>}
 */
const deleteMessage = async (message, client) => {
    try {
        const userJid = client.user.id;
        const isAuthorizedUser = [userJid, `${config.OWNER_NUMBER}@s.whatsapp.net`]
            .some(jid => areJidsSameUser(message.sender, jid));
        
        const prefix = config.PREFIX;
        
        // Extract command from message body
        const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const command = messageText.startsWith(prefix) 
            ? messageText.slice(prefix.length).split(" ")[0].toLowerCase() 
            : '';
        
        const deleteCommands = ["dels", "deletes"];
        
        // Check if command is a delete command
        if (!deleteCommands.includes(command)) {
            return; // Not a delete command, do nothing
        }
        
        // Authorization check
        if (!isAuthorizedUser) {
            const ownerContactButton = [{
                buttonId: ".owner",
                buttonText: {
                    displayText: '👤' + toFancyFont("Contact Owner")
                },
                type: 1
            }];
            
            const messageOptions = {
                viewOnce: true,
                buttons: ownerContactButton
            };
            
            return await client.sendMessage(message.key.remoteJid, {
                text: "*THIS IS AN OWNER COMMAND*",
                ...messageOptions
            }, { quoted: message });
        }
        
        // Check if message is a reply
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        if (!contextInfo || !contextInfo.stanzaId) {
            const helpButton = [{
                buttonId: ".help",
                buttonText: {
                    displayText: '🤲' + toFancyFont("Help")
                },
                type: 1
            }];
            
            const messageOptions = {
                viewOnce: true,
                buttons: helpButton
            };
            
            return await client.sendMessage(message.key.remoteJid, {
                text: "✳️ Reply to the message you want to delete",
                ...messageOptions
            }, { quoted: message });
        }
        
        // Delete the quoted message
        const deleteTarget = {
            remoteJid: message.key.remoteJid,
            fromMe: contextInfo.participant === userJid || areJidsSameUser(contextInfo.participant, userJid),
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
        };
        
        await client.sendMessage(message.key.remoteJid, {
            delete: deleteTarget
        });
        
        // Send success confirmation
        const menuButton = [{
            buttonId: ".menu",
            buttonText: {
                displayText: '📃' + toFancyFont("Menu")
            },
            type: 1
        }];
        
        const successMessageOptions = {
            viewOnce: true,
            buttons: menuButton
        };
        
        await client.sendMessage(message.key.remoteJid, {
            text: '*' + toFancyFont("Message deleted successfully"),
            ...successMessageOptions
        });
        
    } catch (error) {
        console.error("Error deleting message:", error);
        
        const reportButton = [{
            buttonId: ".report",
            buttonText: {
                displayText: '⚠︎' + toFancyFont("Report")
            },
            type: 1
        }];
        
        const errorMessageOptions = {
            viewOnce: true,
            buttons: reportButton
        };
        
        await client.sendMessage(message.key.remoteJid, {
            text: "An error occurred while trying to delete the message.",
            ...errorMessageOptions
        }, { quoted: message });
    }
};

export default deleteMessage;
