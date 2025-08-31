import fs from 'fs';
import process from 'process';
import config from '../config.cjs';
import moment from 'moment';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { proto } from '@whiskeysockets/baileys';

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
            // Handle button response if needed
            return;
        }
        
        // Regular command handling
        const body = m.body || '';
        const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

        if (!cmd || !['alive', 'uptime', 'runtime', 'status'].includes(cmd)) return;

        const uptimeMessage = `
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
                "name": "quick_reply",
                "buttonParamsJson": JSON.stringify({
                    display_text: "MENU",
                    id: `.menu`
                })
            },
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: "Copy Uptime",
                    id: "copy_code",
                    copy_code: uptime
                })
            },
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "Follow our Channel",
                    url: `https://whatsapp.com/channel/0029VagJlnG6xCSU2tS1Vz19`
                })
            },
            {
                "name": "quick_reply",
                "buttonParamsJson": JSON.stringify({
                    display_text: "PING",
                    id: `.ping`
                })
            }
        ];

        const interactiveMessage = {
            body: {
                text: uptimeMessage
            },
            footer: {
                text: "© Powered By Njabulo Jb"
            },
            header: {
                title: "Bot Status",
                subtitle: "Current bot information",
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: buttons
            }
        };

        const message = generateWAMessageFromContent(m.from, {
            interactive: interactiveMessage
        }, { quoted: m });

        await Matrix.relayMessage(m.from, message.message, { messageId: message.key.id });

    } catch (error) {
        console.error('Error in alive command:', error);
        await Matrix.sendMessage(m.from, { 
            text: '❌ An error occurred while processing your request.' 
        }, { quoted: m });
    }
};

export default alive;
