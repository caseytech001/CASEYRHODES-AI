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
      const maxImages = Math.min(results.length, 8);
      
      // Send header message with search info
      const headerText = `
╭───「 *IMAGE SEARCH* 」───
├ Query: ${query}
├ Found: ${results.length} images
├ Showing: ${maxImages} results
╰─────────────────────`;
      
      await sock.sendMessage(m.from, { text: headerText });

      // Select random images
      const selectedImages = results
        .sort(() => 0.5 - Math.random())
        .slice(0, maxImages);

      // Group images in sets of 2 for horizontal display
      for (let i = 0; i < selectedImages.length; i += 2) {
        const imagePair = selectedImages.slice(i, i + 2);
        
        if (imagePair.length === 2) {
          // Send two images with horizontal layout indication
          const caption = `🖼️ Images ${i+1}-${i+2} of ${maxImages}\n─────────────────────`;
          
          await sock.sendMessage(
            m.from,
            {
              image: { url: imagePair[0] },
              caption: caption
            },
            { quoted: m }
          );
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await sock.sendMessage(
            m.from,
            {
              image: { url: imagePair[1] }
            },
            { quoted: m }
          );
        } else {
          // Single image if odd number
          await sock.sendMessage(
            m.from,
            {
              image: { url: imagePair[0] },
              caption: `🖼️ Image ${i+1} of ${maxImages}\n─────────────────────`
            },
            { quoted: m }
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Send footer message
      await sock.sendMessage(m.from, { 
        text: `╭───「 *SEARCH COMPLETE* 」───\n╰➤ Powered by Mercedes Bot` 
      });
      
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
