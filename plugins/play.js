import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
import config from '../config.cjs';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

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

const userPreferences = {};

const play = async (message, client) => {
  try {
    const prefix = config.Prefix || config.PREFIX || '.';
    const body = message.body || '';
    const command = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = body.slice(prefix.length + command.length).trim().split(" ");
    
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
      const searchResults = await ytSearch(query);
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont('No tracks found for') + " \"" + query + "\"",
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      await sendCustomReaction(client, message, "🔍");
      
      const video = searchResults.videos[0];
      const fileName = video.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 100);
      const filePath = tmpDir + '/' + fileName + ".mp3";
      
      try {
        const apiUrl = "https://apis.davidcyriltech.my.id/play?query=" + encodeURIComponent(query);
        const apiResponse = await fetch(apiUrl);
        
        if (!apiResponse.ok) {
          throw new Error("API responded with status: " + apiResponse.status);
        }
        
        const apiData = await apiResponse.json();
        
        if (!apiData.status || !apiData.result?.download_url) {
          throw new Error("API response missing download URL or failed");
        }
        
        const videoId = extractYouTubeId(video.url) || video.videoId;
        const thumbnailUrl = getYouTubeThumbnail(videoId, 'maxresdefault');
        
        const minutes = Math.floor(video.duration.seconds / 60);
        const seconds = video.duration.seconds % 60;
        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const songInfo = `
 ━❍ *CASEYRHODES-AI*❍━
🎵 *Title:* ${video.title}
👤 *Artist:* ${video.author.name}
⏱️ *Duration:* ${formattedDuration}
📅 *Published:* ${video.ago}
👁️ *Views:* ${video.views.toLocaleString()}
📥 *Format:* MP3
        `.trim();
        
        // Added document button alongside audio button
        const formatButtons = [
          {
            buttonId: `${prefix}audio ${video.videoId}`,
            buttonText: { displayText: "🎵 Audio" },
            type: 1
          },
          {
            buttonId: `${prefix}document ${video.videoId}`,
            buttonText: { displayText: "📄 Document" },
            type: 1
          }
        ];
        
        let imageBuffer = null;
        try {
          const imageResponse = await fetch(thumbnailUrl);
          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
          }
        } catch (imageError) {
          console.error("Failed to download thumbnail:", imageError.message);
        }
        
        // Store user data for both audio and document options
        userPreferences[message.sender] = {
          downloadUrl: apiData.result.download_url,
          filePath: filePath,
          fileName: fileName,
          videoTitle: video.title,
          timestamp: Date.now()
        };
        
        // Start downloading audio in background while sending the info
        const downloadAudio = async () => {
          try {
            const audioResponse = await fetch(apiData.result.download_url);
            if (audioResponse.ok) {
              const fileStream = fs.createWriteStream(filePath);
              await streamPipeline(audioResponse.body, fileStream);
              await sendCustomReaction(client, message, "✅");
            }
          } catch (downloadError) {
            console.error("Background download failed:", downloadError.message);
          }
        };
        
        // Start background download
        downloadAudio();
        
        if (imageBuffer) {
          await client.sendMessage(message.from, {
            image: imageBuffer,
            caption: songInfo + "\n\n" + toFancyFont("Choose download format:"),
            buttons: formatButtons,
            headerType: 4,
            mentions: [message.sender]
          }, { quoted: message });
        } else {
          await client.sendMessage(message.from, {
            text: songInfo + "\n\n" + toFancyFont("Choose download format:"),
            buttons: formatButtons,
            headerType: 1,
            mentions: [message.sender]
          }, { quoted: message });
        }
        
        const now = Date.now();
        for (const [sender, data] of Object.entries(userPreferences)) {
          if (now - data.timestamp > 5 * 60 * 1000) {
            delete userPreferences[sender];
          }
        }
        
      } catch (apiError) {
        console.error("API error:", apiError.message);
        await sendCustomReaction(client, message, "❌");
        
        return await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("couldn't process your request. Please try again later"),
          mentions: [message.sender]
        }, { quoted: message });
      }
    }
    
    if (command === "audio") {
      const userData = userPreferences[message.sender];
      
      if (!userData || (Date.now() - userData.timestamp > 5 * 60 * 1000)) {
        if (userData) delete userPreferences[message.sender];
        
        return await client.sendMessage(message.from, {
          text: toFancyFont("Session expired. Please use the play command again."),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      await sendCustomReaction(client, message, "⬇️");
      
      try {
        if (fs.existsSync(userData.filePath)) {
          const audioData = fs.readFileSync(userData.filePath);
          
          await client.sendMessage(message.from, { 
            audio: audioData, 
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: userData.fileName + ".mp3"
          }, { quoted: message });
          
          await sendCustomReaction(client, message, "✅");
          
          setTimeout(() => {
            try {
              if (fs.existsSync(userData.filePath)) {
                fs.unlinkSync(userData.filePath);
              }
            } catch (cleanupError) {
              console.error("Error during file cleanup:", cleanupError);
            }
          }, 5000);
          
          delete userPreferences[message.sender];
        } else {
          const audioResponse = await fetch(userData.downloadUrl);
          
          if (!audioResponse.ok) {
            throw new Error("Failed to download audio: " + audioResponse.status);
          }
          
          const fileStream = fs.createWriteStream(userData.filePath);
          await streamPipeline(audioResponse.body, fileStream);
          
          const audioData = fs.readFileSync(userData.filePath);
          await client.sendMessage(message.from, { 
            audio: audioData, 
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: userData.fileName + ".mp3"
          }, { quoted: message });
          
          await sendCustomReaction(client, message, "✅");
          
          setTimeout(() => {
            try {
              if (fs.existsSync(userData.filePath)) {
                fs.unlinkSync(userData.filePath);
              }
            } catch (cleanupError) {
              console.error("Error during file cleanup:", cleanupError);
            }
          }, 5000);
          
          delete userPreferences[message.sender];
        }
        
      } catch (error) {
        console.error("Failed to process audio:", error.message);
        await sendCustomReaction(client, message, "❌");
        
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("failed to process audio file"),
          mentions: [message.sender]
        }, { quoted: message });
        
        if (userData && fs.existsSync(userData.filePath)) {
          try {
            fs.unlinkSync(userData.filePath);
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        }
        delete userPreferences[message.sender];
      }
    }
    
    if (command === "document") {
      const userData = userPreferences[message.sender];
      
      if (!userData || (Date.now() - userData.timestamp > 5 * 60 * 1000)) {
        if (userData) delete userPreferences[message.sender];
        
        return await client.sendMessage(message.from, {
          text: toFancyFont("Session expired. Please use the play command again."),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      await sendCustomReaction(client, message, "⬇️");
      
      try {
        let audioData;
        
        if (fs.existsSync(userData.filePath)) {
          audioData = fs.readFileSync(userData.filePath);
        } else {
          const audioResponse = await fetch(userData.downloadUrl);
          
          if (!audioResponse.ok) {
            throw new Error("Failed to download audio: " + audioResponse.status);
          }
          
          const fileStream = fs.createWriteStream(userData.filePath);
          await streamPipeline(audioResponse.body, fileStream);
          audioData = fs.readFileSync(userData.filePath);
        }
        
        // Send as document instead of audio
        await client.sendMessage(message.from, { 
          document: audioData, 
          mimetype: 'audio/mpeg',
          fileName: userData.fileName + ".mp3"
        }, { quoted: message });
        
        await sendCustomReaction(client, message, "✅");
        
        setTimeout(() => {
          try {
            if (fs.existsSync(userData.filePath)) {
              fs.unlinkSync(userData.filePath);
            }
          } catch (cleanupError) {
            console.error("Error during file cleanup:", cleanupError);
          }
        }, 5000);
        
        delete userPreferences[message.sender];
        
      } catch (error) {
        console.error("Failed to process document:", error.message);
        await sendCustomReaction(client, message, "❌");
        
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("failed to process document file"),
          mentions: [message.sender]
        }, { quoted: message });
        
        if (userData && fs.existsSync(userData.filePath)) {
          try {
            fs.unlinkSync(userData.filePath);
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        }
        delete userPreferences[message.sender];
      }
    }
  
  } catch (error) {
    console.error("❌ song error: " + error.message);
    await sendCustomReaction(client, message, "❌");
    
    await client.sendMessage(message.from, {
      text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("encountered an error. Please try again"),
      mentions: [message.sender]
    }, { quoted: message });
  }
};

export default play;
