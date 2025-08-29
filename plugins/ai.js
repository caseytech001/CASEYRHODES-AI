import axios from 'axios';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys';

// Your config import (adjust path as needed)
// import config from '../config.cjs';

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
    j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
    s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
  };
  
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const gpt = async (m, Matrix) => {
  // For testing, set a default prefix if config is not available
  const prefix = config?.PREFIX || '.';
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const prompt = body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['ai', 'gpt', 'g'];

  if (validCommands.includes(cmd)) {
    if (!prompt) {
      const buttonMessage = {
        text: `*${toFancyFont("Please give me a prompt")}`,
        footer: 'GPT Assistant',
        buttons: [
          { buttonId: '.help', buttonText: { displayText: toFancyFont("Help") }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
      };
      
      await Matrix.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
      return;
    }

    try {
      // React with wait emoji
      await Matrix.sendMessage(m.key.remoteJid, { react: { text: "⏳", key: m.key } });

      const apiUrl = `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (data.status === 200 && data.success) {
        const answer = data.result;
        
        const buttonMessage = {
          text: answer,
          footer: 'GPT Response',
          buttons: [
            { buttonId: '.menu', buttonText: { displayText: toFancyFont("Menu") }, type: 1 }
          ],
          headerType: 1,
          viewOnce: true
        };
        
        await Matrix.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
        
        // React with success emoji
        await Matrix.sendMessage(m.key.remoteJid, { react: { text: "✅", key: m.key } });
      } else {
        throw new Error('Invalid response from the API.');
      }
    } catch (err) {
      console.error('Error: ', err);
      
      const buttonMessage = {
        text: `*${toFancyFont("Something went wrong. Please try again later.")}`,
        footer: 'Error',
        buttons: [
          { buttonId: '.report', buttonText: { displayText: toFancyFont("Report") }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
      };
      
      await Matrix.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
      
      // React with error emoji
      await Matrix.sendMessage(m.key.remoteJid, { react: { text: "❌", key: m.key } });
    }
  }
};

export default gpt;
