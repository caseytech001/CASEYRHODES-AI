import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
import config from '../config.cjs';

function toFancyFont(text) {
  const fontMap = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 
    'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 
    'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 
    'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
  };
  
  return text.toLowerCase().split('').map(char => fontMap[char] || char).join('');
}

const streamPipeline = promisify(pipeline);
const tmpDir = os.tmpdir();

function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
  const qualities = {
    'default': 'default.jpg', 'mqdefault': 'mqdefault.jpg', 'hqdefault': 'hqdefault.jpg',
    'sddefault': 'sddefault.jpg', 'maxresdefault': 'maxresdefault.jpg'
  };
  
  return `https://i.ytimg.com/vi/${videoId}/${qualities[quality] || qualities['hqdefault']}`;
}

function extractYouTubeId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
}

async function sendCustomReaction(client, message, reaction) {
  try {
    const key = message.quoted ? message.quoted.key : message.key;
    await client.sendMessage(key.remoteJid, {
      react: { text: reaction, key: key }
    });
  } catch (error) {
    console.error("Error sending reaction:", error.message);
  }
}

// Store user preferences with better session management
const userSessions = new Map();

const play = async (message, client) => {
  try {
    const prefix = config.Prefix || config.PREFIX || '.';
    const body = message.body || '';
    const command = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = body.slice(prefix.length + command.length).trim().split(" ");
    
    // Clean up expired sessions (older than 10 minutes)
    const now = Date.now();
    for (const [sender, session] of userSessions.entries()) {
      if (now - session.timestamp > 10 * 60 * 1000) {
        userSessions.delete(sender);
        // Clean up file if exists
        if (session.filePath && fs.existsSync(session.filePath)) {
          try {
            fs.unlinkSync(session.filePath);
          } catch (e) {}
        }
      }
    }

    if (command === "play") {
      await sendCustomReaction(client, message, "⏳");
      
      if (args.length === 0 || !args.join(" ")) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont("Please provide a song name or keywords to search"),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const query = args.join(" ");
      
      // Search and download in parallel for faster response
      const [searchResults, apiResponse] = await Promise.all([
        ytSearch(query),
        fetch(`https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(query)}`)
      ]);
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont('No tracks found for') + " \"" + query + "\"",
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      if (!apiResponse.ok) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("API error. Please try again later"),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const apiData = await apiResponse.json();
      
      if (!apiData.status || !apiData.result?.download_url) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("No download URL available"),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const video = searchResults.videos[0];
      const fileName = `${video.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 50)}_${Date.now()}`;
      const filePath = `${tmpDir}/${fileName}.mp3`;
      
      const videoId = extractYouTubeId(video.url) || video.videoId;
      const thumbnailUrl = getYouTubeThumbnail(videoId, 'hqdefault');
      
      const minutes = Math.floor(video.duration.seconds / 60);
      const seconds = video.duration.seconds % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const songInfo = `
🎵 *Title:* ${video.title}
👤 *Artist:* ${video.author.name}
⏱️ *Duration:* ${formattedDuration}
📅 *Published:* ${video.ago}
👁️ *Views:* ${video.views.toLocaleString()}
      `.trim();
      
      // Store session data
      userSessions.set(message.sender, {
        downloadUrl: apiData.result.download_url,
        filePath: filePath,
        fileName: fileName,
        videoTitle: video.title,
        timestamp: Date.now()
      });
      
      // Start background download immediately
      const downloadPromise = (async () => {
        try {
          const audioResponse = await fetch(apiData.result.download_url);
          if (audioResponse.ok) {
            const fileStream = fs.createWriteStream(filePath);
            await streamPipeline(audioResponse.body, fileStream);
            console.log("✅ Background download completed for:", message.sender);
          }
        } catch (error) {
          console.error("❌ Background download failed:", error.message);
        }
      })();
      
      // Send quick response with buttons
      await client.sendMessage(message.from, {
        text: `*${toFancyFont('song found')}* 🎵\n\n${songInfo}\n\n${toFancyFont('choose download format:')}`,
        buttons: [
          {
            buttonId: `${prefix}audio`,
            buttonText: { displayText: "🎵 Audio" },
            type: 1
          },
          {
            buttonId: `${prefix}document`,
            buttonText: { displayText: "📄 Document" },
            type: 1
          }
        ],
        mentions: [message.sender]
      }, { quoted: message });
      
      await sendCustomReaction(client, message, "✅");
      
    } else if (command === "audio" || command === "document") {
      const session = userSessions.get(message.sender);
      
      if (!session || (Date.now() - session.timestamp > 10 * 60 * 1000)) {
        if (session) userSessions.delete(message.sender);
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont("Session expired. Please use the play command again."),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      await sendCustomReaction(client, message, "⬇️");
      
      try {
        // Check if file exists, if not download it
        if (!fs.existsSync(session.filePath)) {
          const audioResponse = await fetch(session.downloadUrl);
          if (!audioResponse.ok) throw new Error("Download failed");
          
          const fileStream = fs.createWriteStream(session.filePath);
          await streamPipeline(audioResponse.body, fileStream);
        }
        
        const audioData = fs.readFileSync(session.filePath);
        
        if (command === "audio") {
          await client.sendMessage(message.from, { 
            audio: audioData, 
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: session.fileName + ".mp3"
          }, { quoted: message });
        } else {
          await client.sendMessage(message.from, { 
            document: audioData, 
            mimetype: 'audio/mpeg',
            fileName: session.fileName + ".mp3"
          }, { quoted: message });
        }
        
        await sendCustomReaction(client, message, "✅");
        
        // Clean up file after 30 seconds
        setTimeout(() => {
          try {
            if (fs.existsSync(session.filePath)) {
              fs.unlinkSync(session.filePath);
            }
          } catch (e) {}
        }, 30000);
        
      } catch (error) {
        console.error("Failed to process:", command, error.message);
        await sendCustomReaction(client, message, "❌");
        
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont(`failed to process ${command} file`),
          mentions: [message.sender]
        }, { quoted: message });
        
        // Clean up on error
        try {
          if (fs.existsSync(session.filePath)) {
            fs.unlinkSync(session.filePath);
          }
        } catch (e) {}
        userSessions.delete(message.sender);
      }
    }
  
  } catch (error) {
    console.error("❌ Main error:", error.message);
    await sendCustomReaction(client, message, "❌");
    
    await client.sendMessage(message.from, {
      text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("encountered an error. Please try again"),
      mentions: [message.sender]
    }, { quoted: message });
  }
};

export default play;
