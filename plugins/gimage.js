import axios from 'axios';
import config from '../config.cjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
  
    if (!query && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
      query = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
    }

    if (!query) {
      const buttonMessage = {
        text: `Please provide some text, Example usage: ${prefix + cmd} black cats\n\nOr reply to a message with text to generate images.`,
        footer: 'Image Search Bot',
        buttons: [
          { buttonId: `${prefix}image cats`, buttonText: { displayText: 'Example: Cats' } },
          { buttonId: `${prefix}image dogs`, buttonText: { displayText: 'Example: Dogs' } }
        ],
        headerType: 1
      };
      
      return sock.sendMessage(m.key.remoteJid, buttonMessage);
    }

    const numberOfImages = 5;

    try {
      // Send initial message with buttons
      const loadingMessage = {
        text: `🔍 *Searching for images:* ${query}\n\nPlease wait while I generate your images...`,
        footer: 'Generating 5 images',
        buttons: [
          { buttonId: `${prefix}image ${query}`, buttonText: { displayText: '🔄 Refresh Search' } },
          { buttonId: `${prefix}help image`, buttonText: { displayText: '❓ Help' } }
        ],
        headerType: 1
      };
      
      await sock.sendMessage(m.key.remoteJid, loadingMessage);

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
      }

      // Send images with navigation buttons
      for (let i = 0; i < images.length; i++) {
        await sleep(500);
        
        const imageMessage = {
          image: images[i],
          caption: `🖼️ *Image ${i + 1}/${images.length}*\n📝 Query: ${query}`,
          footer: 'Image Search Results',
          buttons: [
            { 
              buttonId: `${prefix}image ${query}`, 
              buttonText: { displayText: '🔄 Get More' } 
            },
            { 
              buttonId: `${prefix}download`, 
              buttonText: { displayText: '📥 Download' } 
            }
          ],
          headerType: 4
        };
        
        await sock.sendMessage(m.key.remoteJid, imageMessage, { quoted: m });
      }

      // Send completion message with options
      const completionMessage = {
        text: `✅ *Image generation complete!*\n\nGenerated ${images.length} images for: *${query}*`,
        footer: 'What would you like to do next?',
        buttons: [
          { 
            buttonId: `${prefix}image ${query}`, 
            buttonText: { displayText: '🔄 Generate More' } 
          },
          { 
            buttonId: `${prefix}image`, 
            buttonText: { displayText: '🎨 New Search' } 
          },
          { 
            buttonId: `${prefix}help`, 
            buttonText: { displayText: '❓ Help' } 
          }
        ],
        headerType: 1
      };
      
      await sock.sendMessage(m.key.remoteJid, completionMessage);
      
      // React to the message
      if (sock.sendReaction) {
        await sock.sendReaction(m.key.remoteJid, m.key, "✅");
      }
      
    } catch (error) {
      console.error("Error fetching images:", error);
      
      const errorMessage = {
        text: '*❌ Oops! Something went wrong while generating images.*\n\nPlease try again later or try a different search term.',
        footer: 'Error occurred',
        buttons: [
          { 
            buttonId: `${prefix}image ${query}`, 
            buttonText: { displayText: '🔄 Try Again' } 
          },
          { 
            buttonId: `${prefix}support`, 
            buttonText: { displayText: '🆘 Support' } 
          }
        ],
        headerType: 1
      };
      
      await sock.sendMessage(m.key.remoteJid, errorMessage);
    }
  }
};

export default imageCommand;
