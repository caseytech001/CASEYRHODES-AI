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
    await m.React("✅");
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
    const text = `*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ* : ${responseTime.toFixed(2)} s`;
    
    // Create template buttons
    const templateButtons = [
      {
        index: 1,
        quickReplyButton: {
          displayText: "📂 Menu Options",
          id: `${prefix}menu`
        }
      },
      {
        index: 2,
        quickReplyButton: {
          displayText: "👑 Owner",
          id: `${prefix}owner`
        }
      },
      {
        index: 3,
        quickReplyButton: {
          displayText: "📶 Ping",
          id: `${prefix}ping`
        }
      }
    ];

    try {
      // Send message with image and buttons using the proper WA proto
      const message = {
        image: { url: imageUrl },
        caption: text,
        footer: "Tap a button below",
        templateButtons: templateButtons,
        headerType: 4,
        mentions: [m.sender]
      };
      
      await Matrix.sendMessage(m.from, message, { quoted: m });
    } catch (error) {
      console.error("Error sending message:", error);
      // Fallback to text message if image fails
      await Matrix.sendMessage(m.from, {
        text: text + "\n\n" + "📂 Menu Options - " + `${prefix}menu` + 
              "\n👑 Owner - " + `${prefix}owner` +
              "\n📶 Ping - " + `${prefix}ping`,
        mentions: [m.sender]
      }, { quoted: m });
    }
  }
};

export default ping;
