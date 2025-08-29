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

// Kaiz-API configuration
const KAIZ_API_KEY = 'cf2ca612-296f-45ba-abbc-473f18f991eb';
const KAIZ_API_URL = 'https://kaiz-apis.gleeze.com/api/ytdown-mp3';

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

// Utility function to fetch video info
async function fetchVideoInfo(text) {
  const isYtUrl = text.match(/(youtube\.com|youtu\.be)/i);
  
  if (isYtUrl) {
    const videoId = text.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) throw new Error('Invalid YouTube URL format');
    
    const videoInfo = await ytSearch({ videoId });
    if (!videoInfo) throw new Error('Could not fetch video info');
    
    return { url: `https://youtu.be/${videoId}`, info: videoInfo };
  } else {
    const searchResults = await ytSearch(text);
    if (!searchResults?.videos?.length) throw new Error('No results found');
    
    const validVideos = searchResults.videos.filter(v => !v.live && v.duration.seconds < 7200 && v.views > 10000);
    if (!validVideos.length) throw new Error('Only found live streams/unpopular videos');
    
    return { url: validVideos[0].url, info: validVideos[0] };
  }
}

// Utility function to fetch audio from Kaiz-API
async function fetchAudioData(videoUrl) {
  const apiUrl = `${KAIZ_API_URL}?url=${encodeURIComponent(videoUrl)}&apikey=${KAIZ_API_KEY}`;
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) throw new Error('API request failed');
  
  const data = await response.json();
  if (!data?.download_url) throw new Error('Invalid API response');
  
  return data;
}

// Utility function to fetch thumbnail
async function fetchThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  try {
    const response = await fetch(thumbnailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error('Thumbnail error:', e);
    return null;
  }
}

// Function to format the song info with decorations
function formatSongInfo(videoInfo, videoUrl) {
  const minutes = Math.floor(videoInfo.duration.seconds / 60);
  const seconds = videoInfo.duration.seconds % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Create a decorated song info with ASCII art
  return `
╭───〘  *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* 〙───
├📝 *ᴛɪᴛʟᴇ:* ${videoInfo.title}
├👤 *ᴀʀᴛɪsᴛ:* ${videoInfo.author.name}
├⏱️ *ᴅᴜʀᴀᴛɪᴏɴ:* ${formattedDuration}
├📅 *ᴜᴘʟᴏᴀᴅᴇᴅ:* ${videoInfo.ago}
├👁️ *ᴠɪᴇᴡs:* ${videoInfo.views.toLocaleString()}
├🎵 *Format:* High Quality MP3
╰───────────────┈ ⊷
${toFancyFont("choose download format:")}
  `.trim();
}

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
      
      try {
        // Fetch video info using the new logic
        const { url: videoUrl, info: videoInfo } = await fetchVideoInfo(query);
        
        // Fetch audio data from Kaiz-API
        const apiData = await fetchAudioData(videoUrl);
        
        if (!apiData.download_url) {
          await sendCustomReaction(client, message, "❌");
          return await client.sendMessage(message.from, {
            text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("No download URL available"),
            mentions: [message.sender]
          }, { quoted: message });
        }
        
        const videoId = extractYouTubeId(videoUrl) || videoInfo.videoId;
        const thumbnailUrl = getYouTubeThumbnail(videoId, 'maxresdefault');
        
        // Use the decorated song info format
        const songInfo = formatSongInfo(videoInfo, videoUrl);
        
        // Store session data
        userSessions.set(message.sender, {
          downloadUrl: apiData.download_url,
          videoTitle: videoInfo.title,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          timestamp: Date.now()
        });
        
        // Download thumbnail for image message
        let imageBuffer = await fetchThumbnail(thumbnailUrl);
        
        // Send single message with both info and buttons
        if (imageBuffer) {
          await client.sendMessage(message.from, {
            image: imageBuffer,
            caption: songInfo,
            buttons: [
              {
                buttonId: `${prefix}audio`,
                buttonText: { displayText: "🎶 ᴀᴜᴅɪᴏ" },
                type: 1
              },
              {
                buttonId: `${prefix}document`,
                buttonText: { displayText: "📂 ᴅᴏᴄᴜᴍᴇɴᴛ" },
                type: 1
              }
            ],
            mentions: [message.sender],
            footer: config.FOOTER || "> ᴍᴀᴅᴇ ᴡɪᴛʜ 🤍 ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ",
            headerType: 1,
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter',
                newsletterName: 'POWERED BY CASEYRHODES TECH',
                serverMessageId: -1
              }
            }
          }, { quoted: message });
        } else {
          await client.sendMessage(message.from, {
            text: songInfo,
            buttons: [
              {
                buttonId: `${prefix}audio`,
                buttonText: { displayText: "🎶 ᴀᴜᴅɪᴏ" },
                type: 1
              },
              {
                buttonId: `${prefix}document`,
                buttonText: { displayText: "📂 ᴅᴏᴄᴜᴍᴇɴᴛ" },
                type: 1
              }
            ],
            mentions: [message.sender],
            footer: config.FOOTER || "> ᴍᴀᴅᴇ ᴡɪᴛʜ 🤍 ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ",
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter',
                newsletterName: 'POWERED BY CASEYRHODES TECH',
                serverMessageId: -1
              }
            }
          }, { quoted: message });
        }
        
        await sendCustomReaction(client, message, "✅");
        
      } catch (error) {
        console.error("Error in play command:", error.message);
        await sendCustomReaction(client, message, "❌");
        
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont(error.message || "encountered an error. Please try again"),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
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
        // Generate a unique file name
        const fileName = `${session.videoTitle.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 50)}_${Date.now()}`;
        const filePath = `${tmpDir}/${fileName}.mp3`;
        
        // Download the audio file
        const audioResponse = await fetch(session.downloadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.youtube.com/',
            'Accept-Encoding': 'identity'
          }
        });
        
        if (!audioResponse.ok) throw new Error("Download failed");
        
        const fileStream = fs.createWriteStream(filePath);
        await streamPipeline(audioResponse.body, fileStream);
        
        const audioData = fs.readFileSync(filePath);
        
        if (command === "audio") {
          await client.sendMessage(message.from, { 
            audio: audioData, 
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: fileName + ".mp3",
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter',
                newsletterName: 'POWERED BY CASEYRHODES TECH',
                serverMessageId: -1
              }
            }
          }, { quoted: message });
        } else {
          await client.sendMessage(message.from, { 
            document: audioData, 
            mimetype: 'audio/mpeg',
            fileName: fileName + ".mp3",
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363302677217436@newsletter',
                newsletterName: 'POWERED BY CASEYRHODES TECH',
                serverMessageId: -1
              }
            }
          }, { quoted: message });
        }
        
        await sendCustomReaction(client, message, "✅");
        
        // Clean up file after 30 seconds
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
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
