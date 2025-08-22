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
    'a': 'ᴀ',
    'b': 'ʙ',
    'c': 'ᴄ',
    'd': 'ᴅ',
    'e': 'ᴇ',
    'f': 'ғ',
    'g': 'ɢ',
    'h': 'ʜ',
    'i': 'ɪ',
    'j': 'ᴊ',
    'k': 'ᴋ',
    'l': 'ʟ',
    'm': 'ᴍ',
    'n': 'ɴ',
    'o': 'ᴏ',
    'p': 'ᴘ',
    'q': 'ǫ',
    'r': 'ʀ',
    's': 's',
    't': 'ᴛ',
    'u': 'ᴜ',
    'v': 'ᴠ',
    'w': 'ᴡ',
    'x': 'x',
    'y': 'ʏ',
    'z': 'ᴢ'
  };
  
  return text.toLowerCase().split('').map(char => fontMap[char] || char).join('');
}

const streamPipeline = promisify(pipeline);
const tmpDir = os.tmpdir();

const play = async (message, client) => {
  try {
    const prefix = config.Prefix || config.PREFIX || '.';
    const command = message.body?.startsWith(prefix) ? message.body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = message.body.slice(prefix.length + command.length).trim().split(" ");
    
    if (command === "play") {
      if (args.length === 0 || !args.join(" ")) {
        return await client.sendMessage(message.from, {
          text: toFancyFont("Please provide a song name or keywords to search"),
          viewOnce: true,
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const query = args.join(" ");
      
      await client.sendMessage(message.from, {
        text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("searching for") + " \"" + query + "\"",
        viewOnce: true
      }, { quoted: message });
      
      const searchResults = await ytSearch(query);
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return await client.sendMessage(message.from, {
          text: toFancyFont('No tracks found for') + " \"" + query + "\"",
          viewOnce: true,
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const video = searchResults.videos[0];
      const fileName = video.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 100);
      const filePath = tmpDir + '/' + fileName + ".mp3";
      
      let apiResponse;
      
      try {
        const apiUrl = "https://apis.davidcyriltech.my.id/play?query=" + encodeURIComponent(query);
        apiResponse = await fetch(apiUrl);
        
        if (!apiResponse.ok) {
          throw new Error("API responded with status: " + apiResponse.status);
        }
        
        const apiData = await apiResponse.json();
        
        if (!apiData.status || !apiData.result.download_url) {
          throw new Error("API response missing download URL or failed");
        }
        
        // Create the song info display similar to the image
        const songInfo = `*𝐂𝐀𝐒𝐄𝐘𝐑𝐇𝐎𝐃𝐄𝐒 𝐌𝐔𝐒𝐈𝐂🎵🎶*
        *${video.title.toUpperCase()}*\n\n` +
          `*Title:* ${apiData.result.title || video.title}\n` +
          `*Author:* ${video.author.name}\n` +
          `*Duration:* ${video.timestamp}\n` +
          `*Views:* ${video.views.toLocaleString()}\n` +
          `*Published:* ${video.ago}\n\n` +
          `*Powered By Mr ᴄᴀsᴇʏʀʜᴏᴅᴇs*\n` +
          `> *ɢᴇɴᴇʀᴀᴛᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ*\n` +
          `${video.duration.toString().padStart(2, '0')}:${(video.duration % 60).toString().padStart(2, '0')}`;
        
        // Create buttons matching the image design
        const buttons = [
          {
            buttonId: '.audio ' + args.join(" "),
            buttonText: { displayText: "🎵 Audio (Play)" },
            type: 1
          },
          {
            buttonId: '.document ' + args.join(" "),
            buttonText: { displayText: "📄 Document (Save)" },
            type: 1
          }
        ];
        
        const buttonMessage = {
          text: songInfo,
          buttons: buttons,
          headerType: 1,
          viewOnce: true,
          mentions: [message.sender]
        };
        
        await client.sendMessage(message.from, buttonMessage, { quoted: message });
        
        const audioResponse = await fetch(apiData.result.download_url);
        
        if (!audioResponse.ok) {
          throw new Error("Failed to download audio: " + audioResponse.status);
        }
        
        const fileStream = fs.createWriteStream(filePath);
        await streamPipeline(audioResponse.body, fileStream);
        
      } catch (apiError) {
        console.error("API error:", apiError.message);
        
        return await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("couldn't process your request. Please try again later"),
          viewOnce: true,
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      try {
        // Send audio file
        const audioData = fs.readFileSync(filePath);
        await client.sendMessage(message.from, { 
          audio: audioData, 
          mimetype: 'audio/mpeg',
          ptt: false,
          fileName: fileName + ".mp3"
        }, { quoted: message });
        
        // Clean up temp file
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log("Deleted temp file: " + filePath);
            }
          } catch (cleanupError) {
            console.error("Error during file cleanup:", cleanupError);
          }
        }, 5000);
        
      } catch (sendError) {
        console.error("Failed to send audio:", sendError.message);
        
        return await client.sendMessage(message.from, {
          text: "*caseytech* " + toFancyFont("failed to send audio file"),
          viewOnce: true,
          mentions: [message.sender]
        }, { quoted: message });
      }
    }
  } catch (error) {
    console.error("❌ song error: " + error.message);
    
    await client.sendMessage(message.from, {
      text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("encountered an error. Please try again"),
      viewOnce: true,
      mentions: [message.sender]
    }, { quoted: message });
  }
};

export default play;
