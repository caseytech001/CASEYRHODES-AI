import axios from 'axios';
import config from '../config.cjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Store user sessions to remember their queries
const userSessions = new Map();

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const body = m.messages ? m.messages[0]?.message : m;
  const text = body?.conversation || body?.extendedTextMessage?.text || '';
  
  const cmd = text.startsWith(prefix) ? text.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = text.slice(prefix.length + cmd.length).trim();

  // Handle button interactions
  if (body?.templateButtonReplyMessage) {
    const buttonId = body.templateButtonReplyMessage.selectedId;
    const userId = m.key.remoteJid;
    
    if (buttonId === 'img_next' && userSessions.has(userId)) {
      const session = userSessions.get(userId);
      query = session.query;
      session.page += 1;
    } else if (buttonId === 'img_new') {
      userSessions.delete(userId);
      return sock.sendMessage(m.from, { text: `Please send a new search query. Example: ${prefix + cmd} black cats` });
    } else if (buttonId === 'img_download') {
      // Download functionality would go here
      return sock.sendMessage(m.from, { text: 'Download feature coming soon!' });
    } else if (buttonId === 'img_retry' && userSessions.has(userId)) {
      const session = userSessions.get(userId);
      query = session.query;
    }
  }

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd) || (body?.templateButtonReplyMessage && query)) {
  
    if (!query && !(m.messages && m.messages[0]?.message?.extendedTextMessage?.contextInfo?.quotedMessage)) {
      return sock.sendMessage(m.from, { text: `Please provide some text, Example usage: ${prefix + cmd} black cats` });
    }
  
    if (!query && m.messages && m.messages[0]?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quotedMsg = m.messages[0].message.extendedTextMessage.contextInfo.quotedMessage;
      query = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
    }

    const numberOfImages = 1;

    try {
      await sock.sendMessage(m.from, { text: '*Please wait, generating your image...*' });

      // Get or create user session
      const userId = m.key.remoteJid;
      if (!userSessions.has(userId)) {
        userSessions.set(userId, { query, page: 1 });
      }
      
      const session = userSessions.get(userId);
      const page = session.page;

      const endpoint = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}&page=${page}`;
      const response = await axios.get(endpoint, { 
        responseType: 'arraybuffer',
        timeout: 30000
      });

      if (response.status === 200) {
        const imageBuffer = Buffer.from(response.data, 'binary');
        
        // Send the image with buttons
        await sock.sendMessage(
          m.from, 
          { 
            image: imageBuffer, 
            caption: `Image for "${query}" (Page ${page})`,
            buttons: [
              {
                buttonId: 'img_next',
                buttonText: { displayText: '➡️ Next' },
                type: 1
              },
              {
                buttonId: 'img_new',
                buttonText: { displayText: '🔄 New Search' },
                type: 1
              },
              {
                buttonId: 'img_download',
                buttonText: { displayText: '📥 Download' },
                type: 1
              }
            ],
            footer: config.BOT_NAME || 'Image Bot',
            headerType: 4
          }
        );
        
        // React to the message if possible
        if (m.key) {
          await sock.sendMessage(m.from, { 
            react: { 
              text: "✅", 
              key: m.key 
            } 
          });
        }
      } else {
        throw new Error('Image generation failed');
      }
      
    } catch (error) {
      console.error("Error fetching images:", error);
      await sock.sendMessage(
        m.from, 
        { 
          text: '*Oops! Something went wrong while generating the image. Please try again later.*',
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
