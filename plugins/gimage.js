import axios from 'axios';
import config from '../config.cjs';

// Store user sessions for image searches
const userSessions = new Map();

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
      const maxImages = Math.min(results.length, 10);
      
      // Store the search results in user session
      userSessions.set(m.sender, {
        query,
        images: results,
        currentIndex: 0,
        maxImages,
        timestamp: Date.now()
      });

      // Send only the first image with next button
      await sendImageWithNextButton(m, sock, 0, query, results, maxImages);

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

// Function to send image with next button
async function sendImageWithNextButton(m, sock, index, query, images, maxImages) {
  const imageUrl = images[index];
  
  const caption = `
╭───[ *ɪᴍᴀɢᴇ sᴇᴀʀᴄʜ* ]───
├ *ǫᴜᴇʀʏ*: ${query} 🔍
├ *ʀᴇsᴜʟᴛ*: ${index + 1} of ${maxImages} 🖼️
╰───[ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs* ]───

Click *Next* button below for the next image or type *next*`;

  // Create button message with next button
  const buttonMessage = {
    image: { url: imageUrl },
    caption: caption,
    footer: 'Image Search',
    buttons: [
      { buttonId: 'next', buttonText: { displayText: 'Next ▶️' }, type: 1 }
    ],
    headerType: 4,
    contextInfo: { mentionedJid: [m.sender] }
  };

  await sock.sendMessage(m.from, buttonMessage, { quoted: m });
}

// Handle button responses and next command
const handleNextImage = async (m, sock) => {
  const text = m.body?.toLowerCase()?.trim();
  const isButtonResponse = m?.message?.buttonsResponseMessage;
  
  // Check if it's a button response or text command
  if ((isButtonResponse && isButtonResponse.selectedButtonId === 'next') || text === 'next') {
    const session = userSessions.get(m.sender);
    
    // Clean up old sessions (older than 10 minutes)
    const now = Date.now();
    for (const [key, value] of userSessions.entries()) {
      if (now - value.timestamp > 600000) { // 10 minutes
        userSessions.delete(key);
      }
    }
    
    if (!session) {
      return sock.sendMessage(m.from, { text: '❌ No active image search session. Please search for images first.' });
    }
    
    const { query, images, currentIndex, maxImages } = session;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= maxImages) {
      userSessions.delete(m.sender); // Clear session
      return sock.sendMessage(m.from, { text: `❌ No more images available for "${query}"` });
    }
    
    // Update session with new index
    userSessions.set(m.sender, {
      ...session,
      currentIndex: nextIndex,
      timestamp: Date.now() // Update timestamp
    });
    
    // Send next image
    await sendImageWithNextButton(m, sock, nextIndex, query, images, maxImages);
  }
};

// Export both commands
export { imageCommand, handleNextImage };
