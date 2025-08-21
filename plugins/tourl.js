import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

const MAX_FILE_SIZE_MB = 200;
async function uploadMedia(buffer) {
  try {
    const { ext } = await fileTypeFromBuffer(buffer);
    const bodyForm = new FormData();
    bodyForm.append("fileToUpload", buffer, "file." + ext);
    bodyForm.append("reqtype", "fileupload");

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: bodyForm,
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.text();
    return data;
  } catch (error) {
    console.error("Error during media upload:", error);
    throw new Error('Failed to upload media');
  }
}

const tourl = async (m, bot) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const validCommands = ['tourl', 'geturl', 'upload', 'url'];

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

      // Create buttons
      const buttons = [
        {
          buttonId: `${prefix}copy ${mediaUrl}`,
          buttonText: { displayText: '📋 Copy URL' },
          type: 1
        },
        {
          buttonId: `${prefix}download`,
          buttonText: { displayText: '⬇️ Download' },
          type: 1
        }
      ];

      const buttonMessage = {
        text: `*Hey ${m.pushName} Here Is Your Media URL*\n\n*URL:* ${mediaUrl}`,
        footer: 'Click the buttons below to interact',
        buttons: buttons,
        headerType: 1,
        contextInfo: contextInfo
      };

      if (mediaType === 'audio') {
        await bot.sendMessage(m.from, buttonMessage, { quoted: m });
      } else {
        const message = {
          [mediaType]: { url: mediaUrl },
          caption: `*Hey ${m.pushName} Here Is Your Media*\n*URL:* ${mediaUrl}`,
          footer: 'Click the buttons below to interact',
          buttons: buttons,
          headerType: 4,
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
