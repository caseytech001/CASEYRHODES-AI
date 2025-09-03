import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import config from '../config.cjs';

const setProfilePicture = async (m, sock) => {
  try {
    const { user: { id: botNumber } } = sock;
    const isBot = m.sender === botNumber;
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

    if (cmd !== 'fullpp') return;

    const isOwner = config.OWNER_NUMBER && m.sender.endsWith(config.OWNER_NUMBER.replace(/[^0-9]/g, ''));
    if (!isOwner) {
      return m.reply('❌ This command can only be used by the bot owner.');
    }

    if (!m.quoted?.message?.imageMessage) {
      return m.reply('⚠️ Please *reply to an image* to set as profile picture.');
    }

    await m.react('⏳');

    const downloadImage = async (retry = 0) => {
      try {
        return await downloadMediaMessage(m.quoted, 'buffer', {});
      } catch (error) {
        if (retry < 3) {
          return downloadImage(retry + 1);
        }
        throw error;
      }
    };

    const media = await downloadImage();
    const image = await Jimp.read(media);

    if (image.bitmap.width !== image.bitmap.height) {
      const size = Math.max(image.bitmap.width, image.bitmap.height);
      const squareImage = new Jimp(size, size, 0x000000FF);
      squareImage.composite(image, (size - image.bitmap.width) / 2, (size - image.bitmap.height) / 2);
      image.bitmap.data = squareImage.bitmap.data; // Assign the new bitmap data
    }

    image.resize(640, 640);
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    await sock.updateProfilePicture(botNumber, buffer);
    await m.react('✅');
    return sock.sendMessage(m.from, {
      text: '✅ *Profile Picture Updated successfully!*',
      mentions: [m.sender],
    }, { quoted: m });
  } catch (error) {
    console.error('Error setting profile picture:', error);
    await m.react('❌');
    return m.reply('❌ An error occurred while updating the profile picture.');
  }
};
