import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

const ping = async (m, Matrix) => {
  const prefix = config.PREFIX || ".";
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
    : "";
    
  if (cmd === "ping") {
    const start = new Date().getTime();
    await m.React("📡");
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
    const text = `*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ* : ${responseTime.toFixed(2)} s`;
    
    // Create buttons
    const buttons = [
      {
        buttonId: `${prefix}owner`,
        buttonText: { displayText: "📥 Owner" },
        type: 1
      },
      {
        buttonId: `${prefix}system`,
        buttonText: { displayText: "System" },
        type: 1
      },
      {
        buttonId: `${prefix}fun-menu`,
        buttonText: { displayText: "🎉 Ping" },
        type: 1
      },
      {
        buttonId: `${prefix}alive`,
        buttonText: { displayText: "👑 Alive" },
        type: 1
      }
    ];

    // Create button message with image
    const buttonMessage = {
      image: { url: imageUrl },
      caption: text,
      footer: "CASEYRHODES AI",
      buttons: buttons,
      headerType: 4,
      viewOnce: true,
      contextInfo: {
        mentionedJid: [m.sender],
      }
    };

    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};
                             
export default ping;
