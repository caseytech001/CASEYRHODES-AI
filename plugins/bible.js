import config from '../config.cjs';
import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessage, prepareWAMessageMedia, proto } = pkg;

function toFancyFont(text) {
  const fancyMap = {
    a: '𝖺', b: '𝖻', c: '𝖼', d: '𝖽', e: '𝖾', f: '𝖿', g: '𝗀', h: '𝗁', i: '𝗂',
    j: '𝗃', k: '𝗄', l: '𝗅', m: '𝗆', n: '𝗇', o: '𝗈', p: '𝗉', q: '𝗊', r: '𝗋',
    s: '𝗌', t: '𝗍', u: '𝗎', v: '𝗏', w: '𝗐', x: '𝗑', y: '𝗒', z: '𝗓',
    A: '𝖠', B: '𝖡', C: '𝖢', D: '𝖣', E: '𝖤', F: '𝖥', G: '𝖦', H: '𝖧', I: '𝖨',
    J: '𝖩', K: '𝖪', L: '𝖫', M: '𝖬', N: '𝖭', O: '𝖮', P: '𝖯', Q: '𝖰', R: '𝖱',
    S: '𝖲', T: '𝖳', U: '𝖴', V: '𝖵', W: '𝖶', X: '𝖷', Y: '𝖸', Z: '𝖹',
    0: '𝟢', 1: '𝟣', 2: '𝟤', 3: '𝟥', 4: '𝟦', 5: '𝟧', 6: '𝟨', 7: '𝟩', 8: '𝟪', 9: '𝟫'
  };
  
  return text.split('').map(char => fancyMap[char] || char).join('');
}

// Image fetch utility
async function fetchMenuImage() {
  const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

const bibleCommand = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    if (cmd !== 'bible') return;

    if (!text) {
      const buttonMessage = {
        text: `*${toFancyFont("Please specify the book, chapter, and verse. Example: bible john 3:16")}*`,
        footer: config.FOOTER,
        buttons: [
          { buttonId: `${prefix}menu`, buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, type: 1 }
        ],
        mentions: [m.sender],
        headerType: 1
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const reference = encodeURIComponent(text);
    const response = await fetch(`https://bible-api.com/${reference}`);
    const data = await response.json();

    if (!data || data.error || !data.reference) {
      const buttonMessage = {
        text: `*${toFancyFont("Invalid reference. Example: bible john 3:16.")}*`,
        footer: config.FOOTER,
        buttons: [
          { buttonId: `${prefix}menu`, buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, type: 1 }
        ],
        mentions: [m.sender],
        headerType: 1
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const verses = data.verses ? data.verses.length : 1;
    const message = `*${toFancyFont("Caseyrhodes Bible")}*\n\n*${toFancyFont("Reading:")}* ${data.reference}\n*${toFancyFont("Verse:")}* ${verses}\n\n*${toFancyFont("Read:")}*\n${data.text}\n\n*${toFancyFont("Translation:")}* ${data.translation_name}`;

    // Fetch the image
    const imageBuffer = await fetchMenuImage();
    
    if (imageBuffer) {
      try {
        // Prepare image media
        const imageMessage = await prepareWAMessageMedia(
          { image: imageBuffer },
          { upload: Matrix.waUploadToServer }
        );
        
        // Create message with image
        const buttonMessage = {
          image: imageMessage.image,
          caption: message,
          footer: config.FOOTER,
          buttons: [
            { buttonId: `${prefix}bible ${text}`, buttonText: { displayText: `📖 ${toFancyFont("Read Again")}` }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, type: 1 }
          ],
          mentions: [m.sender],
          headerType: 4
        };
        
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      } catch (imageError) {
        console.error("Error preparing image:", imageError);
        // Fallback to text message if image processing fails
        const buttonMessage = {
          text: message,
          footer: config.FOOTER,
          buttons: [
            { buttonId: `${prefix}bible ${text}`, buttonText: { displayText: `📖 ${toFancyFont("Read Again")}` }, type: 1 },
            { buttonId: `${prefix}menu`, buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, type: 1 }
          ],
          mentions: [m.sender],
          headerType: 1
        };
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      }
    } else {
      // Fallback to text message if image fails
      const buttonMessage = {
        text: message,
        footer: config.FOOTER,
        buttons: [
          { buttonId: `${prefix}bible ${text}`, buttonText: { displayText: `📖 ${toFancyFont("Read Again")}` }, type: 1 },
          { buttonId: `${prefix}menu`, buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, type: 1 }
        ],
        mentions: [m.sender],
        headerType: 1
      };
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

  } catch (error) {
    console.error("Error occurred in bible command:", error);
    const buttonMessage = {
      text: `*${toFancyFont("An error occurred while fetching the Bible verse. Please try again later.")}*`,
      footer: config.FOOTER,
      buttons: [
        { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, type: 1 }
      ],
      mentions: [m.sender],
      headerType: 1
    };
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};

export default bibleCommand;
