import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import config from '../config.cjs';

const setProfilePicture = async (m, sock) => {
  const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'; // Format the bot number properly
  const isBot = m.sender === botNumber;
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd !== "fullpp") return;

  // Allow only the bot owner to use this command instead of just the bot itself
  const isOwner = config.OWNERS.includes(m.sender.split('@')[0]);
  if (!isOwner) {
    return m.reply("❌ This command can only be used by the bot owner.");
  }

  // Check if the replied message is an image
  if (!m.quoted?.message?.imageMessage) {
    return m.reply("⚠️ Please *reply to an image* to set as profile picture.");
  }

  try {
    await sock.sendMessage(m.key.remoteJid, { react: { text: '⏳', key: m.key } });

    // Download the image with retry mechanism
    let media;
    for (let i = 0; i < 3; i++) {
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
        if (media) break;
      } catch (error) {
        if (i === 2) {
          await sock.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
          return m.reply("❌ Failed to download image. Try again.");
        }
      }
    }

    // Process image
    let image = await Jimp.read(media);
    if (!image) throw new Error("Invalid image format");

    // Make square if needed
    const size = Math.max(image.bitmap.width, image.bitmap.height);
    if (image.bitmap.width !== image.bitmap.height) {
      const squareImage = new Jimp(size, size, 0x000000FF);
      squareImage.composite(image, (size - image.bitmap.width) / 2, (size - image.bitmap.height) / 2);
      image = squareImage;
    }

    // Resize to WhatsApp requirements
    image.resize(640, 640);
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // Update profile picture
    await sock.updateProfilePicture(botNumber, buffer);
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
    return m.reply("❌ An error occurred while updating the profile picture.");
  }
};

export default setProfilePicture;
