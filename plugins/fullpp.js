import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import config from '../config.cjs';

const setProfilePicture = async (m, sock) => {
  const botNumber = sock.user.id;
  const isBot = m.sender === botNumber;
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd !== "fullpp") return;

  // Only bot can use this command
  if (!isBot) {
    return sock.sendMessage(m.from, { text: "❌ This command can only be used by the bot itself." }, { quoted: m });
  }

  // Check if the replied message is an image
  if (!m.quoted || !m.quoted.message || !m.quoted.message.imageMessage) {
    return sock.sendMessage(m.from, { text: "⚠️ Please *reply to an image* to set as profile picture." }, { quoted: m });
  }

  try {
    await sock.sendReaction(m.from, m.key.id, '⏳');

    // Download the image with retry mechanism
    let media;
    let retries = 3;
    
    while (retries > 0) {
      try {
        media = await downloadMediaMessage(m.quoted, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
        if (media) break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          await sock.sendReaction(m.from, m.key.id, '❌');
          return sock.sendMessage(m.from, { text: "❌ Failed to download image. Try again." }, { quoted: m });
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    // Process image
    const image = await Jimp.read(media);
    if (!image) throw new Error("Invalid image format");

    // Make square if needed
    const size = Math.max(image.bitmap.width, image.bitmap.height);
    if (image.bitmap.width !== image.bitmap.height) {
      const squareImage = new Jimp(size, size, 0x000000FF);
      const x = (size - image.bitmap.width) / 2;
      const y = (size - image.bitmap.height) / 2;
      squareImage.composite(image, x, y);
      image = squareImage;
    }

    // Resize to WhatsApp requirements
    image.resize(640, 640);
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // Update profile picture
    await sock.updateProfilePicture(botNumber, buffer);
    await sock.sendReaction(m.from, m.key.id, '✅');

    // Success response with menu buttons
    const buttons = [
      {buttonId: `${prefix}menu`, buttonText: {displayText: '📋 MENU'}, type: 1},
      {buttonId: `${prefix}help`, buttonText: {displayText: '❓ HELP'}, type: 1}
    ];
    
    const buttonMessage = {
      text: "✅ *Profile Picture Updated successfully!*",
      footer: config.FOOTER_TEXT || "Powered by CaseyRhodes-XMD",
      buttons: buttons,
      headerType: 1,
      mentions: [m.sender]
    };

    return sock.sendMessage(m.from, buttonMessage, { quoted: m });
  } catch (error) {
    console.error("Error setting profile picture:", error);
    await sock.sendReaction(m.from, m.key.id, '❌');
    return sock.sendMessage(m.from, { text: "❌ An error occurred while updating the profile picture." }, { quoted: m });
  }
};

export default setProfilePicture;
