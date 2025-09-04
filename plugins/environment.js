import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import config from '../config.cjs';

const isEnabled = (value) => {
    // Function to check if a value represents a "true" boolean state
    return value && value.toString().toLowerCase() === "true";
};

const env = async (m, Matrix) => {
    try {
        const prefix = config.Prefix || config.PREFIX || ".";
        const cmd = m.body?.startsWith(prefix)
            ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
            : "";

        if (!["env", "settings", "setting", "allvar"].includes(cmd)) return;

        await Matrix.sendMessage(m.from, { react: { text: "⤵️", key: m.key } });

        // Define the settings message with the correct boolean checks
        let envSettings = `
 ╭〔 *【ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ】* 〕⊷
┃▸╭───────────
┃▸┃๏ *ᴇɴᴠ ꜱᴇᴛᴛɪɴɢꜱ*
┃▸└───────────···๏
╰────────────┈⊷
╭━━〔 *ᴇɴᴀʙʟᴇᴅ / ᴅɪꜱᴀʙʟᴇᴅ* 〕━━┈⊷
┇๏ *ᴀᴜᴛᴏ ꜱᴛᴀᴛᴜꜱ:* ${isEnabled(config.AUTO_STATUS_SEEN) ? "Enabled✅" : "Disabled❌"}
┇๏ *ᴀᴜᴛᴏ ꜱᴛᴀᴛᴜꜱ:* ${isEnabled(config.AUTO_STATUS_REPLY) ? "Enabled✅" : "Disabled❌"}
┇๏ *ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ:* ${isEnabled(config.AUTO_REACT) ? "Enabled✅" : "Disabled❌"}
┇๏ *ᴀᴜᴛᴏ ᴛʏᴘɪɴɢ:* ${isEnabled(config.AUTO_TYPING) ? "Enabled✅" : "Disabled❌"}
┇๏ *ᴀᴜᴛᴏ ʀᴇᴄᴏʀᴅɪɴɢ:* ${isEnabled(config.AUTO_RECORDING) ? "Enabled✅" : "Disabled❌"}
┇๏ *ᴀʟᴡᴀʏꜱ ᴏɴʟɪɴᴇ:* ${isEnabled(config.ALWAYS_ONLINE) ? "Enabled✅" : "Disabled❌"}
┇๏ *ᴘᴜʙʟɪᴄ ᴍᴏᴅᴇ:* ${isEnabled(config.PUBLIC_MODE) ? "Enabled✅" : "Disabled❌"}
┇๏ *ʀᴇᴀᴅ ᴍᴇꜱꜱᴀɢᴇ:* ${isEnabled(config.READ_MESSAGE) ? "Enabled✅" : "Disabled❌"}
╰━━━━━━━━━━━━──┈⊷
> ᴍᴀᴅᴇ ʙʏ Caseyrhodes AI
> ${config.DESCRIPTION}`;

        const __dirname = new URL('.', import.meta.url).pathname;

        // Pick random image from src/
        const imageDir = join(__dirname, "../src");
        let randomImage = null;
        if (existsSync(imageDir)) {
            const images = readdirSync(imageDir).filter(file => file.match(/\.(jpg|png|webp)$/i));
            if (images.length > 0) {
                const chosen = images[Math.floor(Math.random() * images.length)];
                randomImage = join(imageDir, chosen);
            }
        }

        // Verified contact (quoted base)
        const verifiedContact = {
            key: {
                fromMe: false,
                participant: `0@s.whatsapp.net`,
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: "Caseyrhodes AI",
                    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
                }
            }
        };

        // Channel forwarding context (reusable)
        const channelContext = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363402973786789@newsletter',
                newsletterName: 'Caseyrhodes AI',
                serverMessageId: 143
            }
        };

        if (randomImage) {
            // Send image + caption with channel context
            await Matrix.sendMessage(m.from, { 
                image: readFileSync(randomImage),
                caption: envSettings,
                contextInfo: channelContext
            }, { quoted: verifiedContact });
        } else {
            await Matrix.sendMessage(m.from, { 
                text: envSettings,
                contextInfo: channelContext
            }, { quoted: verifiedContact });
        }

    } catch (error) {
        console.log(error);
        await Matrix.sendMessage(m.from, { text: `Error: ${error.message}` }, { quoted: m });
    }
};

export default env;
