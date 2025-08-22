import moment from "moment-timezone";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;
import config from "../config.cjs";
import axios from "axios";

// Time logic
const xtime = moment.tz("Africa/Nairobi").format("HH:mm:ss");
const xdate = moment.tz("Africa/Nairobi").format("DD/MM/YYYY");
const time2 = moment().tz("Africa/Nairobi").format("HH:mm:ss");
let pushwish = "";

if (time2 < "05:00:00") {
  pushwish = `Good Morning 🌄`;
} else if (time2 < "11:00:00") {
  pushwish = `Good Morning 🌄`;
} else if (time2 < "15:00:00") {
  pushwish = `Good Afternoon 🌅`;
} else if (time2 < "18:00:00") {
  pushwish = `Good Evening 🌃`;
} else if (time2 < "19:00:00") {
  pushwish = `Good Evening 🌃`;
} else {
  pushwish = `Good Night 🌌`;
}

// Image fetch utility
async function fetchMenuImage() {
  const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
  try {
    const response = await axios.get(imageUrl, { 
      responseType: "arraybuffer",
      timeout: 10000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error("❌ Failed to fetch image:", error.message);
    return null;
  }
}

const menu = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    
    // Handle main menu command
    if (cmd === "menu") {
      const menuImage = await fetchMenuImage();
      
      const mainMenu = `
*CASEYRHODES TECH*

*DEVELOPER : CASEYRHODES TECH ZONE*

*╭───────────────┈⊷*
*┊• ⏰ TIME :* *${xtime}*
*┊• 📅 DATE :* *${xdate}*
*┊• 📍 PREFIX :* *[ ${prefix} ]*
*┊• 🌟 BOT POWERED :* *CASEYRHODES AI*
*╰───────────────┈⊷*

*HELLO BRO WELCOME TO CASEYRHODES AI, A MULTI DEVICE POWERFUL BOT*

*CHOOSE MENU TAB*
`;

      const messageOptions = {
        viewOnce: true,
        buttons: [
          // Row 1: Core Features
          [
            { buttonId: `${prefix}download`, buttonText: { displayText: `📥 DOWNLOAD` }, type: 1 },
            { buttonId: `${prefix}group`, buttonText: { displayText: `👥 GROUP` }, type: 1 },
            { buttonId: `${prefix}ai`, buttonText: { displayText: `🤖 AI` }, type: 1 }
          ],
          // Row 2: Entertainment
          [
            { buttonId: `${prefix}fun`, buttonText: { displayText: `🎉 FUN` }, type: 1 },
            { buttonId: `${prefix}anime`, buttonText: { displayText: `🌸 ANIME` }, type: 1 },
            { buttonId: `${prefix}sticker`, buttonText: { displayText: `✨ STICKER` }, type: 1 }
          ],
          // Row 3: Utilities
          [
            { buttonId: `${prefix}tools`, buttonText: { displayText: `🛠️ TOOLS` }, type: 1 },
            { buttonId: `${prefix}owner`, buttonText: { displayText: `👑 OWNER` }, type: 1 },
            { buttonId: `${prefix}converter`, buttonText: { displayText: `🔄 CONVERT` }, type: 1 }
          ],
          // Row 4: View All Categories
          [
            { buttonId: `${prefix}allmenu`, buttonText: { displayText: `📁 ALL MENU` }, type: 1 }
          ]
        ],
        headerType: 1,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
        },
      };

      // Send menu with or without image
      if (menuImage) {
        await Matrix.sendMessage(m.from, { 
          image: menuImage,
          caption: mainMenu,
          ...messageOptions
        }, { quoted: m });
      } else {
        await Matrix.sendMessage(m.from, { 
          text: mainMenu,
          ...messageOptions
        }, { quoted: m });
      }
    }
    
    // Handle all menu command (shows all categories)
    if (cmd === "allmenu") {
      const allMenuText = `
*CASEYRHODES AI - ALL MENU CATEGORIES*

*📥 DOWNLOAD MENU*
• .ytmp3 [url] - YouTube to MP3
• .ytmp4 [url] - YouTube to MP4
• .instagram [url] - Instagram Download
• .tiktok [url] - TikTok Download
• .facebook [url] - Facebook Download

*👥 GROUP MENU*
• .add [number] - Add member
• .kick [@tag] - Remove member
• .promote [@tag] - Promote to admin
• .demote [@tag] - Demote admin
• .group [open/close] - Group settings

*🤖 AI MENU*
• .ai [question] - AI Chat
• .gpt [question] - ChatGPT
• .dall [prompt] - Generate image
• .gemini [question] - Google Gemini
• .remini [image] - Enhance image

*🎉 FUN MENU*
• .joke - Random jokes
• .meme - Random memes
• .quote - Inspirational quotes
• .fact - Interesting facts
• .truth - Truth questions

*🌸 ANIME MENU*
• .anime [name] - Anime info
• .waifu - Random waifu
• .neko - Random neko
• .animepic - Anime pictures
• .animewall - Anime wallpapers

*✨ STICKER MENU*
• .sticker - Image to sticker
• .toimg - Sticker to image
• .attp [text] - Text to sticker
• .emojimix [emoji+emoji] - Mix emojis

*🛠️ TOOLS MENU*
• .ssweb [url] - Website screenshot
• .trt [text] - Translate text
• .weather [city] - Weather info
• .qrcode [text] - Generate QR code
• .currency [amount] [from] [to] - Convert currency

*👑 OWNER MENU*
• .bc [text] - Broadcast message
• .setppbot - Set bot profile
• .join [link] - Join group
• .leave - Leave group
• .block [number] - Block user

*🔄 CONVERTER MENU*
• .mp3 [video] - Convert to MP3
• .mp4 [video] - Convert to MP4
• .tovid [gif] - GIF to video
• .togif [video] - Video to GIF
• .ebinary [text] - Encode binary

*📅 Date:* ${xdate}
*⏰ Time:* ${xtime}
*⚙️ Prefix:* ${prefix}

> Powered by CASEYRHODES AI 🌟
`;

      const backButton = {
        buttons: [
          { buttonId: `${prefix}menu`, buttonText: { displayText: `🔙 BACK TO MAIN` }, type: 1 }
        ]
      };

      await Matrix.sendMessage(m.from, {
        text: allMenuText,
        ...backButton
      }, { quoted: m });
    }

    // Handle individual category commands
    const categoryCommands = {
      "download": "📥 DOWNLOAD MENU",
      "group": "👥 GROUP MENU", 
      "ai": "🤖 AI MENU",
      "fun": "🎉 FUN MENU",
      "anime": "🌸 ANIME MENU",
      "sticker": "✨ STICKER MENU",
      "tools": "🛠️ TOOLS MENU",
      "owner": "👑 OWNER MENU",
      "converter": "🔄 CONVERTER MENU"
    };

    if (Object.keys(categoryCommands).includes(cmd)) {
      const categoryTitle = categoryCommands[cmd];
      let categoryContent = "";

      switch (cmd) {
        case "download":
          categoryContent = `
*${categoryTitle}*

• .ytmp3 [url] - Download YouTube audio
• .ytmp4 [url] - Download YouTube video
• .instagram [url] - Download Instagram content
• .tiktok [url] - Download TikTok video
• .facebook [url] - Download Facebook video
• .pinterest [url] - Download Pinterest image
• .mediafire [url] - Download from Mediafire
• .apk [name] - Download APK files
• .gitclone [url] - Clone git repository
• .play [song] - Play music
• .song [song] - Download song
• .video [video] - Download video
`;
          break;

        case "group":
          categoryContent = `
*${categoryTitle}*

• .add [number] - Add member to group
• .kick [@tag] - Remove member from group
• .promote [@tag] - Promote to admin
• .demote [@tag] - Demote from admin
• .group [open/close] - Change group settings
• .linkgroup - Get group invite link
• .setppgc - Set group profile picture
• .setname [text] - Set group name
• .setdesc [text] - Set group description
• .tagall - Mention all members
• .hidetag - Hidden mention
• .antilink [on/off] - Anti-link protection
• .welcome [on/off] - Welcome message
`;
          break;

        case "ai":
          categoryContent = `
*${categoryTitle}*

• .ai [question] - AI conversation
• .gpt [question] - ChatGPT response
• .dall [prompt] - Generate AI image
• .gemini [question] - Google Gemini AI
• .bard [question] - Google Bard AI
• .remini [image] - Enhance image quality
• .blackbox [question] - Blackbox AI
• .mistral [question] - Mistral AI
• .llama [question] - LLaMA AI
• .claude [question] - Claude AI
• .deepseek [question] - DeepSeek AI
• .bug [report] - Report bug to developer
`;
          break;

        // Add other cases similarly...
      }

      const fullResponse = `
${categoryContent}

*📅 Date:* ${xdate}
*⏰ Time:* ${xtime}
*⚙️ Prefix:* ${prefix}

> Powered by CASEYRHODES AI 🌟
`;

      const backButton = {
        buttons: [
          { buttonId: `${prefix}menu`, buttonText: { displayText: `🔙 BACK TO MAIN` }, type: 1 },
          { buttonId: `${prefix}allmenu`, buttonText: { displayText: `📁 ALL MENU` }, type: 1 }
        ]
      };

      await Matrix.sendMessage(m.from, {
        text: fullResponse,
        ...backButton
      }, { quoted: m });
    }

  } catch (error) {
    console.error(`❌ Menu error: ${error.message}`);
    await Matrix.sendMessage(m.from, {
      text: `*CASEYRHODES AI* encountered an error: ${error.message || "Failed to load menu"}`,
    }, { quoted: m });
  }
};

export default menu;
