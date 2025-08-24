import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';

const MAX_FILE_SIZE_MB = 200;

async function uploadMedia(buffer) {
  try {
    const { ext } = await fileTypeFromBuffer(buffer);
    
    // You can edit this path to customize the URL or file naming
    const tempFilePath = path.join(os.tmpdir(), "Casey_xmd");
    
    fs.writeFileSync(tempFilePath, buffer);
    
    const formData = new FormData();
    formData.append("image", fs.createReadStream(tempFilePath));
    
    const response = await axios.post("https://api.imgbb.com/1/upload?key=f07b8d2d9f0593bc853369f251a839de", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    if (response.data && response.data.data && response.data.data.url) {
      return response.data.data.url;
    } else {
      throw new Error('Invalid response from imgBB API');
    }
  } catch (error) {
    console.error("Error during media upload:", error);
    throw new Error('Failed to upload media');
  }
}

const tourl = async (m, bot) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const validCommands = ['tourl2', 'geturl', 'upload', 'url2'];

  if (validCommands.includes(cmd)) {
    if (!m.quoted || !['imageMessage', 'videoMessage', 'audioMessage'].includes(m.quoted.mtype)) {
      return m.reply(`Send/Reply/Quote an image, video, or audio to upload \n*${prefix + cmd}*`);
    }

    try {
      const media = await m.quoted.download();
      if (!media) throw new Error('Failed to download media.');

      const fileSizeMB = media.length / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return m.reply(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      }
      
      const mediaUrl = await uploadMedia(media);

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
      m.reply('Error processing media.');
    }
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

export default tourl;
