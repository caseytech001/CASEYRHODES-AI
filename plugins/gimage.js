import axios from 'axios';
import config from '../config.cjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Store user sessions for image navigation
const userSessions = new Map();

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const body = m.messages ? m.messages[0]?.message : m;
  const text = body?.conversation || body?.extendedTextMessage?.text || '';
  const cmd = text.startsWith(prefix) ? text.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = text.startsWith(prefix) ? text.slice(prefix.length + cmd.length).trim() : '';

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
    // Check if this is a navigation command (next image)
    if (text.toLowerCase().includes('next') || text === '1') {
      const userId = m.sender || m.key.remoteJid;
      if (userSessions.has(userId)) {
        const session = userSessions.get(userId);
        if (session.currentIndex < session.images.length - 1) {
          session.currentIndex++;
          await sock.sendMessage(m.key.remoteJid, { 
            image: session.images[session.currentIndex], 
            caption: `Image ${session.currentIndex + 1} of ${session.images.length}\n\nType "next" or "1" for next image\n\nPOWERED BY SULA MD`
          }, { quoted: m });
          userSessions.set(userId, session);
          return;
        } else {
          await sock.sendMessage(m.key.remoteJid, { 
            text: "No more images available for this search." 
          }, { quoted: m });
          userSessions.delete(userId);
          return;
        }
      }
    }

    // Handle new image search
    if (!query) {
      // Check if there's quoted message text
      const quotedMsg = m.messages?.[0]?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text;
      
      if (quotedText) {
        query = quotedText;
      } else {
        return sock.sendMessage(m.key.remoteJid, { text: `Please provide some text, Example usage: ${prefix + cmd} black cats` });
      }
    }

    const numberOfImages = 5;

    try {
      await sock.sendMessage(m.key.remoteJid, { text: '*Please wait*' });

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

      // Store the images in user session
      const userId = m.sender || m.key.remoteJid;
      userSessions.set(userId, {
        images: images,
        currentIndex: 0,
        query: query,
        timestamp: Date.now()
      });

      // Send only the first image with navigation instructions
      await sock.sendMessage(m.key.remoteJid, { 
        image: images[0], 
        caption: `Image 1 of ${images.length}\n\nType "next" or "1" for next image\n\nPOWERED BY SULA MD`
      }, { quoted: m });
      
      // Clean up old sessions periodically
      cleanUpSessions();
    } catch (error) {
      console.error("Error fetching images:", error);
      await sock.sendMessage(m.key.remoteJid, { text: '*Oops! Something went wrong while generating images. Please try again later.*' });
    }
  }
};

// Clean up old sessions to prevent memory leaks
function cleanUpSessions() {
  const now = Date.now();
  for (const [userId, session] of userSessions.entries()) {
    if (now - session.timestamp > 30 * 60 * 1000) { // 30 minutes
      userSessions.delete(userId);
    }
  }
}

export default imageCommand;
