import axios from 'axios';
import config from '../config.cjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
  
    if (!query && !(m.quoted && m.quoted.text)) {
      return sock.sendMessage(m.from, { text: `Please provide some text, Example usage: ${prefix + cmd} black cats` });
    }
  
    if (!query && m.quoted && m.quoted.text) {
      query = m.quoted.text;
    }

    const numberOfImages = 3; // Changed from 5 to 3

    try {
      await sock.sendMessage(m.from, { text: '*Please wait, generating your images...*' });

      const images = [];

      for (let i = 0; i < numberOfImages; i++) {
        const endpoint = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(endpoint, { responseType: 'arraybuffer' });

        if (response.status === 200) {
          const imageBuffer = Buffer.from(response.data, 'binary');
          images.push(imageBuffer);
        } else {
          throw new Error('Image generation failed');
        }
        
        // Add a small delay between requests to avoid rate limiting
        await sleep(300);
      }

      // Send all images with navigation buttons
      for (let i = 0; i < images.length; i++) {
        await sleep(500);
        
        // Create buttons for navigation
        const buttons = [
          {
            buttonId: `img_prev_${i}`,
            buttonText: { displayText: '⬅️ Previous' },
            type: 1,
            disabled: i === 0 // Disable previous button on first image
          },
          {
            buttonId: `img_next_${i}`,
            buttonText: { displayText: 'Next ➡️' },
            type: 1,
            disabled: i === images.length - 1 // Disable next button on last image
          }
        ];
        
        // Add additional action buttons to the first image
        if (i === 0) {
          buttons.push(
            {
              buttonId: 'img_download',
              buttonText: { displayText: '📥 Download All' },
              type: 1
            },
            {
              buttonId: 'img_new',
              buttonText: { displayText: '🔄 New Search' },
              type: 1
            }
          );
        }
        
        await sock.sendMessage(
          m.from, 
          { 
            image: images[i], 
            caption: `Image ${i+1}/${images.length} for "${query}"`,
            buttons: buttons,
            footer: config.BOT_NAME || 'Image Bot',
            headerType: 4
          }, 
          { quoted: m }
        );
      }
      
      await m.React("✅");
    } catch (error) {
      console.error("Error fetching images:", error);
      await sock.sendMessage(
        m.from, 
        { 
          text: '*Oops! Something went wrong while generating images. Please try again later.*',
          buttons: [
            { buttonId: 'img_retry', buttonText: { displayText: '🔄 Try Again' }, type: 1 },
            { buttonId: 'img_help', buttonText: { displayText: '❓ Help' }, type: 1 }
          ]
        }
      );
    }
  }
};

export default imageCommand;
