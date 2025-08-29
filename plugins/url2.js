import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';

const MAX_FILE_SIZE_MB = 200;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const API_TIMEOUT = 30000; // 30 seconds

// Cache for temporary file paths to avoid conflicts
const tempFileCache = new Map();

async function uploadMedia(buffer, retryCount = 0) {
  let tempFilePath = null;
  
  try {
    const { ext } = await fileTypeFromBuffer(buffer);
    
    // Generate unique temp file name to avoid conflicts
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    tempFilePath = path.join(os.tmpdir(), `Casey_xmd_${timestamp}_${randomSuffix}.${ext || 'tmp'}`);
    
    // Write file asynchronously
    await fs.promises.writeFile(tempFilePath, buffer);
    
    const formData = new FormData();
    formData.append("image", fs.createReadStream(tempFilePath));
    
    // Use axios with timeout and better error handling
    const response = await axios.post(
      "https://api.imgbb.com/1/upload?key=f07b8d2d9f0593bc853369f251a839de", 
      formData, 
      {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json',
        },
        timeout: API_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    
    // Clean up temporary file
    try {
      await fs.promises.unlink(tempFilePath);
      tempFileCache.delete(tempFilePath);
    } catch (cleanupError) {
      console.warn("Warning: Could not delete temp file:", cleanupError.message);
    }
    
    if (response.data?.data?.url) {
      return response.data.data.url;
    } else {
      throw new Error('Invalid response from imgBB API: No URL found');
    }
  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath).catch(() => {});
        tempFileCache.delete(tempFilePath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    // Retry logic for transient errors
    if (shouldRetry(error) && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying upload in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return uploadMedia(buffer, retryCount + 1);
    }
    
    console.error("Error during media upload:", error);
    
    if (error.response) {
      // API error response
      throw new Error(`Upload failed: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Could not connect to upload service');
    } else {
      // Other error
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}

// Check if error is retryable
function shouldRetry(error) {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  if (error.response) {
    // Retry on server errors (5xx) and rate limits (429)
    return error.response.status >= 500 || error.response.status === 429;
  }
  
  return false;
}

const tourl = async (m, bot) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const validCommands = ['tourl2', 'geturl', 'upload', 'url2'];

  if (!validCommands.includes(cmd)) {
    return; // Not our command
  }

  // Early validation
  if (!m.quoted || !['imageMessage', 'videoMessage', 'audioMessage'].includes(m.quoted.mtype)) {
    return m.reply(`Send/Reply/Quote an image, video, or audio to upload \n*${prefix + cmd}*`);
  }

  try {
    // Send initial processing message
    const processingMsg = await m.reply('⏳ Processing your media, please wait...');
    
    const media = await m.quoted.download();
    if (!media) throw new Error('Failed to download media.');

    const fileSizeMB = media.length / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      await bot.sendMessage(m.from, { 
        delete: processingMsg.key 
      }).catch(() => {});
      return m.reply(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
    }
    
    // Upload with progress indication
    await m.reply('📤 Uploading to server...');
    
    const mediaUrl = await uploadMedia(media);

    // Delete processing messages
    try {
      await bot.sendMessage(m.from, { 
        delete: processingMsg.key 
      });
    } catch (e) {
      // Ignore if message deletion fails
    }

    const mediaType = getMediaType(m.quoted.mtype);
    const contextInfo = {
      mentionedJid: [m.sender],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363302677217436@newsletter',
        newsletterName: 'CASEYRHODES-XMD',
        serverMessageId: 143
      }
    };

    if (mediaType === 'audio') {
      const message = {
        text: `*Hey ${m.pushName} Here Is Your Audio URL*\n*Url:* ${mediaUrl}`,
        contextInfo: contextInfo
      };
      await bot.sendMessage(m.from, message, { quoted: m });
    } else {
      const message = {
        [mediaType]: { url: mediaUrl },
        caption: `*Hey ${m.pushName} Here Is Your Media*\n*Url:* ${mediaUrl}`,
        contextInfo: contextInfo
      };
      await bot.sendMessage(m.from, message, { quoted: m });
    }

  } catch (error) {
    console.error('Error processing media:', error);
    
    // User-friendly error messages
    let errorMessage = 'Error processing media.';
    if (error.message.includes('Network error')) {
      errorMessage = '📡 Network error: Please check your connection and try again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = '⏰ Upload timed out. Please try again with a smaller file.';
    } else if (error.message.includes('size')) {
      errorMessage = `📁 File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    
    m.reply(errorMessage);
  }
};

const getMediaType = (mtype) => {
  switch (mtype) {
    case 'imageMessage':
      return 'image';
    case 'videoMessage':
      return 'video';
    case 'audioMessage':
      return 'audio';
    default:
      return null;
  }
};

// Cleanup temp files on process exit
process.on('exit', () => {
  for (const filePath of tempFileCache.keys()) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
});

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

export default tourl;
