import config from "../config.cjs";
import pkg, { prepareWAMessageMedia } from "@whiskeysockets/baileys";
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
   const buttons = [
      {
        buttonId: "action",
        buttonText: { displayText: "📂 ᴍᴇɴᴜ " },
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
        mentionedJid: [m.sender],
      },
    };
    await Matrix.sendMessage(m.from,{ 
      image: { url: imageUrl },
      caption:text, 
      ...messageOptions 
   }, { quoted: m });
  }
  };
                             
export default ping;
    
