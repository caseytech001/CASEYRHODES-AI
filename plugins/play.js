import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg;

function toFancyFont(text) {
  const fonts = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  return text
    .toLowerCase()
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
};

// MP3 song download
cmd({ 
    pattern: "song", 
    alias: ["ytdl3", "play"], 
    react: "🎶", 
    desc: "Download YouTube song", 
    category: "main", 
    use: '.song < Yt url or Name >', 
    filename: __filename 
}, async (conn, mek, m, { from, prefix, quoted, q, reply }) => { 
    try { 
        if (!q) return await reply("Please provide a YouTube URL or song name.");
        
        const yt = await ytSearch(q);
        if (yt.results.length < 1) return reply("No results found!");
        
        let yts = yt.results[0];  
        let apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(yts.url)}`;
        
        let response = await fetch(apiUrl);
        let data = await response.json();
        
        if (data.status !== 200 || !data.success || !data.result.downloadUrl) {
            return reply("Failed to fetch the audio. Please try again later.");
        }
        
        let ytmsg = `🎵 *Song Details*
🎶 *Title:* ${yts.title}
⏳ *Duration:* ${yts.timestamp}
👀 *Views:* ${yts.views}
👤 *Author:* ${yts.author.name}
🔗 *Link:* ${yts.url}

*Choose download format:*`;
        
        let contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter',
                newsletterName: 'CASEYRHODES-TECH',
                serverMessageId: 143
            }
        };
        
        // Create buttons
        const buttons = [
            {buttonId: 'mp3doc', buttonText: {displayText: '📄 MP3 Document'}, type: 1},
            {buttonId: 'mp3audio', buttonText: {displayText: '🎧 MP3 Audio'}, type: 1},
            {buttonId: 'mp3ptt', buttonText: {displayText: '🎙️ MP3 Voice Note'}, type: 1}
        ];
        
        const buttonMessage = {
            image: { url: yts.thumbnail },
            caption: ytmsg,
            footer: 'Select a format',
            buttons: buttons,
            headerType: 4,
            contextInfo: contextInfo
        };
        
        // Send message with buttons
        const songmsg = await conn.sendMessage(from, buttonMessage, { quoted: mek });
        
        // Handle button responses
        conn.ev.on("messages.upsert", async (msgUpdate) => {
            const mp3msg = msgUpdate.messages[0];
            
            // Check if this is a button response to our message
            if (mp3msg.message && mp3msg.message.buttonsResponseMessage && 
                mp3msg.message.buttonsResponseMessage.contextInfo &&
                mp3msg.message.buttonsResponseMessage.contextInfo.stanzaId === songmsg.key.id) {
                
                const selectedOption = mp3msg.message.buttonsResponseMessage.selectedButtonId;
                
                await conn.sendMessage(from, { react: { text: "⬇️", key: mp3msg.key } });
                
                switch (selectedOption) {
                    case 'mp3doc':   
                        await conn.sendMessage(from, { 
                            document: { url: data.result.downloadUrl }, 
                            mimetype: "audio/mpeg", 
                            fileName: `${yts.title}.mp3`, 
                            contextInfo 
                        }, { quoted: mp3msg });
                        break;
                        
                    case 'mp3audio':   
                        await conn.sendMessage(from, { 
                            audio: { url: data.result.downloadUrl }, 
                            mimetype: "audio/mpeg", 
                            contextInfo 
                        }, { quoted: mp3msg });
                        break;
                        
                    case 'mp3ptt':   
                        await conn.sendMessage(from, { 
                            audio: { url: data.result.downloadUrl }, 
                            mimetype: "audio/mpeg", 
                            ptt: true, 
                            contextInfo 
                        }, { quoted: mp3msg });
                        break;
                        
                    default:
                        await conn.sendMessage(
                            from,
                            {
                                text: "*Invalid selection. Please try again.*",
                            },
                            { quoted: mp3msg }
                        );
                }
            }
        });
           
    } catch (e) {
        console.log(e);
        reply("An error occurred. Please try again later.");
    }
});

export default play;
