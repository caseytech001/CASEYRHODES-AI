import fs from 'fs';
import process from 'process';
import config from '../config.cjs';
import moment from 'moment';

// Helper function for tiny caps text
const toTinyCap = (text) =>
    text.split("").map(char => {
        const tiny = {
            a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ',
            h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ',
            o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ',
            v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
        };
        return tiny[char.toLowerCase()] || char;
    }).join("");

// Runtime formatter function
const runtime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${secs}s`;
    
    return timeString;
};

const alive = async (m, Matrix) => {
    try {
        const uptimeSeconds = process.uptime();
        const uptime = runtime(uptimeSeconds);
        
        const now = moment();
        const currentTime = now.format("HH:mm:ss");
        const currentDate = now.format("dddd, MMMM Do YYYY");
        const pushname = m.pushName || "User";
        const prefix = config.PREFIX || '!'; // Default prefix if not in config

        // Check if it's a button response
        const isButtonResponse = m.message?.buttonsResponseMessage;
        
        if (isButtonResponse) {
            const selectedButtonId = m.message.buttonsResponseMessage.selectedButtonId;
            
            if (selectedButtonId === `${prefix}menu`) {
                // Menu button clicked - send menu command
                // You might need to import or call your menu function here
                await Matrix.sendMessage(m.from, { 
                    text: '📋 Opening menu...' 
                }, { quoted: m });
                return;
            } else if (selectedButtonId === `${prefix}repo`) {
                // Repository button clicked
                await Matrix.sendMessage(m.from, { 
                    text: '📁 Repository: https://github.com/your-username/your-repo' 
                }, { quoted: m });
                return;
            }
        }
        
        // Regular command handling
        const body = m.body || '';
        const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

        if (!cmd || !['alive', 'uptime', 'runtime', 'status'].includes(cmd)) return;

        const msg = `
╭──❖ 「 *${toTinyCap("Bot Status")}* 」 ❖─
│ 👤 ʜɪ: *${pushname}*
│ 🕓 ᴛɪᴍᴇ: *${currentTime}*
│ 📆 ᴅᴀᴛᴇ: *${currentDate}*
│ 🧭 ᴜᴘᴛɪᴍᴇ: *${uptime}*
│ ⚙️ ᴍᴏᴅᴇ: *${config.MODE || 'default'}*
│ 🔰 ᴠᴇʀsɪᴏɴ: *${config.version || '1.0.0'}*
╰─────────❖
        `.trim();

        const buttons = [
            {
                buttonId: `${prefix}repo`,
                buttonText: { displayText: `📁 ${prefix}repo` },
                type: 1
            },
            {
                buttonId: `${prefix}menu`,
                buttonText: { displayText: `📋 ${prefix}menu` },
                type: 1
            }
        ];

        // Check if image file exists
        let imageBuffer;
        try {
            imageBuffer = fs.readFileSync('./media/Casey.jpg');
        } catch (error) {
            console.log('Image file not found, sending text message only');
        }

        const buttonMessage = {
            caption: msg,
            footer: 'Choose an option',
            buttons: buttons,
            headerType: 4,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363302677217436@newsletter',
                    newsletterName: 'POWERED BY CASEYRHODES TECH',
                    serverMessageId: -1
                }
            }
        };

        // Add image only if it exists
        if (imageBuffer) {
            buttonMessage.image = imageBuffer;
        } else {
            buttonMessage.text = msg;
            // Remove caption when there's no image
            delete buttonMessage.caption;
        }

        await Matrix.sendMessage(m.from, buttonMessage, {
            quoted: m
        });
    } catch (error) {
        console.error('Error in alive command:', error);
        await Matrix.sendMessage(m.from, { 
            text: '❌ An error occurred while processing your request.' 
        }, { quoted: m });
    }
};

export default alive;
