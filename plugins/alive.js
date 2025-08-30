import fs from 'fs';
import process from 'process';
import config from '../config.cjs';
import moment from 'moment';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';
import proto from '@whiskeysockets/baileys/lib/WAProto/index.js';

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

        const uptimeMessage = `
╭──❖ 「 *${toTinyCap("Bot Status")}* 」 ❖─
│ 👤 ʜɪ: *${pushname}*
│ 🕓 ᴛɪᴍᴇ: *${currentTime}*
│ 📆 ᴅᴀᴛᴇ: *${currentDate}*
│ 🧭 ᴜᴘᴛɪᴍᴇ: *${uptime}*
│ ⚙️ ᴍᴏᴅᴇ: *${config.MODE || 'default'}*
│ 🔰 ᴠᴇʀsɪᴏɴ: *${config.version || '1.0.0'}*
╰─────────❖
      `;

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
                    display_text: "Copy",
                    id: "copy_code",
                    copy_code: uptimeMessage
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

        const msg = generateWAMessageFromContent(m.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: uptimeMessage
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: "© Powered By Njabulo Jb"
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: "",
                            gifPlayback: true,
                            subtitle: "",
                            hasMediaAttachment: false 
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons
                        }),
                        contextInfo: {
                            mentionedJid: [m.sender], 
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363399999197102@newsletter',
                                newsletterName: "╭••➤®Njabulo Jb",
                                serverMessageId: 143
                            }
                        }
                    })
                }
            }
        }, {});

        await Matrix.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id
        });
    } catch (error) {
        console.error('Error in alive command:', error);
        await Matrix.sendMessage(m.from, { 
            text: '❌ An error occurred while processing your request.' 
        }, { quoted: m });
    }
};

export default alive;
