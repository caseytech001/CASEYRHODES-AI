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

      // Using a more reliable API endpoint
      const url = `https://api.princetechn.com/api/search/unsplash?apikey=prince&query=${encodeURIComponent(query)}`;
      
      const response = await axios.get(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Handle different possible response structures
      let images = [];
      
      if (response.data && Array.isArray(response.data)) {
        images = response.data;
      } else if (response.data && response.data.images && Array.isArray(response.data.images)) {
        images = response.data.images;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        images = response.data.results;
      } else {
        throw new Error('Unexpected API response structure');
      }

      if (!images.length) {
        await sock.sendMessage(m.from, { text: '❌ No images found 😔\nTry different keywords' });
        await sock.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        return;
      }

      const maxImages = Math.min(images.length, 5);
      await sock.sendMessage(m.from, { text: `✅ Found ${images.length} images for *${query}*\nSending top ${maxImages}...` });

      for (const [index, image] of images.slice(0, maxImages).entries()) {
        try {
          const imageUrl = image.url || image.imageUrl || image.link || image.src;
          
          if (!imageUrl) {
            console.warn(`Image missing URL:`, image);
            continue;
          }

          const caption = `
╭───[ *ɪᴍᴀɢᴇ sᴇᴀʀᴄʜ* ]───
├ *ǫᴜᴇʀʏ*: ${query} 🔍
├ *ʀᴇsᴜʟᴛ*: ${index + 1} of ${maxImages} 🖼️
╰───[ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs* ]───`.trim();

          await sock.sendMessage(
            m.from,
            {
              image: { url: imageUrl },
              caption: caption,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 1,
                isForwarded: true
              }
            },
            { quoted: m }
          );
        } catch (err) {
          console.warn(`Failed to send image ${index + 1}:`, err.message);
          continue;
        }

        // Add delay between sending images
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await sock.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (error) {
      console.error('Image search error:', error);
      let errorMsg = '❌ Failed to fetch images 😞';
      
      if (error.message.includes('timeout')) {
        errorMsg = '❌ Request timed out ⏰';
      } else if (error.response && error.response.status === 404) {
        errorMsg = '❌ Image search service unavailable';
      } else if (error.response && error.response.status) {
        errorMsg = `❌ API error: ${error.response.status}`;
      }
      
      await sock.sendMessage(m.from, { text: errorMsg });
      await sock.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }
  }
};

export default imageCommand;
