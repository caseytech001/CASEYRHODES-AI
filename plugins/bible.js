import config from '../config.cjs';
import fetch from 'node-fetch';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from "baileys";

function toFancyFont(text) {
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
  return text
    .toLowerCase()
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const bibleCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'bible') {
    try {
      // Check if the book name was provided
      if (!text) {
        const buttons = [
          {
            buttonId: `.menu`,
            buttonText: { displayText: `${toFancyFont("Menu")}` },
            type: 1,
          },
        ];
        
        const buttonMessage = {
          text: `*${toFancyFont("Please specify the book, chapter, and verse. Example: bible john 3:16")}*`,
          buttons: buttons,
          headerType: 1,
          mentions: [m.sender]
        };
        
        return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      }

      // Set the reference for the API call
      const reference = encodeURIComponent(text);

      // Fetch Bible data from the API
      const response = await fetch(`https://bible-api.com/${reference}`);
      const data = await response.json();

      // Check if the data is valid
      if (!data || !data.reference) {
        const buttons = [
          {
            buttonId: `.menu`,
            buttonText: { displayText: `${toFancyFont("Menu")}` },
            type: 1,
          },
        ];
        
        const buttonMessage = {
          text: `*${toFancyFont("Invalid reference. Example: bible john 3:16.")}*`,
          buttons: buttons,
          headerType: 1,
          mentions: [m.sender]
        };
        
        return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      }

      // Extract Bible verse information
      const verses = data.verses ? data.verses.length : 1;
      const contentText = data.text;
      const language = data.translation_name;

      // Create the response message
      const message = `*${toFancyFont("Demon Slayer Bible")}*\n\n*${toFancyFont("Reading:")}* ${data.reference}\n*${toFancyFont("Verse:")}* ${verses}\n\n*${toFancyFont("Read:")}*\n${contentText}\n\n*${toFancyFont("Translation:")}* ${language}`;

      // Create buttons
      const buttons = [
        {
          buttonId: `.bible ${text}`,
          buttonText: { displayText: `${toFancyFont("Read Again")}` },
          type: 1,
        },
        {
          buttonId: `.menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
      ];

      // Send the response message
      const buttonMessage = {
        text: message,
        buttons: buttons,
        headerType: 1,
        mentions: [m.sender]
      };
      
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });

    } catch (error) {
      console.error("Error occurred:", error);
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      
      const buttonMessage = {
        text: `*${toFancyFont("An error occurred while fetching the Bible verse. Please try again later.")}*`,
        buttons: buttons,
        headerType: 1,
        mentions: [m.sender]
      };
      
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }
  }
};

export default bibleCommand;
