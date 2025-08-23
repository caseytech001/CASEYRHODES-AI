import config from '../config.cjs';
import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessage, prepareWAMessageMedia, proto } = pkg;

function toFancyFont(text) {
  // ... (keep existing toFancyFont function unchanged)
}

const bibleCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'bible') {
    try {
      if (!text) {
        const buttonMessage = {
          text: `*${toFancyFont("Please specify the book, chapter, and verse. Example: bible john 3:16")}*`,
          buttons: [
            { buttonId: '.menu', buttonText: { displayText: toFancyFont("Menu") }, type: 1 }
          ],
          mentions: [m.sender],
          headerType: 1
        };
        return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      }

      const reference = encodeURIComponent(text);
      const response = await fetch(`https://bible-api.com/${reference}`);
      const data = await response.json();

      if (!data || !data.reference) {
        const buttonMessage = {
          text: `*${toFancyFont("Invalid reference. Example: bible john 3:16.")}*`,
          buttons: [
            { buttonId: '.menu', buttonText: { displayText: toFancyFont("Menu") }, type: 1 }
          ],
          mentions: [m.sender],
          headerType: 1
        };
        return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      }

      const verses = data.verses ? data.verses.length : 1;
      const message = `*${toFancyFont("Caseyrhodes Bible")}*\n\n*${toFancyFont("Reading:")}* ${data.reference}\n*${toFancyFont("Verse:")}* ${verses}\n\n*${toFancyFont("Read:")}*\n${data.text}\n\n*${toFancyFont("Translation:")}* ${data.translation_name}`;

      const buttonMessage = {
        text: message,
        buttons: [
          { buttonId: `.bible ${text}`, buttonText: { displayText: toFancyFont("Read Again") }, type: 1 },
          { buttonId: '.menu', buttonText: { displayText: toFancyFont("Menu") }, type: 1 }
        ],
        mentions: [m.sender],
        headerType: 1
      };

      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });

    } catch (error) {
      console.error("Error occurred:", error);
      const buttonMessage = {
        text: `*${toFancyFont("An error occurred while fetching the Bible verse. Please try again later.")}*`,
        buttons: [
          { buttonId: '.menu', buttonText: { displayText: toFancyFont("Menu") }, type: 1 }
        ],
        mentions: [m.sender],
        headerType: 1
      };
      Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }
  }
};

export default bibleCommand;
