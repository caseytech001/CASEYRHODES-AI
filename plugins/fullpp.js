import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import config from '../config.cjs';

const setProfilePicture = async (m, sock) => {
  const botNumber = sock.user.id;
  const isBot = m.sender === botNumber;
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd !== "fullpp") return;

  // Check if the user is the bot owner
  const isOwner = config.OWNER_NUMBER && m.sender.endsWith(config.OWNER_NUMBER.replace(/[^0-9]/g, ''));
  
  // Allow only bot owner to use this command
  if (!isOwner) {
    return m.reply("❌ This command can only be used by the bot owner.");
  }

  // Check if the replied message is an image
  if (!m.quoted?.message?.imageMessage) {
    return m.reply("⚠️ Please *reply to an image* to set as profile picture.");
  }

  await m.react('⏳'); // Loading reaction

  try {
    // Download the image with retry mechanism
    let media;
    for (let i = 0; i < 3; i++) {
      try {
        media = await downloadMediaMessage(m.quoted, 'buffer', {});
        if (media) break;
      } catch (error) {
        if (i === 2) {
          await m.react('❌');
          return m.reply("❌ Failed to download image. Try again.");
        }
      }
    }

    // Process image
    const image = await Jimp.read(media);
    if (!image) throw new Error("Invalid image format");

    // Make square if needed
    const size = Math.max(image.bitmap.width, image.bitmap.height);
    if (image.bitmap.width !== image.bitmap.height) {
      const squareImage = new Jimp(size, size, 0x000000FF);
      squareImage.composite(image, (size - image.bitmap.width) / 2, (size - image.bitmap.height) / 2);
      image.clone(squareImage);
    }

    // Resize to WhatsApp requirements
    image.resize(640, 640);
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // Update profile picture
    await sock.updateProfilePicture(botNumber, buffer);
    await m.react('✅');

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
    await m.react('❌');
    return m.reply("❌ An error occurred while updating the profile picture.");
  }
};

export default setProfilePicture;
