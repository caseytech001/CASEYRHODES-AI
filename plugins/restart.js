import config from '../config.cjs';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from "@whiskeysockets/baileys";

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

const restartBot = async (m) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'restart') {
    try {
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `📃${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      
      const messageOptions = {
        viewOnce: true,
        buttons,
        mentions: [m.sender], // Changed from contextInfo.mentionedJid to mentions
      };
      
      await m.reply(`*${toFancyFont("Restarting...")}*`, messageOptions);
      process.exit(0); // Fixed: removed await from process.exit
    } catch (error) {
      console.error(error);
      await m.react("❌");
      
      const buttons = [
        {
          buttonId: `.report`,
          buttonText: { displayText: `⚠︎${toFancyFont("Report")}` },
          type: 1,
        },
      ];
      
      const messageOptions = {
        viewOnce: true,
        buttons,
        mentions: [m.sender], // Changed from contextInfo.mentionedJid to mentions
      };
      
      return m.reply(`*${toFancyFont("An error occurred while restarting the bot: " + error.message)}*`, messageOptions);
    }
  }
};

export default restartBot;
