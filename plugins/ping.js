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
    
    // Create buttons using the proper structure
    const buttons = [
      {
        index: 1,
        urlButton: {
          displayText: "📂 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴꜱ",
          url: "https://example.com/menu" // Replace with your actual URL
        }
      },
      {
        index: 2,
        quickReplyButton: {
          displayText: "📶 Ping Again",
          id: `${prefix}ping`
        }
      }
    ];

    // Alternative approach using template buttons
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

    const messageOptions = {
      caption: text,
      footer: "Tap a button below",
      buttons: templateButtons,
      headerType: 4, // For image message
      viewOnce: true,
      mentions: [m.sender]
    };

    try {
      // Send message with image and buttons
      await Matrix.sendMessage(m.from, {
        image: { url: imageUrl },
        ...messageOptions
      }, { quoted: m });
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
