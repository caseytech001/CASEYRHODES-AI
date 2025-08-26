import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import config from '../config.cjs';

const setProfilePicture = async (m, sock) => {
  const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd !== "fullpp") return;

  // Allow only the bot owner to use this command
  const isOwner = config.OWNERS.includes(m.sender.split('@')[0]);
  if (!isOwner) {
    return m.reply("❌ This command can only be used by the bot owner.");
  }

  // Check if the replied message is an image
  if (!m.quoted || !m.quoted.message?.imageMessage) {
    return m.reply("⚠️ Please *reply to an image* to set as profile picture.");
  }

  try {
    await sock.sendMessage(m.key.remoteJid, { react: { text: '⏳', key: m.key } });
    
    // Download the image
    let media;
    try {
      media = await downloadMediaMessage(
        m.quoted, 
        'buffer', 
        {},
        { 
          logger: console, 
          reuploadRequest: sock.updateMediaMessage 
        }
      );
    } catch (downloadError) {
      console.error("Download error:", downloadError);
      await sock.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
      return m.reply("❌ Failed to download image. Try again.");
    }

    if (!media) {
      await sock.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
      return m.reply("❌ Failed to download image. Try again.");
    }

    // Process image using the logic from the reference code
    const image = await Jimp.read(media);
    
    // Resize and blur background (like in the reference code)
    const blurred = image.clone().cover(640, 640).blur(8);
    const centered = image.clone().contain(640, 640);
    blurred.composite(centered, 0, 0);

    const processedImage = await blurred.getBufferAsync(Jimp.MIME_JPEG);

    // Update profile picture
    await sock.updateProfilePicture(botNumber, processedImage);
    await sock.sendMessage(m.key.remoteJid, { react: { text: '✅', key: m.key } });

    // Success response
    return sock.sendMessage(
      m.from,
      {
        text: "✅ *Profile Picture Updated successfully!*",
        mentions: [m.sender]
      },
      { quoted: m }
    );
  } catch (error) {
    console.error("Error setting profile picture:", error);
    await sock.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
    return m.reply(`❌ An error occurred while updating the profile picture: ${error.message}`);
  }
};

export default setProfilePicture;
