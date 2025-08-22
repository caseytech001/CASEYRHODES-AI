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
        const buttons = [
          {
            buttonId: '.menu',
            buttonText: { displayText: '📃' + toFancyFont("Menu") },
            type: 1
          }
        ];
        
        const buttonMessage = {
          text: toFancyFont("give") + " " + toFancyFont('me') + " " + toFancyFont('a') + " " + 
                toFancyFont("song") + " " + toFancyFont("name") + " " + toFancyFont('or') + " " + 
                toFancyFont("keywords") + " " + toFancyFont('to') + " " + toFancyFont("search"),
          buttons: buttons,
          headerType: 1,
          viewOnce: true,
          mentions: [message.sender]
        };
        
        return await client.sendMessage(message.from, buttonMessage, { quoted: message });
      }
      
      const query = args.join(" ");
      
      await client.sendMessage(message.from, {
        text: "*ɴᴊᴀʙᴜʟᴏ ᴊʙ* " + toFancyFont("huntin'") + " " + toFancyFont("for") + " \"" + query + "\"",
        viewOnce: true
      }, { quoted: message });
      
      const searchResults = await ytSearch(query);
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        const buttons = [
          {
            buttonId: '.menu',
            buttonText: { displayText: '📃' + toFancyFont("Menu") },
            type: 1
          }
        ];
        
        const buttonMessage = {
          text: toFancyFont('no') + " " + toFancyFont("tracks") + " " + toFancyFont("found") + " " + 
                toFancyFont("for") + " \"" + query + "\". " + toFancyFont("you") + " " + 
                toFancyFont("slippin'") + '!',
          buttons: buttons,
          headerType: 1,
          viewOnce: true,
          mentions: [message.sender]
        };
        
        return await client.sendMessage(message.from, buttonMessage, { quoted: message });
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
        
        const songInfo = "\n\n" + toFancyFont("*Njbulo Jb*") + " Song Intel 🔥\n" + 
          toFancyFont("*Title*") + ": " + (apiData.result.title || video.title) + "\n" + 
          toFancyFont("*Views*") + ": " + video.views.toLocaleString() + "\n" + 
          toFancyFont("*Duration*") + ": " + video.timestamp + "\n" + 
          toFancyFont("*Channel*") + ": " + video.author.name + "\n" + 
          toFancyFont("*Uploaded*") + ": " + video.ago + "\n" + 
          toFancyFont("*URL*") + ": " + (apiData.result.video_url || video.url) + "\n";
        
        const buttons = [
          {
            buttonId: '.img ' + args.join(" "),
            buttonText: { displayText: "🖼️ " + toFancyFont("img") },
            type: 1
          },
          {
            buttonId: '.lyrics ' + args.join(" "),
            buttonText: { displayText: "📃 " + toFancyFont("Lyrics") },
            type: 1
          },
          {
            buttonId: '.yts ' + args.join(" "),
            buttonText: { displayText: "📃 " + toFancyFont("Yts") },
            type: 1
          },
          {
            buttonId: '.video ' + args.join(" "),
            buttonText: { displayText: "🎥 " + toFancyFont("video") },
            type: 1
          },
          {
            buttonId: '.song ' + args.join(" "),
            buttonText: { displayText: '🎧' + toFancyFont("get") + " " + toFancyFont("song") },
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
        
        const buttons = [
          {
            buttonId: '.support',
            buttonText: { displayText: '⚠︎' + toFancyFont("support") },
            type: 1
          }
        ];
        
        const buttonMessage = {
          text: "*Njabulo Jb* " + toFancyFont("couldn't") + " " + toFancyFont("hit") + " " + 
                toFancyFont("the") + " " + toFancyFont("api") + " " + toFancyFont("for") + " \"" + 
                video.title + "\". " + toFancyFont("server's") + " " + toFancyFont("actin'") + " " + 
                toFancyFont('up') + '!',
          buttons: buttons,
          headerType: 1,
          viewOnce: true,
          mentions: [message.sender]
        };
        
        return await client.sendMessage(message.from, buttonMessage, { quoted: message });
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
        
        const buttons = [
          {
            buttonId: '.support',
            buttonText: { displayText: '⚠︎' + toFancyFont("support") },
            type: 1
          }
        ];
        
        const buttonMessage = {
          text: "*ɴᴊᴀʙᴜʟᴏ ᴊʙ* " + toFancyFont("can't") + " " + toFancyFont("song") + " \"" + 
                video.title + "\". " + toFancyFont("failed") + " " + toFancyFont('to') + " " + 
                toFancyFont("send") + " " + toFancyFont("audio"),
          buttons: buttons,
          headerType: 1,
          viewOnce: true,
          mentions: [message.sender]
        };
        
        return await client.sendMessage(message.from, buttonMessage, { quoted: message });
      }
      
      const buttons = [
        {
          buttonId: '.menu',
          buttonText: { displayText: '📃' + toFancyFont("Menu") },
          type: 1
        }
      ];
      
      const buttonMessage = {
        text: '*' + video.title + "* " + toFancyFont("dropped") + " " + 
              toFancyFont('by') + " *Njabulo Jb*! " + toFancyFont("blast") + " " + toFancyFont('it') + '!',
        buttons: buttons,
        headerType: 1,
        viewOnce: true,
        mentions: [message.sender]
      };
      
      await client.sendMessage(message.from, buttonMessage, { quoted: message });
    }
  } catch (error) {
    console.error("❌ song error: " + error.message);
    
    const buttons = [
      {
        buttonId: '.support',
        buttonText: { displayText: '⚠︎' + toFancyFont("support") },
        type: 1
      }
    ];
    
    const buttonMessage = {
      text: "*ɴᴊᴀʙᴜʟᴏ ᴊʙ* " + toFancyFont("hit") + " " + toFancyFont('a') + " " + 
            toFancyFont("snag") + ", " + toFancyFont("fam") + "! " + toFancyFont("try") + " " + 
            toFancyFont("again") + " " + toFancyFont('or') + " " + toFancyFont("pick") + " " + 
            toFancyFont('a') + " " + toFancyFont("better") + " " + toFancyFont("track") + "! ",
      buttons: buttons,
      headerType: 1,
      viewOnce: true,
      mentions: [message.sender]
    };
    
    await client.sendMessage(message.from, buttonMessage, { quoted: message });
  }
};

export default play;
