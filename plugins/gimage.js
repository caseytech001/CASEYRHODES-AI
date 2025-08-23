import axios from 'axios';
import config from '../config.cjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Store user sessions for image navigation
const userSessions = new Map();

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
    // Check if this is a navigation command (next image)
    if (m.body.toLowerCase().includes('next') || m.body === '1') {
      const userId = m.sender;
      if (userSessions.has(userId)) {
        const session = userSessions.get(userId);
        if (session.currentIndex < session.images.length - 1) {
          session.currentIndex++;
          await sock.sendMessage(m.from, { 
            image: session.images[session.currentIndex], 
            caption: `Image ${session.currentIndex + 1} of ${session.images.length}\n\nType "next" or "1" for next image\n\nPOWERED BY SULA MD`
          }, { quoted: m });
          userSessions.set(userId, session);
          return;
        } else {
          await sock.sendMessage(m.from, { 
            text: "No more images available for this search." 
          }, { quoted: m });
          userSessions.delete(userId);
          return;
        }
      }
    }

    // Handle new image search
    if (!query && !(m.quoted && m.quoted.text)) {
      return sock.sendMessage(m.from, { text: `Please provide some text, Example usage: ${prefix + cmd} black cats` });
    }
  
    if (!query && m.quoted && m.quoted.text) {
      query = m.quoted.text;
    }

    const numberOfImages = 5;

    try {
      await sock.sendMessage(m.from, { text: '*Please wait*' });

      const images = [];

      for (let i = 0; i < numberOfImages; i++) {
        const endpoint = `https://api.guruapi.tech/api/googleimage?text=${encodeURIComponent(query)}`;
        const response = await axios.get(endpoint, { responseType: 'arraybuffer' });

        if (response.status === 200) {
          const imageBuffer = Buffer.from(response.data, 'binary');
          images.push(imageBuffer);
        } else {
          throw new Error('Image generation failed');
        }
      }

      // Store the images in user session
      const userId = m.sender;
      userSessions.set(userId, {
        images: images,
        currentIndex: 0,
        query: query,
        timestamp: Date.now()
      });

      // Send only the first image with navigation instructions
      await sock.sendMessage(m.from, { 
        image: images[0], 
        caption: `Image 1 of ${images.length}\n\nType "next" or "1" for next image\n\nPOWERED BY SULA MD`
      }, { quoted: m });
      
      await m.React("✅");
      
      // Clean up old sessions periodically (optional)
      cleanUpSessions();
    } catch (error) {
      console.error("Error fetching images:", error);
      await sock.sendMessage(m.from, { text: '*Oops! Something went wrong while generating images. Please try again later.*' });
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
