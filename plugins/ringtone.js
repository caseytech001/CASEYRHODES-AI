import axios from 'axios';
import config from '../config.cjs';

const ringtone = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body.slice(prefix.length + cmd.length).trim().split(/\s+/).filter(Boolean);
  const query = args.join(" ");

  if (!['ringtone', 'ringtones', 'ring'].includes(cmd)) return;

  if (!query) {
    return Matrix.sendMessage(m.from, { text: "❌ Please provide a search query!\nExample: *.ringtone Suna*" }, { quoted: m });
  }

  await m.React('🎵');
  await Matrix.sendMessage(m.from, { text: `🎵 Searching ringtone for: *${query}*...` }, { quoted: m });

  try {
    const { data } = await axios.get(`https://www.dark-yasiya-api.site/download/ringtone?text=${encodeURIComponent(query)}`);

    if (!data.status || !data.result || data.result.length === 0) {
      return Matrix.sendMessage(m.from, { text: "❌ No ringtones found for your query. Please try a different keyword." }, { quoted: m });
    }

    const randomRingtone = data.result[Math.floor(Math.random() * data.result.length)];
    
    // Send buttons to choose between audio or document
    const buttonMessage = {
      text: `🎵 Found: *${randomRingtone.title}*\n\nChoose how you want to receive it:`,
      footer: "Ringtone Downloader",
      buttons: [
        { buttonId: 'audio', buttonText: { displayText: '🎧 Audio (Play)' }, type: 1 },
        { buttonId: 'document', buttonText: { displayText: '📁 Document (Save)' }, type: 1 }
      ],
      headerType: 1,
      contextInfo: {
        mentionedJid: [m.sender]
      }
    };
    
    // Store the ringtone data temporarily for button response
    if (!global.ringtoneData) global.ringtoneData = {};
    global.ringtoneData[m.sender] = randomRingtone;
    
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });

  } catch (error) {
    console.error("Error in ringtone command:", error);
    Matrix.sendMessage(m.from, { text: "❌ Something went wrong while fetching the ringtone. Please try again later." }, { quoted: m });
  }
};

// Handle button responses
const handleRingtoneButton = async (m, Matrix) => {
  // Check if it's a button response
  if (!m.message?.buttonsResponseMessage) return;
  
  const buttonId = m.message.buttonsResponseMessage.selectedButtonId;
  const sender = m.sender;
  
  // Check if we have stored ringtone data for this user
  if (!global.ringtoneData || !global.ringtoneData[sender]) {
    return Matrix.sendMessage(m.from, { text: "❌ No ringtone request found. Please search for a ringtone first." }, { quoted: m });
  }
  
  const ringtone = global.ringtoneData[sender];
  
  try {
    if (buttonId === 'audio') {
      // Send as audio
      await Matrix.sendMessage(m.from, {
        audio: { url: ringtone.dl_link },
        mimetype: "audio/mpeg",
        fileName: `${ringtone.title}.mp3`,
        contextInfo: {
          mentionedJid: [m.sender]
        }
      }, { quoted: m });
    } else if (buttonId === 'document') {
      // Send as document
      await Matrix.sendMessage(m.from, {
        document: { url: ringtone.dl_link },
        mimetype: "audio/mpeg",
        fileName: `${ringtone.title}.mp3`,
        contextInfo: {
          mentionedJid: [m.sender]
        }
      }, { quoted: m });
    } else {
      // Handle unknown button ID
      return Matrix.sendMessage(m.from, { text: "❌ Invalid selection. Please try again." }, { quoted: m });
    }
    
    // Clean up stored data
    delete global.ringtoneData[sender];
    
  } catch (error) {
    console.error("Error handling ringtone button:", error);
    Matrix.sendMessage(m.from, { text: "❌ Something went wrong while processing your request." }, { quoted: m });
    
    // Clean up stored data even if there's an error
    if (global.ringtoneData && global.ringtoneData[sender]) {
      delete global.ringtoneData[sender];
    }
  }
};

// Export both functions
export { ringtone, handleRingtoneButton };
