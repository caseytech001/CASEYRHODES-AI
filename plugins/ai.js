import axios from 'axios';
import config from '../config.cjs';
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

function toFancyFont(text) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
    y: "ʏ", z: "ᴢ",
  };
  return text.toLowerCase().split('').map(char => fonts[char] || char).join('');
}

const aiMenu = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const prompt = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['ai', 'gpt', 'openai', 'deepseek', 'bing', 'marisel', 'groq', 'gpt4', 'gemini', 'deepimg'];
  const aiSubCommands = ['ai-menu'];

  if (aiSubCommands.includes(cmd)) {
    const menuResponse = `
*🤖 AI Menu*

┏──────────────⊷
┊ .ᴀɪ
┊ .ɢᴘᴛ
┊ .ᴏᴘᴇɴᴀɪ
┊ .ᴅᴇᴇᴘsᴇᴇᴋ
┊ .ɢʀᴏϙ
┊ .ɢᴘᴛ4
┊ .ɢᴇᴍɪɴɪ
┊ .ᴅᴇᴇᴘɪᴍɢ
┗──────────────⊷
`;

    const buttons = [
      { buttonId: `${prefix}ai`, buttonText: { displayText: '🔹 ᴀɪ' }, type: 1 },
      { buttonId: `${prefix}gpt`, buttonText: { displayText: '🔹 ɢᴘᴛ' }, type: 1 },
      { buttonId: `${prefix}groq`, buttonText: { displayText: '🔹 ɢʀᴏϙ' }, type: 1 },
      { buttonId: `${prefix}gpt4`, buttonText: { displayText: '🔹 ɢᴘᴛ4' }, type: 1 },
      { buttonId: `${prefix}menu`, buttonText: { displayText: '🔙 ᴍᴇɴᴜ' }, type: 1 }
    ];

    await Matrix.sendMessage(m.from, { 
      text: menuResponse,
      buttons,
      headerType: 1
    }, { quoted: m });
    return;
  }

  if (validCommands.includes(cmd)) {
    if (!prompt) {
      const buttons = [
        { buttonId: `${prefix}ai-menu`, buttonText: { displayText: '📜 ᴀɪ ᴍᴇɴᴜ' }, type: 1 },
        { buttonId: `${prefix}menu`, buttonText: { displayText: '🔙 ᴍᴇɴᴜ' }, type: 1 }
      ];

      await Matrix.sendMessage(m.from, { 
        text: `*${toFancyFont("Please provide a prompt")}*\n\n*Example:* ${prefix}ai Explain quantum physics`,
        buttons,
        headerType: 1
      }, { quoted: m });
      return;
    }

    try {
      await Matrix.sendPresenceUpdate('composing', m.from);
      
      let apiUrl;
      switch (cmd) {
        case 'groq':
          apiUrl = `https://api.giftedtech.co.ke/api/ai/groq-beta?apikey=gifted&q=${encodeURIComponent(prompt)}`;
          break;
        case 'gpt4':
          apiUrl = `https://api.giftedtech.co.ke/api/ai/gpt4?apikey=gifted&q=${encodeURIComponent(prompt)}`;
          break;
        case 'gemini':
          apiUrl = `https://api.giftedtech.co.ke/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(prompt)}`;
          break;
        case 'deepimg':
          apiUrl = `https://api.giftedtech.co.ke/api/ai/deepimg?apikey=gifted&prompt=${encodeURIComponent(prompt)}`;
          break;
        case 'gpt':
          apiUrl = `https://api.giftedtech.web.id/api/ai/gpt?apikey=gifted_api_se5dccy&q=${encodeURIComponent(prompt)}`;
          break;
        case 'openai':
          apiUrl = `https://vapis.my.id/api/openai?q=${encodeURIComponent(prompt)}`;
          break;
        case 'deepseek':
          apiUrl = `https://api.giftedtech.co.ke/api/ai/deepseek-v3?apikey=gifted&q=${encodeURIComponent(prompt)}`;
          break;
        default:
          apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(prompt)}`;
      }

      const { data } = await axios.get(apiUrl);
      const answer = cmd === 'deepimg' 
        ? (data.imageUrl ? `*🖼️ Image Generated:*\n${data.imageUrl}` : "Failed to generate image")
        : data.result || data.message || data.answer || "No response from AI";

      const buttons = [
        { buttonId: `${prefix}${cmd} ${prompt}`, buttonText: { displayText: '🔄 ʀᴇɢᴇɴᴇʀᴀᴛᴇ' }, type: 1 },
        { buttonId: `${prefix}ai-menu`, buttonText: { displayText: '📜 ᴀɪ ᴍᴇɴᴜ' }, type: 1 }
      ];

      await Matrix.sendMessage(m.from, { 
        text: `*${toFancyFont(cmd)} ${cmd === 'deepimg' ? 'ɪᴍᴀɢᴇ' : 'ʀᴇsᴘᴏɴsᴇ'}*\n\n${answer}\n\n${toFancyFont('powered by njabulo jb')}`,
        buttons,
        headerType: 1
      }, { quoted: m });

    } catch (err) {
      console.error('AI Error:', err);
      const buttons = [
        { buttonId: `${prefix}report`, buttonText: { displayText: '⚠️ ʀᴇᴘᴏʀᴛ' }, type: 1 },
        { buttonId: `${prefix}menu`, buttonText: { displayText: '🔙 ᴍᴇɴᴜ' }, type: 1 }
      ];

      await Matrix.sendMessage(m.from, { 
        text: `*${toFancyFont("ai service error")}*\n\n${toFancyFont("please try again later")}`,
        buttons,
        headerType: 1
      }, { quoted: m });
    }
  }
};

export default aiMenu;
