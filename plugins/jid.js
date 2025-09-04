import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import config from './config.cjs';

const jid = async (m, Matrix) => {
    try {
        const prefix = config.PREFIX || ".";
        const body = m.message?.conversation || 
                    m.message?.extendedTextMessage?.text || 
                    m.message?.imageMessage?.caption || "";
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(" ");
        const command = args[0].toLowerCase();

        if (!["jid"].includes(command)) return;

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
            mentionedJid: [m.key.participant || m.key.remoteJid],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363402973786789@newsletter',
                newsletterName: 'CASEYRHODES TECH',
                serverMessageId: 143
            }
        };

        // Check if it's a group
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        
        // Prepare the appropriate response
        const response = isGroup 
            ? `🔍 *★ɢʀᴏᴜᴘ ᴊɪᴅ*\n${m.key.remoteJid}`
            : `👤 *★ʏᴏᴜʀ ᴊɪᴅ*\n${m.key.participant || m.key.remoteJid}`;

        // Send the newsletter-style message
        await Matrix.sendMessage(
            m.key.remoteJid,
            {
                text: response,
                contextInfo: channelContext
            },
            { quoted: verifiedContact }
        );

    } catch (e) {
        console.error("JID Error:", e);
        await Matrix.sendMessage(
            m.key.remoteJid,
            { text: `❌ An error occurred: ${e.message}` },
            { quoted: m }
        );
    }
};

export default jid;
