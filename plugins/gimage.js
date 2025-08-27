import axios from 'axios';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys';

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
    k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ",
    u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
    if (!query && !(m.quoted && m.quoted.text)) {
      const buttonMessage = {
        text: `*${toFancyFont("Please provide some text, Example usage: " + prefix + cmd + " black cats")}`,
        buttons: [
          { buttonId: '.help', buttonText: { displayText: toFancyFont("Help") }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
      };
      return await sock.sendMessage(m.from, buttonMessage);
    }

    if (!query && m.quoted && m.quoted.text) {
      query = m.quoted.text;
    }

    const numberOfImages = 8; // Changed to 8 as in your reference image

    try {
      // Send search initiation message
      const searchMsg = await sock.sendMessage(m.from, { 
        text: `*${toFancyFont("Search Results for:")}* ${query}\n*${toFancyFont("Found")}* ${numberOfImages} ${toFancyFont("images")}` 
      });

      // Fetch images
      const images = [];
      for (let i = 0; i < numberOfImages; i++) {
        const endpoint = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(endpoint, { responseType: 'arraybuffer' });

        if (response.status === 200) {
          const imageBuffer = Buffer.from(response.data, 'binary');
          images.push(imageBuffer);
        } else {
          throw new Error('Image generation failed');
        }
      }

      // Send images in a structured way (simulating grid layout)
      for (let i = 0; i < images.length; i++) {
        await sleep(1000); // Delay between images
        
        let caption = '';
        if (i === 0) {
          caption = `*${toFancyFont("Image")} ${i+1}*\n${toFancyFont("Search:")} ${query}\n${toFancyFont("Scroll to see more images")}`;
        } else if (i === 1) {
          caption = `*${toFancyFont("Image")} ${i+1}*\n${toFancyFont("Search:")} ${query}\n${toFancyFont("Scroll to see more")}`;
        } else if (i === images.length - 1) {
          caption = `*${toFancyFont("Image")} ${i+1}*\n${toFancyFont("View Original")}`;
        } else {
          caption = `*${toFancyFont("Image")} ${i+1}*`;
        }
        
        await sock.sendMessage(
          m.from, 
          { 
            image: images[i], 
            caption: caption,
            mentions: [m.sender]
          }, 
          { quoted: i === 0 ? searchMsg : null }
        );
      }

      // Send final options message
      const templateButtons = [
        { index: 1, urlButton: { displayText: 'View Original', url: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch` }},
        { index: 2, quickReplyButton: { displayText: 'Search Again', id: `${prefix}image ${query}` }}
      ];

      await sock.sendMessage(m.from, {
        text: `*${toFancyFont("Search Complete")}*\n\n${toFancyFont("Found")} ${images.length} ${toFancyFont("images for")} "${query}"`,
        footer: 'Use buttons below for more options',
        templateButtons: templateButtons,
        headerType: 1
      });

      // React to the original message
      await sock.sendMessage(m.from, {
        react: {
          text: "✅",
          key: m.key
        }
      });
      
    } catch (error) {
      console.error("Error fetching images:", error);
      
      const buttonMessage = {
        text: `*${toFancyFont("Oops! Something went wrong while generating images. Please try again later.")}*`,
        buttons: [
          { buttonId: '.report', buttonText: { displayText: toFancyFont("Report") }, type: 1 }
        ],
        headerType: 1
      };
      
      await sock.sendMessage(m.from, buttonMessage);
    }
  }
};

export default imageCommand;
