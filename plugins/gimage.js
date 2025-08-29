import axios from 'axios';
import config from '../config.cjs';

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
    if (!query && !(m.quoted && m.quoted.text)) {
      return sock.sendMessage(m.from, { text: `❌ Please provide a search query\nExample: ${prefix + cmd} cute cats` });
    }

    if (!query && m.quoted && m.quoted.text) {
      query = m.quoted.text;
    }

    try {
      await sock.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
      await sock.sendMessage(m.from, { text: `🔍 Searching for *${query}*...` });

      const url = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 15000 });

      if (!response.data?.success || !response.data.results?.length) {
        await sock.sendMessage(m.from, { text: '❌ No images found 😔\nTry different keywords' });
        await sock.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        return;
      }

      const results = response.data.results;
      const maxImages = Math.min(results.length, 5);
      await sock.sendMessage(m.from, { text: `✅ Found *${results.length}* images for *${query}*\nSending top ${maxImages}...` });

      const selectedImages = results
        .sort(() => 0.5 - Math.random())
        .slice(0, maxImages);

      for (const [index, imageUrl] of selectedImages.entries()) {
        try {
          const caption = `
╭───[ *ɪᴍᴀɢᴇ sᴇᴀʀᴄʜ* ]───
├ *ǫᴜᴇʀʏ*: ${query} 🔍
├ *ʀᴇsᴜʟᴛ*: ${index + 1} of ${maxImages} 🖼️
╰───[ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs* ]───`;

          await sock.sendMessage(
            m.from,
            {
              image: { url: imageUrl },
              caption,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363302677217436@newsletter',
                  newsletterName: 'POWERED BY CASEYRHODES TECH',
                  serverMessageId: -1
                }
              }
            },
            { quoted: m }
          );
        } catch (err) {
          console.warn(`⚠️ Failed to send image ${index + 1}: ${imageUrl}`, err);
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await sock.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (error) {
      console.error('❌ Image search error:', error);
      const errorMsg = error.message.includes('timeout')
        ? '❌ Request timed out ⏰'
        : '❌ Failed to fetch images 😞';
      await sock.sendMessage(m.from, { text: errorMsg });
      await sock.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }
  }
};

export default imageCommand;
