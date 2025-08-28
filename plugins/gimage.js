import axios from 'axios';
import config from '../config.cjs';

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.message?.conversation?.startsWith(prefix) 
    ? m.message.conversation.slice(prefix.length).split(' ')[0].toLowerCase()
    : m.message?.extendedTextMessage?.text?.startsWith(prefix)
    ? m.message.extendedTextMessage.text.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  let query = '';
  if (m.message?.conversation?.startsWith(prefix)) {
    query = m.message.conversation.slice(prefix.length + cmd.length).trim();
  } else if (m.message?.extendedTextMessage?.text?.startsWith(prefix)) {
    query = m.message.extendedTextMessage.text.slice(prefix.length + cmd.length).trim();
  }

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
    // Check for quoted message
    if (!query && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
      if (quotedMsg.conversation) {
        query = quotedMsg.conversation;
      } else if (quotedMsg.extendedTextMessage?.text) {
        query = quotedMsg.extendedTextMessage.text;
      }
    }

    if (!query) {
      return sock.sendMessage(m.key.remoteJid, { 
        text: `❌ Please provide a search query\nExample: ${prefix + cmd} cute cats` 
      });
    }

    try {
      // Send reaction
      await sock.sendMessage(m.key.remoteJid, {
        react: { text: '⏳', key: m.key }
      });

      await sock.sendMessage(m.key.remoteJid, { 
        text: `🔍 Searching for *${query}*...` 
      });

      const url = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 15000 });

      if (!response.data?.success || !response.data.results?.length) {
        await sock.sendMessage(m.key.remoteJid, { 
          text: '❌ No images found 😔\nTry different keywords' 
        });
        await sock.sendMessage(m.key.remoteJid, {
          react: { text: '❌', key: m.key }
        });
        return;
      }

      const results = response.data.results;
      const maxImages = Math.min(results.length, 8);
      
      // Send header with search info
      await sock.sendMessage(m.key.remoteJid, { 
        text: `╔═══════════════════════╗\n` +
              `        📷 IMAGE SEARCH\n` +
              `╚═══════════════════════╝\n\n` +
              `🔍 *Search:* ${query}\n` +
              `📊 *Results:* ${maxImages} of ${results.length} images found\n\n` +
              `⬇️ *Scroll down to view all images* ⬇️`
      });

      const selectedImages = results.slice(0, maxImages);

      // Group images into rows of 2 (to create a grid-like appearance)
      for (let i = 0; i < selectedImages.length; i += 2) {
        const rowImages = selectedImages.slice(i, i + 2);
        
        // Create a caption that spans both images in the row
        let caption = `╔═══════════════════════╗\n` +
                     `        IMAGE RESULTS\n` +
                     `╚═══════════════════════╝\n\n`;
        
        // Add image indicators for this row
        for (let j = 0; j < rowImages.length; j++) {
          caption += `🖼️ *Image ${i + j + 1}*/${maxImages}\n`;
        }
        
        caption += `\n🔍 *Search:* ${query}\n`;
        caption += `⬇️ Scroll for more images ⬇️`;
        
        // Send the first image in the row with the combined caption
        try {
          await sock.sendMessage(
            m.key.remoteJid,
            {
              image: { url: rowImages[0] },
              caption: caption,
              mentions: [m.sender]
            }
          );
        } catch (err) {
          console.warn(`⚠️ Failed to send image ${i + 1}: ${rowImages[0]}`, err);
        }
        
        // If there's a second image in the row, send it without caption
        if (rowImages[1]) {
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            await sock.sendMessage(
              m.key.remoteJid,
              {
                image: { url: rowImages[1] },
                caption: `🖼️ *Image ${i + 2}*/${maxImages}\n🔍 *Search:* ${query}`,
                mentions: [m.sender]
              }
            );
          } catch (err) {
            console.warn(`⚠️ Failed to send image ${i + 2}: ${rowImages[1]}`, err);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Send footer message
      await sock.sendMessage(m.key.remoteJid, {
        text: `╔═══════════════════════╗\n` +
              `       SEARCH COMPLETE\n` +
              `╚═══════════════════════╝\n\n` +
              `✅ *Search:* ${query}\n` +
              `📊 *Total results:* ${results.length} images\n\n` +
              `✨ *Powered by caseytech* ✨`
      });

      // Send success reaction
      await sock.sendMessage(m.key.remoteJid, {
        react: { text: '✅', key: m.key }
      });

    } catch (error) {
      console.error('❌ Image search error:', error);
      const errorMsg = error.message.includes('timeout')
        ? '❌ Request timed out ⏰'
        : '❌ Failed to fetch images 😞';
      
      await sock.sendMessage(m.key.remoteJid, { text: errorMsg });
      await sock.sendMessage(m.key.remoteJid, {
        react: { text: '❌', key: m.key }
      });
    }
  }
};

export default imageCommand;
