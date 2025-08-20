import axios from "axios";
import config from '../config.cjs';
import pkg from "baileys-pro";
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg;

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const gpt = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const prompt = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['ai', 'gpt', 'g'];

  if (validCommands.includes(cmd)) {
    if (!prompt) {
      const buttonMessage = {
        text: `*${toFancyFont("Please give me a prompt")}`,
        footer: "Powered by Matrix",
        buttons: [
          { buttonId: `${prefix}help`, buttonText: { displayText: `${toFancyFont("Help")}` }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
      };
      
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      return;
    }

    try {
      await m.React("⏳");

      const apiUrl = `https://api.giftedtech.web.id/api/ai/gpt?apikey=gifted_api_se5dccy&q=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (data.status === 200 && data.success) {
        const answer = data.result;
        const buttonMessage = {
          text: answer,
          footer: "Powered by Matrix",
          buttons: [
            { buttonId: `${prefix}menu`, buttonText: { displayText: `${toFancyFont("Menu")}` }, type: 1 }
          ],
          headerType: 1,
          viewOnce: true
        };
        
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
        await m.React("✅");
      } else {
        throw new Error('Invalid response from the API.');
      }
    } catch (err) {
      const buttonMessage = {
        text: `*${toFancyFont("Something went wrong")}`,
        footer: "Powered by Matrix",
        buttons: [
          { buttonId: `${prefix}report`, buttonText: { displayText: `${toFancyFont("Report")}` }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
      };
      
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      console.error('Error: ', err);
      await m.React("❌");
    }
  }
};

export default gpt;
