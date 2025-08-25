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
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ',
    'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ',
    'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x',
    'y': 'ʏ', 'z': 'ᴢ', ' ': ' ', '-': '-', ':': ':', '(': '(', ')': ')'
  };
  
  return text.toLowerCase().split('').map(char => fontMap[char] || char).join('');
}

const streamPipeline = promisify(pipeline);
const tmpDir = os.tmpdir();

// Cache for API responses to improve performance
const searchCache = new Map();
const CACHE_DURATION = 300000; // 5 minutes

function getYouTubeThumbnail(videoId, quality = 'maxresdefault') {
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

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function sendCustomReaction(client, message, reaction) {
  try {
    const key = message.quoted ? message.quoted.key : message.key;
    await client.sendMessage(key.remoteJid, {
      react: { text: reaction, key: key }
    });
  } catch (error) {
    console.error("Reaction error:", error.message);
  }
}

const play = async (message, client) => {
  try {
    const prefix = config.Prefix || config.PREFIX || '.';
    const body = message.body || '';
    const command = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = body.slice(prefix.length + command.length).trim().split(" ");
    
    if (command !== "play") return;
    
    await sendCustomReaction(client, message, "⏳");
    
    if (!args.length || !args.join(" ").trim()) {
      await sendCustomReaction(client, message, "❌");
      return await client.sendMessage(message.from, {
        text: toFancyFont("Please provide a song name or keywords to search"),
        viewOnce: true,
        mentions: [message.sender]
      }, { quoted: message });
    }
    
    const query = args.join(" ").trim();
    const cacheKey = `search_${query}`;
    
    // Check cache first
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        await processVideo(cached.video, client, message, query);
        return;
      }
    }
    
    await sendCustomReaction(client, message, "🔍");
    
    const searchResults = await ytSearch(query);
    
    if (!searchResults.videos?.length) {
      await sendCustomReaction(client, message, "❌");
      return await client.sendMessage(message.from, {
        text: toFancyFont('No tracks found for') + " \"" + query + "\"",
        viewOnce: true,
        mentions: [message.sender]
      }, { quoted: message });
    }
    
    const video = searchResults.videos[0];
    // Cache the result
    searchCache.set(cacheKey, { video, timestamp: Date.now() });
    
    await processVideo(video, client, message, query);
    
  } catch (error) {
    console.error("❌ Play command error:", error.message);
    await sendCustomReaction(client, message, "❌");
    await client.sendMessage(message.from, {
      text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("encountered an error. Please try again"),
      viewOnce: true,
      mentions: [message.sender]
    }, { quoted: message });
  }
};

async function processVideo(video, client, message, query) {
  const prefix = config.Prefix || config.PREFIX || '.';
  const fileName = video.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 100);
  const filePath = tmpDir + '/' + fileName + ".mp3";
  
  try {
    const apiUrl = "https://apis.davidcyriltech.my.id/play?query=" + encodeURIComponent(query);
    const apiResponse = await fetch(apiUrl, { 
      timeout: 10000,
      headers: { 'User-Agent': 'CaseyRhodes-AI-Bot/1.0' }
    });
    
    if (!apiResponse.ok) throw new Error(`API status: ${apiResponse.status}`);
    
    const apiData = await apiResponse.json();
    if (!apiData.status || !apiData.result?.download_url) throw new Error("Invalid API response");
    
    const videoId = extractYouTubeId(video.url) || video.videoId;
    const thumbnailUrl = getYouTubeThumbnail(videoId, 'maxresdefault');
    
    // Enhanced song information
    const songInfo = `
┏━━━━━━━━━━━━━━━━━━━━┓
┃   🎵 *CASEYRHODES-AI* 🎵   ┃
┗━━━━━━━━━━━━━━━━━━━━┛

📌 *Title:* ${video.title}

👤 *Artist/Channel:* ${video.author.name}
⏱️ *Duration:* ${formatDuration(video.duration.seconds)}
📅 *Uploaded:* ${video.ago}
👁️ *Views:* ${formatNumber(video.views)}
📊 *Engagement:* ${formatNumber(video.views)} views
🔗 *URL:* ${video.url}
🎵 *Format:* High Quality MP3
💿 *Bitrate:* 128kbps (approx)
📁 *File Size:* ~${Math.round(video.duration.seconds * 0.016)}MB

⭐ *Features:*
• High Quality Audio
• Fast Download
• Metadata Included
• Quick Search

🔧 *Powered by CaseyRhodes Tech*
💡 *Need help?* Type ${prefix}help

> 🎶 Enjoy your music! 🎶
    `.trim();
    
    const buttons = [
      {
        buttonId: prefix + 'menu',
        buttonText: { displayText: "📋 Menu" },
        type: 1
      },
      {
        buttonId: prefix + 'join',
        buttonText: { displayText: "📢 Join Channel" },
        type: 1
      },
      {
        buttonId: prefix + 'help',
        buttonText: { displayText: "❓ Help" },
        type: 1
      }
    ];
    
    let imageBuffer = null;
    try {
      const imageResponse = await fetch(thumbnailUrl, { timeout: 5000 });
      if (imageResponse.ok) {
        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      }
    } catch (imageError) {
      console.log("Thumbnail fetch skipped:", imageError.message);
    }
    
    // Send song info immediately
    if (imageBuffer) {
      await client.sendMessage(message.from, {
        image: imageBuffer,
        caption: songInfo,
        buttons: buttons,
        headerType: 4,
        viewOnce: true,
        mentions: [message.sender]
      }, { quoted: message });
    } else {
      await client.sendMessage(message.from, {
        text: songInfo,
        buttons: buttons,
        headerType: 1,
        viewOnce: true,
        mentions: [message.sender]
      }, { quoted: message });
    }
    
    await sendCustomReaction(client, message, "⬇️");
    
    // Download audio in background
    setTimeout(async () => {
      try {
        const audioResponse = await fetch(apiData.result.download_url, { timeout: 15000 });
        if (!audioResponse.ok) throw new Error("Audio download failed");
        
        const fileStream = fs.createWriteStream(filePath);
        await streamPipeline(audioResponse.body, fileStream);
        
        const audioData = fs.readFileSync(filePath);
        await sendCustomReaction(client, message, "✅");
        
        await client.sendMessage(message.from, { 
          audio: audioData, 
          mimetype: 'audio/mpeg',
          ptt: false,
          fileName: fileName + ".mp3"
        }, { quoted: message });
        
        // Cleanup
        setTimeout(() => {
          try { fs.existsSync(filePath) && fs.unlinkSync(filePath); } 
          catch (e) { console.log("Cleanup error:", e.message); }
        }, 3000);
        
      } catch (downloadError) {
        console.error("Download error:", downloadError.message);
        await sendCustomReaction(client, message, "❌");
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("download failed. Try again later"),
          viewOnce: true
        }, { quoted: message });
      }
    }, 1000);
    
  } catch (apiError) {
    console.error("API error:", apiError.message);
    await sendCustomReaction(client, message, "❌");
    await client.sendMessage(message.from, {
      text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("service temporarily unavailable"),
      viewOnce: true,
      mentions: [message.sender]
    }, { quoted: message });
  }
}

export default play;
