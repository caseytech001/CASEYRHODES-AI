import axios from 'axios';

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

      // Fetch images from API
      const apiUrl = `https://apis-keith.vercel.app/search/images?query=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl);
      
      if (response.status !== 200) {
        return sock.sendMessage(m.from, { text: `API request failed with status ${response.status}` });
      }

      const data = response.data;
      
      if (!data.status || !data.result || data.result.length === 0) {
        return sock.sendMessage(m.from, { text: "No images found for your search term" });
      }

      // Limit to 5 images
      const images = data.result.slice(0, 5);
      
      // Create template message with buttons for each image
      const buttons = images.map((image, index) => ({
        buttonId: `img_${index}`,
        buttonText: { displayText: `🖼️ Image ${index + 1}` },
        type: 1
      }));
      
      // Add a "View All" button
      buttons.push({
        buttonId: 'view_all',
        buttonText: { displayText: '🌐 View All Images' },
        type: 1
      });

      await sock.sendMessage(m.from, {
        text: `🔍 I found ${images.length} images for "${query}"\n\nSelect an image to view or view all images online`,
        footer: `Powered by ${config.BOT_NAME}`,
        buttons: buttons,
        headerType: 1
      });

    } catch (error) {
      console.error('Command error:', error);
      await sock.sendMessage(m.from, { text: '❌ An error occurred while processing your request!' });
    }
  }
};

export default imageCommand;
