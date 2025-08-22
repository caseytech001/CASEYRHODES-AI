import { downloadMediaMessage } from "@whiskeysockets/baileys";
import Jimp from "jimp";
import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

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

const setProfilePicture = async (m, Matrix) => {
  try {
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const isBot = m.sender === botNumber;
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";

    if (cmd !== "fullpp") return;

    if (!isBot) {
      const buttons = [
        {
          buttonId: `.owner`,
          buttonText: { displayText: `${toFancyFont("Contact Owner")}` },
          type: 1,
        },
      ];
      
      const buttonMessage = {
        text: `*${toFancyFont("Get lost, poser! Only Toxic-MD itself can flex this command!")}`,
        footer: null,
        buttons: buttons,
        headerType: 1,
        viewOnce: true,
        mentions: [m.sender]
      };
      
      return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    if (!m.quoted?.message?.imageMessage) {
      const buttons = [
        {
          buttonId: `.help`,
          buttonText: { displayText: `${toFancyFont("Help")}` },
          type: 1,
        },
      ];
      
      const buttonMessage = {
        text: `*${toFancyFont("Yo, dumbass, reply to a damn image for Aira's glow-up!")}`,
        footer: null,
        buttons: buttons,
        headerType: 1,
        viewOnce: true,
        mentions: [m.sender]
      };
      
      return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } }); // Loading reaction

    let media;
    for (let i = 0; i < 3; i++) {
      try {
        media = await downloadMediaMessage(m.quoted, "buffer", {});
        if (media) break;
      } catch (error) {
        if (i === 2) {
          await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
          
          const buttons = [
            {
              buttonId: `.report`,
              buttonText: { displayText: `${toFancyFont("Report")}` },
              type: 1,
            },
          ];
          
          const buttonMessage = {
            text: `*${toFancyFont("Aira can't grab that image, fam! Shit's broken, try again!")}`,
            footer: null,
            buttons: buttons,
            headerType: 1,
            viewOnce: true,
            mentions: [m.sender]
          };
          
          return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
        }
      }
    }

    const image = await Jimp.read(media);
    if (!image) throw new Error("Invalid image format");

    const size = Math.max(image.bitmap.width, image.bitmap.height);
    if (image.bitmap.width !== image.bitmap.height) {
      image.cover(size, size, 0x000000FF);
    }

    image.resize(640, 640);
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    await Matrix.updateProfilePicture(botNumber, buffer);
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    const buttons = [
      {
        buttonId: `.menu`,
        buttonText: { displayText: `${toFancyFont("Menu")}` },
        type: 1,
      },
    ];
    
    const buttonMessage = {
      text: `*${toFancyFont("Aira's new drip is fuckin'")}*\n*${toFancyFont("Profile pic set, boss!")}`,
      footer: null,
      buttons: buttons,
      headerType: 1,
      viewOnce: true,
      mentions: [m.sender]
    };
    
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  } catch (error) {
    console.error(`❌ Fullpp error: ${error.message}`);
    await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
    
    const buttons = [
      {
        buttonId: `.report`,
        buttonText: { displayText: `${toFancyFont("Report")}` },
        type: 1,
      },
    ];
    
    const buttonMessage = {
      text: `*${toFancyFont("Njabulo Jb fucked up settin' that pic, fam! Try again, you got this!")}`,
      footer: null,
      buttons: buttons,
      headerType: 1,
      viewOnce: true,
      mentions: [m.sender]
    };
    
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};

export default setProfilePicture;
