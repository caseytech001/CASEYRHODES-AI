import config from '../config.cjs';
import { isUrl } from '../lib/myfunc.cjs';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

// Contact message for verified context
const quotedContact = {
    key: {
        fromMe: false,
        participant: `0@s.whatsapp.net`,
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "亗YCEE金CASEYRHODES",
            vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
        }
    }
};

const join = async (m, Matrix) => {
    const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363402973786789@newsletter",
            newsletterName: "亗YCEE金CASEYRHODES",
            serverMessageId: 269
        }
    };

    try {
        const prefix = config.PREFIX || ".";
        const body = m.message?.conversation || 
                    m.message?.extendedTextMessage?.text || 
                    m.message?.imageMessage?.caption || "";
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(" ");
        const command = args[0].toLowerCase();

        if (!["join", "joinme", "f_join"].includes(command)) return;

        // Check if user is creator/owner
        const sender = m.key.participant || m.key.remoteJid;
        const isCreator = config.OWNER_NUMBER.includes(sender.split('@')[0]) || 
                         (config.OWNER_NUMBERS && config.OWNER_NUMBERS.includes(sender.split('@')[0]));
        
        if (!isCreator) return await Matrix.sendMessage(
            m.key.remoteJid,
            { 
                text: `
╭───「 *ACCESS DENIED* 」───╮
│ ★ʏᴏᴜ ᴅᴏɴ'ᴛ ʜᴀᴠᴇ ᴘᴇʀᴍɪꜱꜱɪᴏɴ ᴛᴏ ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ.
╰──────────────────╯
                `.trim(),
                contextInfo
            },
            { quoted: quotedContact }
        );

        let groupLink;
        const text = body.slice(prefix.length + command.length).trim();

        // Extract invite code from URL
        let inviteCode;
        if (text && isUrl(text)) {
            // Handle different URL formats
            const urlMatch = text.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/);
            if (urlMatch && urlMatch[1]) {
                inviteCode = urlMatch[1];
            } else {
                // If it's just the code without full URL
                inviteCode = text;
            }
        }

        if (!inviteCode) return await Matrix.sendMessage(
            m.key.remoteJid,
            { 
                text: `
╭───「 *ERROR* 」───╮
│  ★ɪɴᴠᴀʟɪᴅ ɢʀᴏᴜᴘ ʟɪɴᴋ.
│  ★ᴘʟᴇᴀꜱᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ᴡʜᴀᴛꜱᴀᴘᴘ ɢʀᴏᴜᴘ ʟɪɴᴋ.
╰──────────────╯
                `.trim(),
                contextInfo
            },
            { quoted: quotedContact }
        );

        // Clean the invite code (remove query parameters)
        inviteCode = inviteCode.split('?')[0];

        await Matrix.groupAcceptInvite(inviteCode);

        await Matrix.sendMessage(
            m.key.remoteJid,
            {
                text: `
╭───「 *SUCCESS* 」───╮
│ ★ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟʟʏ ᴊᴏɪɴᴇᴅ ᴛʜᴇ ɢʀᴏᴜᴘ!
╰───────────────╯
                `.trim(),
                contextInfo
            },
            { quoted: quotedContact }
        );

    } catch (e) {
        console.error("Join Error:", e);
        
        let errorMessage = "Failed to join the group.";
        if (e.message.includes("bad-request")) {
            errorMessage = "Invalid or expired group invite link.";
        } else if (e.message.includes("not-authorized")) {
            errorMessage = "I'm not authorized to join this group (possibly banned).";
        } else if (e.message.includes("invite-link-revoked")) {
            errorMessage = "This invite link has been revoked.";
        } else if (e.message.includes("invite-link-expired")) {
            errorMessage = "This invite link has expired.";
        }
        
        await Matrix.sendMessage(
            m.key.remoteJid,
            { 
                text: `
╭───「 *ERROR* 」───╮
│ ${errorMessage}
│ Reason: ${e.message}
╰──────────────╯
                `.trim(),
                contextInfo
            },
            { quoted: quotedContact }
        );
    }
};

export default join;
