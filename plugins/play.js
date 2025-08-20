import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
import config from "../config.cjs";
import pkg, { prepareWAMessageMedia } from "baileys-pro";
const { generateWAMessageFromContent, proto } = pkg;

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
}

const streamPipeline = promisify(pipeline);
const tmpDir = os.tmpdir();

const play = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const args = m.body.slice(prefix.length + cmd.length).trim().split(" ");
    const from = m.from;
    const reply = (text) => Matrix.sendMessage(from, { text }, { quoted: m });

    if (cmd === "play") {
      if (args.length === 0 || !args.join(" ")) {
        const buttonMessage = {
          text: "Please provide a song name or YouTube URL after the command.\nExample: .play shape of you",
          footer: "Music Player",
          headerType: 1
        };
        return await Matrix.sendMessage(from, buttonMessage, { quoted: m });
      }

      const q = args.join(" ");
      if (!q) return await reply("Please provide a YouTube URL or song name.");
      
      const yt = await ytSearch(q);
      if (yt.videos.length < 1) return reply("No results found!");
      
      let yts = yt.videos[0];  
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
      const songmsg = await Matrix.sendMessage(from, buttonMessage, { quoted: m });
      
      // Create a handler for button responses
      const buttonHandler = async (msgUpdate) => {
        try {
          const mp3msg = msgUpdate.messages[0];
          
          // Check if this is a button response to our message
          if (mp3msg && mp3msg.message && mp3msg.message.buttonsResponseMessage && 
              mp3msg.message.buttonsResponseMessage.contextInfo &&
              mp3msg.message.buttonsResponseMessage.contextInfo.stanzaId === songmsg.key.id) {
            
            const selectedOption = mp3msg.message.buttonsResponseMessage.selectedButtonId;
            
            await Matrix.sendMessage(from, { react: { text: "⬇️", key: mp3msg.key } });
            
            switch (selectedOption) {
                case 'mp3doc':   
                    await Matrix.sendMessage(from, { 
                        document: { url: data.result.downloadUrl }, 
                        mimetype: "audio/mpeg", 
                        fileName: `${yts.title.replace(/[^\w\s]/gi, '')}.mp3`, 
                        contextInfo 
                    }, { quoted: mp3msg });
                    break;
                    
                case 'mp3audio':   
                    await Matrix.sendMessage(from, { 
                        audio: { url: data.result.downloadUrl }, 
                        mimetype: "audio/mpeg", 
                        contextInfo 
                    }, { quoted: mp3msg });
                    break;
                    
                case 'mp3ptt':   
                    await Matrix.sendMessage(from, { 
                        audio: { url: data.result.downloadUrl }, 
                        mimetype: "audio/mpeg", 
                        ptt: true, 
                        contextInfo 
                    }, { quoted: mp3msg });
                    break;
                    
                default:
                    await Matrix.sendMessage(
                        from,
                        {
                            text: "*Invalid selection. Please try again.*",
                        },
                        { quoted: mp3msg }
                    );
            }
            
            // Remove the event listener after handling the response
            Matrix.ev.off("messages.upsert", buttonHandler);
          }
        } catch (error) {
          console.error("Error handling button response:", error);
        }
      };
      
      // Add the event listener for button responses
      Matrix.ev.on("messages.upsert", buttonHandler);
      
      // Set a timeout to remove the listener if no response is received
      setTimeout(() => {
        Matrix.ev.off("messages.upsert", buttonHandler);
      }, 60000); // Remove after 60 seconds
    }
  } catch (e) {
    console.log(e);
    const from = m.from;
    Matrix.sendMessage(from, { text: "An error occurred. Please try again later." }, { quoted: m });
  }
};

export default play;
