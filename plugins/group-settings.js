import config from '../config.cjs';
import { getBuffer } from '../lib/myfunc.cjs';
import fs from 'fs';
import path from 'path';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

// Verified contact for quoted message
const quotedContact = {
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

// Channel forwarding context
const channelContext = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363402973786789@newsletter',
        newsletterName: 'caseyrhodes Ai',
        serverMessageId: 143
    }
};

// Function to get random image from assets folder
const getRandomImage = () => {
    const imageDir = path.join(process.cwd(), "assets");
    let randomImage = null;
    
    if (fs.existsSync(imageDir)) {
        const images = fs.readdirSync(imageDir)
            .filter(file => file.match(/\.(jpg|png|jpeg|webp)$/i));
        
        if (images.length > 0) {
            const chosen = images[Math.floor(Math.random() * images.length)];
            randomImage = path.join(imageDir, chosen);
            return randomImage;
        }
    }
    
    // Fallback to default images if no images found in assets folder
    return null;
};

const mute = async (m, Matrix) => {
    try {
        const prefix = config.PREFIX || ".";
        const body = m.message?.conversation || 
                    m.message?.extendedTextMessage?.text || 
                    m.message?.imageMessage?.caption || "";
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(" ");
        const command = args[0].toLowerCase();

        if (!["mute", "close", "lock", "mutes"].includes(command)) return;

        // Check if the command is used in a group
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if (!isGroup) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "This command can only be used in groups!" },
            { quoted: quotedContact }
        );

        // Get group metadata to check admin status
        const groupMetadata = await Matrix.groupMetadata(m.key.remoteJid);
        const participants = groupMetadata.participants;
        
        // Get sender JID
        const sender = m.key.participant || m.key.remoteJid;
        
        // Check if the user is an admin
        const senderParticipant = participants.find(p => p.jid === sender);
        const isAdmins = senderParticipant && senderParticipant.admin === 'admin';
        
        // Check if user is dev/owner
        const isDev = config.OWNER_NUMBER.includes(sender.split('@')[0]) || 
                     (config.OWNER_NUMBERS && config.OWNER_NUMBERS.includes(sender.split('@')[0]));
        
        if (!isAdmins && !isDev) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "You need to be an admin to use this command!" },
            { quoted: quotedContact }
        );

        // Check if the bot is an admin
        const botJid = Matrix.user.id.includes(':') 
            ? Matrix.user.id.split(':')[0] + '@s.whatsapp.net' 
            : Matrix.user.id;
            
        const botParticipant = participants.find(p => p.jid === botJid);
        const isBotAdmins = botParticipant && botParticipant.admin === 'admin';
        
        if (!isBotAdmins) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "The bot needs admin privileges to perform this action!" },
            { quoted: quotedContact }
        );

        // Mute the group
        await Matrix.groupSettingUpdate(m.key.remoteJid, 'announcement');

        // Get random image from assets folder or use default
        const randomImage = getRandomImage();
        const imageContent = randomImage 
            ? { url: randomImage }
            : { url: 'https://i.ibb.co/fGSVG8vJ/caseyweb.jpg' };

        // Get pushname from sender
        const pushname = m.pushName || "User";

        // Send message with image
        await Matrix.sendMessage(
            m.key.remoteJid,
            {
                image: imageContent,
                caption: `*🔇 GROUP MUTED*\n\n• Action by: @${sender.split('@')[0]}\n• Admin: ${pushname}\n\nOnly admins can now send messages.`,
                mentions: [sender],
                contextInfo: channelContext
            },
            { quoted: quotedContact }
        );

    } catch (error) {
        console.error('Mute Error:', error);
        await Matrix.sendMessage(
            m.key.remoteJid,
            { text: `❌ Error: ${error.message}` },
            { quoted: quotedContact }
        );
    }
};

const unmute = async (m, Matrix) => {
    try {
        const prefix = config.PREFIX || ".";
        const body = m.message?.conversation || 
                    m.message?.extendedTextMessage?.text || 
                    m.message?.imageMessage?.caption || "";
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(" ");
        const command = args[0].toLowerCase();

        if (!["unmute", "open", "unlock", "groupopen"].includes(command)) return;

        // Check if the command is used in a group
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if (!isGroup) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "This command can only be used in groups!" },
            { quoted: quotedContact }
        );

        // Get group metadata to check admin status
        const groupMetadata = await Matrix.groupMetadata(m.key.remoteJid);
        const participants = groupMetadata.participants;
        
        // Get sender JID
        const sender = m.key.participant || m.key.remoteJid;
        
        // Check if the user is an admin
        const senderParticipant = participants.find(p => p.jid === sender);
        const isAdmins = senderParticipant && senderParticipant.admin === 'admin';
        
        // Check if user is dev/owner
        const isDev = config.OWNER_NUMBER.includes(sender.split('@')[0]) || 
                     (config.OWNER_NUMBERS && config.OWNER_NUMBERS.includes(sender.split('@')[0]));
        
        if (!isAdmins && !isDev) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "You need to be an admin to use this command!" },
            { quoted: quotedContact }
        );

        // Check if the bot is an admin
        const botJid = Matrix.user.id.includes(':') 
            ? Matrix.user.id.split(':')[0] + '@s.whatsapp.net' 
            : Matrix.user.id;
            
        const botParticipant = participants.find(p => p.jid === botJid);
        const isBotAdmins = botParticipant && botParticipant.admin === 'admin';
        
        if (!isBotAdmins) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "The bot needs admin privileges to perform this action!" },
            { quoted: quotedContact }
        );

        // Unmute the group
        await Matrix.groupSettingUpdate(m.key.remoteJid, "not_announcement");

        // Get random image from assets folder or use default
        const randomImage = getRandomImage();
        const imageContent = randomImage 
            ? { url: randomImage }
            : { url: 'https://i.ibb.co/fGSVG8vJ/caseyweb.jpg' };

        // Get pushname from sender
        const pushname = m.pushName || "User";

        // Send message with image
        await Matrix.sendMessage(
            m.key.remoteJid,
            {
                image: imageContent,
                caption: `*🔊 GROUP UNMUTED*\n\n• Action by: @${sender.split('@')[0]}\n• Admin: ${pushname}\n\nAll members can now send messages.`,
                mentions: [sender],
                contextInfo: channelContext
            },
            { quoted: quotedContact }
        );

    } catch (error) {
        console.error('Unmute Error:', error);
        await Matrix.sendMessage(
            m.key.remoteJid,
            { text: `❌ Error: ${error.message}` },
            { quoted: quotedContact }
        );
    }
};

export { mute, unmute };
