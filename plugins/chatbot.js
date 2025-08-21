import axios from 'axios';
import config from '../config.cjs';
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

// Groq API configuration
const GROQ_API_KEY = 'gifted'; // Replace with your actual API key if different
const GROQ_API_URL = 'https://api.giftedtech.co.ke/api/ai/groq-beta';

// Response cache to avoid duplicate processing
const messageCache = new Set();

// Global chatbot state (true = enabled, false = disabled)
let chatbotEnabled = true;

// User-specific chatbot states (for per-user control)
const userChatbotStates = new Map();

async function getGroqResponse(prompt) {
  try {
    const response = await axios.get(`${GROQ_API_URL}?apikey=${GROQ_API_KEY}&q=${encodeURIComponent(prompt)}`);
    return response.data?.result || "I couldn't process that request. Please try again.";
  } catch (error) {
    console.error('Groq API Error:', error);
    return "Sorry, I'm having trouble connecting to the AI service.";
  }
}

const chatbotHandler = async (m, Matrix) => {
  const sender = m.participant || m.key.participant;
  const isGroup = m.key.remoteJid.includes('@g.us');
  
  // Ignore messages from status broadcasts or cached messages
  if (m.key.remoteJid.endsWith('@broadcast') || messageCache.has(m.key.id)) {
    return;
  }

  // Add message to cache to prevent duplicate processing
  messageCache.add(m.key.id);
  
  // Clean the cache periodically
  if (messageCache.size > 100) {
    messageCache.clear();
  }

  try {
    const messageText = m.message?.conversation || 
                       m.message?.extendedTextMessage?.text || 
                       '';

    // Check for chatbot toggle commands
    if (messageText.startsWith(config.PREFIX)) {
      const command = messageText.slice(config.PREFIX.length).trim().toLowerCase();
      
      if (command === 'chatbot on' || command === 'ai on') {
        if (isGroup) {
          userChatbotStates.set(m.key.remoteJid, true);
          await Matrix.sendMessage(m.key.remoteJid, { 
            text: "🤖 *ChatBot Enabled*\n\nAI responses are now active in this group!"
          }, { quoted: m });
        } else {
          chatbotEnabled = true;
          await Matrix.sendMessage(m.key.remoteJid, { 
            text: "🤖 *ChatBot Enabled*\n\nAI responses are now active!"
          }, { quoted: m });
        }
        return;
      }
      
      if (command === 'chatbot off' || command === 'ai off') {
        if (isGroup) {
          userChatbotStates.set(m.key.remoteJid, false);
          await Matrix.sendMessage(m.key.remoteJid, { 
            text: "🤖 *ChatBot Disabled*\n\nAI responses are now turned off in this group!"
          }, { quoted: m });
        } else {
          chatbotEnabled = false;
          await Matrix.sendMessage(m.key.remoteJid, { 
            text: "🤖 *ChatBot Disabled*\n\nAI responses are now turned off!"
          }, { quoted: m });
        }
        return;
      }
      
      if (command === 'chatbot status' || command === 'ai status') {
        let status;
        if (isGroup) {
          status = userChatbotStates.get(m.key.remoteJid) !== false;
        } else {
          status = chatbotEnabled;
        }
        
        await Matrix.sendMessage(m.key.remoteJid, { 
          text: `🤖 *ChatBot Status:* ${status ? 'ENABLED ✅' : 'DISABLED ❌'}\n\nUse *${config.PREFIX}chatbot on* to enable\nUse *${config.PREFIX}chatbot off* to disable`
        }, { quoted: m });
        return;
      }
    }

    // Check if chatbot is disabled (globally or for this group)
    const isChatbotDisabled = isGroup 
      ? userChatbotStates.get(m.key.remoteJid) === false 
      : !chatbotEnabled;

    if (isChatbotDisabled) {
      return;
    }

    // Ignore empty messages or commands with prefix
    if (!messageText || messageText.startsWith(config.PREFIX)) {
      return;
    }

    // Show typing indicator
    await Matrix.sendPresenceUpdate('composing', m.key.remoteJid);

    // Get response from Groq API
    const aiResponse = await getGroqResponse(messageText);

    // Send the response with a menu button
    const buttonMessage = {
      text: aiResponse,
      footer: `🤖 AI ChatBot | Status: ${chatbotEnabled ? 'ON' : 'OFF'}`,
      buttons: [
        { buttonId: 'menu', buttonText: { displayText: '📋 Menu' }, type: 1 },
        { buttonId: 'ai off', buttonText: { displayText: '❌ AI Off' }, type: 1 },
        { buttonId: 'ai on', buttonText: { displayText: '✅ AI On' }, type: 1 }
      ],
      headerType: 1
    };

    await Matrix.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });

  } catch (error) {
    console.error('Chatbot Error:', error);
    // Optionally send an error message
    await Matrix.sendMessage(m.key.remoteJid, { 
      text: "Sorry, I encountered an error processing your message. Please try again." 
    }, { quoted: m });
  }
};

// Export both the handler and the state for external control
export { chatbotHandler, chatbotEnabled, userChatbotStates };
export default chatbotHandler;
