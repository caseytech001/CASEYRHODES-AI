import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';

// Cache for frequently used data
const fontCache = new Map();
const thumbnailCache = new Map();
const videoCache = new Map();

function toFancyFont(text) {
  if (fontCache.has(text)) return fontCache.get(text);
  
  const fontMap = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 
    'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 
    'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 
    'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
  };
  
  const result = text.toLowerCase().split('').map(char => fontMap[char] || char).join('');
  fontCache.set(text, result);
  return result;
}

const streamPipeline = promisify(pipeline);
const tmpDir = os.tmpdir();

function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
  const cacheKey = `${videoId}_${quality}`;
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey);
  
  const qualities = {
    'default': 'default.jpg', 'mqdefault': 'mqdefault.jpg', 'hqdefault': 'hqdefault.jpg',
    'sddefault': 'sddefault.jpg', 'maxresdefault': 'maxresdefault.jpg'
  };
  
  const result = `https://i.ytimg.com/vi/${videoId}/${qualities[quality] || qualities['hqdefault']}`;
  thumbnailCache.set(cacheKey, result);
  return result;
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

// Session cleanup function
function cleanupExpiredSessions() {
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
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

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

// Utility function to fetch video data from API
async function fetchVideoData(videoUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const apiUrl = `https://api.giftedtech.co.ke/api/download/ytmp4?apikey=gifted&url=${encodeURIComponent(videoUrl)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data?.result) throw new Error('Invalid API response');
    
    return data.result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Utility function to fetch thumbnail with caching
async function fetchThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  
  // Check cache first
  if (thumbnailCache.has(thumbnailUrl)) {
    return thumbnailCache.get(thumbnailUrl);
  }
  
  try {
    const response = await fetch(thumbnailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Cache the thumbnail for future use
    thumbnailCache.set(thumbnailUrl, buffer);
    
    // Set timeout to clear cache after 10 minutes
    setTimeout(() => {
      thumbnailCache.delete(thumbnailUrl);
    }, 600000);
    
    return buffer;
  } catch (e) {
    console.error('Thumbnail error:', e);
    return null;
  }
}

// Function to format the video info with decorations
function formatVideoInfo(videoInfo, videoUrl, qualities) {
  const minutes = Math.floor(videoInfo.duration.seconds / 60);
  const seconds = videoInfo.duration.seconds % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Create a decorated video info with ASCII art
  return `
╭───〘  *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* 〙───
├📝 *ᴛɪᴛʟᴇ:* ${videoInfo.title}
├👤 *ᴄʜᴀɴɴᴇʟ:* ${videoInfo.author.name}
├⏱️ *ᴅᴜʀᴀᴛɪᴏɴ:* ${formattedDuration}
├📅 *ᴜᴘʟᴏᴀᴅᴇᴅ:* ${videoInfo.ago}
├👁️ *ᴠɪᴇᴡs:* ${videoInfo.views.toLocaleString()}
├🎬 *Format:* MP4 Video
╰───────────────┈ ⊷
${toFancyFont("choose download quality:")}
  `.trim();
}

// Preload video for faster delivery
async function preloadVideo(session, qualityUrl) {
  if (!session || session.preloaded) return;
  
  try {
    const fileName = `${session.videoTitle.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 50)}_${Date.now()}`;
    const filePath = `${tmpDir}/${fileName}.mp4`;
    
    const videoResponse = await fetch(qualityUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Accept-Encoding': 'identity'
      }
    });
    
    if (!videoResponse.ok) throw new Error("Download failed");
    
    const fileStream = fs.createWriteStream(filePath);
    await streamPipeline(videoResponse.body, fileStream);
    
    session.filePath = filePath;
    session.preloaded = true;
    session.timestamp = Date.now();
    
    // Schedule cleanup for 10 minutes
    setTimeout(() => {
      if (session.filePath && fs.existsSync(session.filePath)) {
        try {
          fs.unlinkSync(session.filePath);
          session.preloaded = false;
          session.filePath = null;
        } catch (e) {}
      }
    }, 600000);
    
  } catch (error) {
    console.error("Preload error:", error.message);
    // Don't throw error as this is just a preload attempt
  }
}

const video = async (message, client, config = {}) => {
  try {
    // Use a default prefix if config is not available
    const prefix = config.Prefix || config.PREFIX || '.';
    const body = message.body || '';
    const command = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0].toLowerCase() : '';
    const args = body.slice(prefix.length + command.length).trim().split(" ");
    
    // Clean up expired sessions
    cleanupExpiredSessions();

    if (command === "video") {
      await sendCustomReaction(client, message, "⏳");
      
      if (args.length === 0 || !args.join(" ")) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont("Please provide a video name or YouTube URL to search"),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const query = args.join(" ");
      
      try {
        // Fetch video info using the new logic
        const { url: videoUrl, info: videoInfo } = await fetchVideoInfo(query);
        
        // Fetch video data from API
        const apiData = await fetchVideoData(videoUrl);
        
        if (!apiData || !apiData.video) {
          await sendCustomReaction(client, message, "❌");
          return await client.sendMessage(message.from, {
            text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("No video data available"),
            mentions: [message.sender]
          }, { quoted: message });
        }
        
        const videoId = extractYouTubeId(videoUrl) || videoInfo.videoId;
        const thumbnailUrl = getYouTubeThumbnail(videoId, 'maxresdefault');
        
        // Extract available qualities
        const qualities = [];
        if (apiData.video["1080p"]) qualities.push({ quality: "1080p", url: apiData.video["1080p"] });
        if (apiData.video["720p"]) qualities.push({ quality: "720p", url: apiData.video["720p"] });
        if (apiData.video["480p"]) qualities.push({ quality: "480p", url: apiData.video["480p"] });
        if (apiData.video["360p"]) qualities.push({ quality: "360p", url: apiData.video["360p"] });
        if (apiData.video["240p"]) qualities.push({ quality: "240p", url: apiData.video["240p"] });
        if (apiData.video["144p"]) qualities.push({ quality: "144p", url: apiData.video["144p"] });
        
        if (qualities.length === 0) {
          await sendCustomReaction(client, message, "❌");
          return await client.sendMessage(message.from, {
            text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("No video qualities available"),
            mentions: [message.sender]
          }, { quoted: message });
        }
        
        // Use the decorated video info format
        const videoInfoText = formatVideoInfo(videoInfo, videoUrl, qualities);
        
        // Store session data
        const sessionData = {
          videoTitle: videoInfo.title,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          qualities: qualities,
          timestamp: Date.now(),
          preloaded: false,
          filePath: null
        };
        
        userSessions.set(message.sender, sessionData);
        
        // Download thumbnail for image message
        let imageBuffer = await fetchThumbnail(thumbnailUrl);
        
        // Create buttons for each quality
        const buttons = qualities.map((quality, index) => ({
          buttonId: `${prefix}download_${index}`,
          buttonText: { displayText: `🎬 ${quality.quality}` },
          type: 1
        }));
        
        // Use a default footer if config is not available
        const footer = config.FOOTER || "> ᴍᴀᴅᴇ ᴡɪᴛʜ 🤍 ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ";
        
        // Newsletter context info
        const newsletterContext = {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363302677217436@newsletter',
            newsletterName: 'POWERED BY CASEYRHODES TECH',
            serverMessageId: -1
          }
        };
        
        // Send single message with both info and buttons
        if (imageBuffer) {
          await client.sendMessage(message.from, {
            image: imageBuffer,
            caption: videoInfoText,
            buttons: buttons,
            mentions: [message.sender],
            footer: footer,
            headerType: 1,
            contextInfo: newsletterContext
          }, { quoted: message });
        } else {
          await client.sendMessage(message.from, {
            text: videoInfoText,
            buttons: buttons,
            mentions: [message.sender],
            footer: footer,
            contextInfo: newsletterContext
          }, { quoted: message });
        }
        
        await sendCustomReaction(client, message, "✅");
        
      } catch (error) {
        console.error("Error in video command:", error.message);
        await sendCustomReaction(client, message, "❌");
        
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont(error.message || "encountered an error. Please try again"),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
    } else if (command.startsWith("download_")) {
      const qualityIndex = parseInt(command.split("_")[1]);
      const session = userSessions.get(message.sender);
      
      if (!session || (Date.now() - session.timestamp > 10 * 60 * 1000)) {
        if (session) userSessions.delete(message.sender);
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont("Session expired. Please use the video command again."),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      if (isNaN(qualityIndex) || qualityIndex < 0 || qualityIndex >= session.qualities.length) {
        await sendCustomReaction(client, message, "❌");
        return await client.sendMessage(message.from, {
          text: toFancyFont("Invalid quality selection."),
          mentions: [message.sender]
        }, { quoted: message });
      }
      
      const selectedQuality = session.qualities[qualityIndex];
      await sendCustomReaction(client, message, "⬇️");
      
      try {
        let videoData;
        let filePath = session.filePath;
        
        // If video was preloaded, use the preloaded file
        if (session.preloaded && filePath && fs.existsSync(filePath)) {
          videoData = fs.readFileSync(filePath);
        } else {
          // Generate a unique file name
          const fileName = `${session.videoTitle.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 50)}_${Date.now()}`;
          filePath = `${tmpDir}/${fileName}.mp4`;
          
          // Download the video file
          const videoResponse = await fetch(selectedQuality.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': 'https://www.youtube.com/',
              'Accept-Encoding': 'identity'
            }
          });
          
          if (!videoResponse.ok) throw new Error("Download failed");
          
          const fileStream = fs.createWriteStream(filePath);
          await streamPipeline(videoResponse.body, fileStream);
          
          videoData = fs.readFileSync(filePath);
        }
        
        // Fetch thumbnail for the context info
        const thumbnailBuffer = await fetchThumbnail(session.thumbnailUrl);
        
        // Newsletter context info
        const newsletterContext = {
          externalAdReply: {
            title: session.videoTitle.substring(0, 30) || 'Video Download',
            body: `Quality: ${selectedQuality.quality}`,
            mediaType: 2,
            sourceUrl: session.videoUrl,
            thumbnail: thumbnailBuffer,
            renderLargerThumbnail: false
          }
        };
        
        // Send as video message
        await client.sendMessage(message.from, {
          video: videoData,
          mimetype: 'video/mp4',
          caption: `${session.videoTitle}\n\nQuality: ${selectedQuality.quality}`,
          contextInfo: newsletterContext
        }, { quoted: message });
        
        await sendCustomReaction(client, message, "✅");
        
        // Clean up file after 30 seconds if it wasn't preloaded
        if (!session.preloaded) {
          setTimeout(() => {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (e) {}
          }, 30000);
        }
        
      } catch (error) {
        console.error("Failed to download video:", error.message);
        await sendCustomReaction(client, message, "❌");
        
        await client.sendMessage(message.from, {
          text: "*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont(`failed to download video: ${error.message}`),
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
      text: "*ᴄᴀsᴇʏʀʀʜᴏᴅᴇs ᴀɪ* " + toFancyFont("encountered an error. Please try again"),
      mentions: [message.sender]
    }, { quoted: message });
  }
};

export default video;
