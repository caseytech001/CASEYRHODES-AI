import axios from 'axios';
import config from '../config.cjs';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, proto } = pkg;

function toFancyFont(text, uppercase = false) {
  const fancyMap = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ',
    'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
    'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ',
    'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
  };
  
  const processedText = uppercase ? text.toUpperCase() : text.toLowerCase();
  return processedText.split('').map(char => fancyMap[char] || char).join('');
}

const gpt = async (message, sock) => {
  const prefix = config.PREFIX;
  
  // Extract text from different message types
  let text = '';
  if (message.message) {
    if (message.message.conversation) {
      text = message.message.conversation;
    } else if (message.message.extendedTextMessage && message.message.extendedTextMessage.text) {
      text = message.message.extendedTextMessage.text;
    } else if (message.message.imageMessage && message.message.imageMessage.caption) {
      text = message.message.imageMessage.caption;
    } else if (message.message.videoMessage && message.message.videoMessage.caption) {
      text = message.message.videoMessage.caption;
    }
  }
  
  if (!text.startsWith(prefix)) return;
  
  const command = text.slice(prefix.length).split(" ")[0].toLowerCase();
  const prompt = text.slice(prefix.length + command.length).trim();
  const aiCommands = ['ai', "gpt", 'g'];
  
  if (!aiCommands.includes(command)) return;
  
  if (!prompt) {
    const buttons = [
      {
        buttonId: `${prefix}help`,
        buttonText: { displayText: toFancyFont("Help") },
        type: 1
      }
    ];
    
    const buttonMessage = {
      text: `*${toFancyFont("Please give me a prompt")}*`,
      footer: 'GPT Command',
      buttons: buttons,
      headerType: 1,
      mentions: [message.key.participant || message.key.remoteJid]
    };
    
    await sock.sendMessage(message.key.remoteJid, buttonMessage);
    return;
  }
  
  try {
    await sock.sendMessage(message.key.remoteJid, {
      react: { text: '⏳', key: message.key }
    });
    
    const apiUrl = "https://api.giftedtech.web.id/api/ai/gpt?apikey=gifted_api_se5dccy&q=" + encodeURIComponent(prompt);
    const response = await axios.get(apiUrl);
    const data = response.data;
    
    if (data.status === 200 && data.success && data.result) {
      const result = data.result;
      // Split long messages to avoid character limits
      const maxLength = 4096;
      if (result.length > maxLength) {
        const parts = [];
        for (let i = 0; i < result.length; i += maxLength) {
          parts.push(result.substring(i, i + maxLength));
        }
        
        for (const part of parts) {
          await sock.sendMessage(message.key.remoteJid, { text: part });
        }
      } else {
        const buttons = [
          {
            buttonId: `${prefix}menu`,
            buttonText: { displayText: toFancyFont("Menu") },
            type: 1
          }
        ];
        
        const buttonMessage = {
          text: result,
          footer: 'GPT Response',
          buttons: buttons,
          headerType: 1,
          mentions: [message.key.participant || message.key.remoteJid],
          viewOnce: true
        };
        
        await sock.sendMessage(message.key.remoteJid, buttonMessage);
      }
      
      await sock.sendMessage(message.key.remoteJid, {
        react: { text: '✅', key: message.key }
      });
    } else {
      throw new Error(data.message || "Invalid response from the API.");
    }
  } catch (error) {
    const buttons = [
      {
        buttonId: `${prefix}report`,
        buttonText: { displayText: toFancyFont("Report") },
        type: 1
      }
    ];
    
    const buttonMessage = {
      text: `*${toFancyFont("Something went wrong")}*\nError: ${error.message}`,
      footer: 'Error',
      buttons: buttons,
      headerType: 1,
      mentions: [message.key.participant || message.key.remoteJid]
    };
    
    await sock.sendMessage(message.key.remoteJid, buttonMessage);
    
    console.error("GPT Command Error: ", error);
    
    await sock.sendMessage(message.key.remoteJid, {
      react: { text: '❌', key: message.key }
    });
  }
};

export default gpt;
