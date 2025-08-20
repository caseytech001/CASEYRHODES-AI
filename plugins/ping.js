import config from "../config.cjs";
import pkg, { prepareWAMessageMedia } from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

// Precompute static data outside the function
const prefix = config.PREFIX || ".";
const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
const buttons = [
  {
    buttonId: "action",
    buttonText: { displayText: "📂 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴꜱ" },
    type: 4,
    nativeFlowInfo: {
      name: "single_select",
      paramsJson: JSON.stringify({
        title: "📂 𝗧𝗮𝗽 𝗛𝗲𝗿𝗲 𝗙𝗿𝗶𝗲𝗻𝗱",
        sections: [
          {
            title: "📁 ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ",
            highlight_label: "",
            rows: [
              {
                title: ".menu  📂",
                description: "ᴏᴘᴇɴ ᴀʟʟ ᴄᴏᴍᴍᴀɴᴅꜱ",
                id: `.menu`,
              },
              {
                title: ".owner  👑",
                description: "ᴄᴏɴᴛᴀᴄᴛ ʙᴏᴛ ᴏᴡɴᴇʀ",
                id: `${prefix}owner`,
              },
              {
                title: ".ping  📶",
                description: "ᴛᴇꜱᴛ ʙᴏᴛ ꜱᴘᴇᴇᴅ",
                id: `.ping`,
              },
              {
                title: "🖥️  ꜱʏꜱᴛᴇᴍ",
                description: "ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ",
                id: `${prefix}system`,
              },
              {
                title: ".repo  🛠️",
                description: "ɢɪᴛʜᴜʙ ʀᴇᴘᴏꜱɪᴛᴏʀʏ",
                id: `${prefix}repo`,
              },
            ],
          },
        ],
      }),
    },
  },
];

const messageOptions = {
  viewOnce: true,
  buttons,
  contextInfo: {
    mentionedJid: [m => m.sender], // Will be populated dynamically
  },
};

const ping = async (m, Matrix) => {
  // Early return if not a ping command
  if (!m.body?.startsWith(prefix) || !m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase() === "ping") {
    return;
  }
  
  const start = performance.now(); // More precise timing
  await m.React("📡");
  const responseTime = (performance.now() - start) / 1000;
  
  const text = `*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ* : ${responseTime.toFixed(2)} s`;
  
  // Create contextInfo with current sender
  const contextInfo = {
    mentionedJid: [m.sender],
  };
  
  await Matrix.sendMessage(
    m.from,
    { 
      image: { url: imageUrl },
      caption: text, 
      ...messageOptions,
      contextInfo // Override with dynamic context
    }, 
    { quoted: m }
  );
};
                             
export default ping;
