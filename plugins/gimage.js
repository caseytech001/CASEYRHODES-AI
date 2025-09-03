import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

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

      // Limit to 8 images
      const images = data.result.slice(0, 8);
      let picked = [];

      // Download each image
      for (const image of images) {
        try {
          const imageResponse = await axios.get(image.url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(imageResponse.data);
          picked.push({ buffer, directLink: image.url });
        } catch (e) {
          console.error(`Failed to download image: ${image.url}`, e);
        }
      }

      if (picked.length === 0) {
        return sock.sendMessage(m.from, { text: "Failed to download any images. Please try again." });
      }

      // Generate carousel cards
      const carouselCards = await Promise.all(picked.map(async (item, index) => {
        // Upload image to WhatsApp server
        const media = await sock.uploadMedia(item.buffer, { filename: `image_${index}.jpg` });
        
        return {
          title: `📸 Image ${index + 1}`,
          description: `🔍 Search: ${query}`,
          imageMessage: media,
          buttons: [
            {
              type: "cta_url",
              title: "🌐 View Original",
              payload: item.directLink
            }
          ]
        };
      }));

      // Create carousel message using baileys format
      const message = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: {
              body: {
                text: `🔍 Search Results for: ${query}`
              },
              footer: {
                text: `📂 Found ${picked.length} images`
              },
              carouselMessage: {
                cards: carouselCards
              }
            }
          }
        }
      };

      // Generate the WA message
      const generatedMessage = generateWAMessageFromContent(m.from, message, { quoted: m });
      
      // Send the message
      await sock.relayMessage(m.from, generatedMessage.message, { messageId: generatedMessage.key.id });

    } catch (error) {
      console.error('Command error:', error);
      await sock.sendMessage(m.from, { text: '❌ An error occurred while processing your request!' });
    }
  }
};

export default imageCommand;
