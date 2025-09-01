import moment from "moment-timezone";
import fs from "fs";
import os from "os";
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

// Fancy font utility
function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", 
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", 
    q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", 
    y: "ʏ", z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

// Image fetch utility
async function fetchMenuImage() {
  const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
  for (let i = 0; i < 3; i++) {
    try {
      const response = await axios.get(imageUrl, { 
        responseType: "arraybuffer",
        timeout: 10000
      });
      return Buffer.from(response.data);
    } catch (error) {
      if (error.response?.status === 429 && i < 2) {
        console.log(`Rate limit hit, retrying in 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.error("❌ Failed to fetch image:", error.message);
      return null;
    }
  }
}

// Command categories
const commandCategories = {
  "download": {
    title: "📥 Download Menu",
    commands: [
      { command: "apk", desc: "Download APK files" },
      { command: "facebook", desc: "Download from Facebook" },
      { command: "mediafire", desc: "Download from Mediafire" },
      { command: "pinterest", desc: "Download from Pinterest" },
      { command: "gitclone", desc: "Clone git repositories" },
      { command: "gdrive", desc: "Download from Google Drive" },
      { command: "insta", desc: "Download Instagram content" },
      { command: "ytmp3", desc: "YouTube to MP3" },
      { command: "ytmp4", desc: "YouTube to MP4" },
      { command: "play", desc: "Play music" },
      { command: "song", desc: "Download songs" },
      { command: "video", desc: "Download videos" },
      { command: "ytmp3doc", desc: "YouTube to MP3 (document)" },
      { command: "ytmp4doc", desc: "YouTube to MP4 (document)" },
      { command: "tiktok", desc: "Download TikTok videos" }
    ]
  },
  "group": {
    title: "👥 Group Menu",
    commands: [
      { command: "linkgroup", desc: "Get group invite link" },
      { command: "setppgc", desc: "Set group profile picture" },
      { command: "setname", desc: "Set group name" },
      { command: "setdesc", desc: "Set group description" },
      { command: "group", desc: "Group management" },
      { command: "gcsetting", desc: "Group settings" },
      { command: "welcome", desc: "Welcome settings" },
      { command: "add", desc: "Add members" },
      { command: "kick", desc: "Remove members" },
      { command: "hidetag", desc: "Hidden tag" },
      { command: "tagall", desc: "Tag all members" },
      { command: "antilink", desc: "Anti-link settings" },
      { command: "antitoxic", desc: "Anti-toxic settings" },
      { command: "promote", desc: "Promote members" },
      { command: "demote", desc: "Demote members" },
      { command: "getbio", desc: "Get user bio" }
    ]
  },
  "fun": {
    title: "🎉 Fun Menu",
    commands: [
      { command: "gay", desc: "Gay rate checker" },
      { command: "simp", desc: "Simp rate checker" },
      { command: "handsome", desc: "Handsome rate" },
      { command: "stupid", desc: "Stupid rate" },
      { command: "character", desc: "Character analyzer" },
      { command: "fact", desc: "Random facts" },
      { command: "truth", desc: "Truth questions" },
      { command: "dare", desc: "Dare challenges" },
      { command: "flirt", desc: "Flirty messages" },
      { command: "couple", desc: "Couple matching" },
      { command: "ship", desc: "Ship two people" },
      { command: "joke", desc: "Random jokes" },
      { command: "meme", desc: "Random memes" },
      { command: "quote", desc: "Inspirational quotes" },
      { command: "roll", desc: "Roll a dice" }
    ]
  },
  "owner": {
    title: "👑 Owner Menu",
    commands: [
      { command: "join", desc: "Join group via link" },
      { command: "leave", desc: "Leave group" },
      { command: "block", desc: "Block user" },
      { command: "unblock", desc: "Unblock user" },
      { command: "setppbot", desc: "Set bot profile picture" },
      { command: "anticall", desc: "Anti-call settings" },
      { command: "setstatus", desc: "Set bot status" },
      { command: "setnamebot", desc: "Set bot name" },
      { command: "autorecording", desc: "Auto voice recording" },
      { command: "autolike", desc: "Auto like messages" },
      { command: "autotyping", desc: "Auto typing indicator" },
      { command: "alwaysonline", desc: "Always online mode" },
      { command: "autoread", desc: "Auto read messages" },
      { command: "autosview", desc: "Auto view stories" }
    ]
  },
  "ai": {
    title: "🤖 AI Menu",
    commands: [
      { command: "ai", desc: "AI chat" },
      { command: "bug", desc: "Report bugs" },
      { command: "report", desc: "Report issues" },
      { command: "gpt", desc: "ChatGPT" },
      { command: "dall", desc: "DALL-E image generation" },
      { command: "remini", desc: "Image enhancement" },
      { command: "gemini", desc: "Google Gemini" },
      { command: "bard", desc: "Google Bard" },
      { command: "blackbox", desc: "Blackbox AI" },
      { function: "mistral", desc: "Mistral AI" },
      { command: "llama", desc: "LLaMA AI" },
      { command: "claude", desc: "Claude AI" },
      { command: "deepseek", desc: "DeepSeek AI" }
    ]
  },
  "anime": {
    title: "🌸 Anime Menu",
    commands: [
      { command: "anime", desc: "Random anime info" },
      { command: "animepic", desc: "Random anime pictures" },
      { command: "animequote", desc: "Anime quotes" },
      { command: "animewall", desc: "Anime wallpapers" },
      { command: "animechar", desc: "Anime character search" },
      { command: "waifu", desc: "Random waifu" },
      { command: "husbando", desc: "Random husbando" },
      { command: "neko", desc: "Neko girls" },
      { command: "shinobu", desc: "Shinobu pictures" },
      { command: "megumin", desc: "Megumin pictures" },
      { command: "awoo", desc: "Awoo girls" },
      { command: "trap", desc: "Trap characters" },
      { command: "blowjob", desc: "NSFW content" }
    ]
  },
  "converter": {
    title: "🔄 Converter Menu",
    commands: [
      { command: "attp", desc: "Text to sticker" },
      { command: "attp2", desc: "Text to sticker (style 2)" },
      { command: "attp3", desc: "Text to sticker (style 3)" },
      { command: "ebinary", desc: "Encode binary" },
      { command: "dbinary", desc: "Decode binary" },
      { command: "emojimix", desc: "Mix two emojis" },
      { command: "mp3", desc: "Convert to MP3" },
      { command: "mp4", desc: "Convert to MP4" },
      { command: "sticker", desc: "Image to sticker" },
      { command: "toimg", desc: "Sticker to image" },
      { command: "tovid", desc: "GIF to video" },
      { command: "togif", desc: "Video to GIF" },
      { command: "tourl", desc: "Media to URL" },
      { command: "tinyurl", desc: "URL shortener" }
    ]
  },
  "other": {
    title: "📌 Other Menu",
    commands: [
      { command: "calc", desc: "Calculator" },
      { command: "tempmail", desc: "Temp email" },
      { command: "checkmail", desc: "Check temp mail" },
      { command: "trt", desc: "Translate text" },
      { command: "tts", desc: "Text to speech" },
      { command: "ssweb", desc: "Website screenshot" },
      { command: "readmore", desc: "Create read more" },
      { command: "styletext", desc: "Stylish text" },
      { command: "weather", desc: "Weather info" },
      { command: "clock", desc: "World clock" },
      { command: "qrcode", desc: "Generate QR code" },
      { command: "readqr", desc: "Read QR code" },
      { command: "currency", desc: "Currency converter" }
    ]
  },
  "reactions": {
    title: "🎭 Reactions Menu",
    commands: [
      { command: "like", desc: "Like reaction" },
      { command: "love", desc: "Love reaction" },
      { command: "haha", desc: "Haha reaction" },
      { command: "wow", desc: "Wow reaction" },
      { command: "sad", desc: "Sad reaction" },
      { command: "angry", desc: "Angry reaction" },
      { command: "dislike", desc: "Dislike reaction" },
      { command: "cry", desc: "Cry reaction" },
      { command: "kiss", desc: "Kiss reaction" },
      { command: "pat", desc: "Pat reaction" },
      { command: "slap", desc: "Slap reaction" },
      { command: "punch", desc: "Punch reaction" },
      { command: "kill", desc: "Kill reaction" },
      { command: "hug", desc: "Hug reaction" }
    ]
  },
  "main": {
    title: "🏠 Main Menu",
    commands: [
      { command: "ping", desc: "Check bot response time" },
      { command: "alive", desc: "Check if bot is running" },
      { command: "owner", desc: "Contact owner" },
      { command: "menu", desc: "Show this menu" },
      { command: "infobot", desc: "Bot information" },
      { command: "donate", desc: "Support the bot" },
      { command: "speed", desc: "Speed test" },
      { command: "runtime", desc: "Bot uptime" },
      { command: "sc", desc: "Source code" },
      { command: "script", desc: "Script info" },
      { command: "support", desc: "Support group" },
      { command: "update", desc: "Check updates" },
      { command: "feedback", desc: "Send feedback" }
    ]
  }
};

// Function to handle command execution
async function executeCommand(m, Matrix, commandName) {
  const prefix = config.PREFIX;
  
  // Find the command in the categories
  let commandFound = null;
  for (const category of Object.values(commandCategories)) {
    const cmd = category.commands.find(c => c.command === commandName);
    if (cmd) {
      commandFound = cmd;
      break;
    }
  }
  
  if (!commandFound) {
    await Matrix.sendMessage(m.from, {
      text: `❌ Command "${commandName}" not found. Please try again.`
    }, { quoted: m });
    return;
  }
  
  // Send a message indicating the command is being executed
  await Matrix.sendMessage(m.from, {
    text: `⚡ Executing command: ${prefix}${commandName}\n${commandFound.desc}`
  }, { quoted: m });
  
  // Simulate the command being typed by the user
  const simulatedMessage = {
    ...m,
    body: `${prefix}${commandName}`
  };
  
  // Import and execute the command handler
  try {
    // This assumes you have a command handler that exports a default function
    const commandHandler = await import(`./commands/${commandName}.js`);
    await commandHandler.default(simulatedMessage, Matrix);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await Matrix.sendMessage(m.from, {
      text: `❌ Error executing command "${commandName}": ${error.message}\n\nMake sure the command file exists in the commands directory.`
    }, { quoted: m });
  }
}

const menu = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    
    // Check if message has the correct prefix
    const hasPrefix = m.body && m.body.startsWith(prefix);
    if (!hasPrefix && !m.message?.nativeFlowResponseMessage && !m.message?.buttonsResponseMessage) {
      return; // Ignore messages without prefix
    }
    
    const cmd = hasPrefix ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const mode = config.MODE === "public" ? "public" : "private";
    const totalCommands = Object.values(commandCategories).reduce((acc, category) => acc + category.commands.length, 0);

    const validCommands = ["caseymenu", "help2", "menu2"];
    const subMenuCommands = Object.keys(commandCategories).map(cat => `${cat}-menu`);

    // Check if this is a native flow response (menu selection)
    if (m.message?.nativeFlowResponseMessage) {
      try {
        const responseParams = JSON.parse(m.message.nativeFlowResponseMessage.paramsJson);
        const selectedId = responseParams.id || responseParams.name;
        
        if (selectedId) {
          // Handle menu navigation
          if (selectedId.endsWith('-menu')) {
            // Simulate the menu command
            const simulatedMessage = {
              ...m,
              body: selectedId
            };
            return menu(simulatedMessage, Matrix);
          }
          
          // Handle direct command execution
          const commandName = selectedId.startsWith(prefix) 
            ? selectedId.slice(prefix.length) 
            : selectedId;
            
          return executeCommand(m, Matrix, commandName);
        }
      } catch (error) {
        console.error("Error parsing native flow response:", error);
        await Matrix.sendMessage(m.from, {
          text: "❌ Error processing menu selection. Please try again."
        }, { quoted: m });
        return;
      }
    }

    // Check if this is a button response (for older WhatsApp versions)
    if (m.message?.buttonsResponseMessage) {
      const selectedId = m.message.buttonsResponseMessage.selectedButtonId;
      
      if (selectedId) {
        // Handle menu navigation
        if (selectedId.endsWith('-menu')) {
          const simulatedMessage = {
            ...m,
            body: selectedId
          };
          return menu(simulatedMessage, Matrix);
        }
        
        // Handle direct command execution
        const commandName = selectedId.startsWith(prefix) 
          ? selectedId.slice(prefix.length) 
          : selectedId;
          
        return executeCommand(m, Matrix, commandName);
      }
    }

    // Fetch image for all cases
    const menuImage = await fetchMenuImage();

    // Handle main menu
    if (validCommands.includes(cmd) || cmd === "") {
      const mainMenu = `*HI 👋* *${pushwish}*
*╭───────────────┈⊷*
*┊• 🌟 ʙᴏᴛ ɴᴀᴍᴇ :* *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ*
*┊• ⏰ ᴛɪᴍᴇ :* *${xtime}*
*┊• 📅 ᴅᴀᴛᴇ :* *${xdate}*
*┊• 🎭 ᴅᴇᴠ :* *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ ᴢᴏɴᴇ*
*┊• 📍 ᴘʀᴇғɪx :*  *[ ${prefix} ]*
*┊• 📊 ᴛᴏᴛᴀʟ ᴄᴍᴅs :* *${totalCommands}*
*╰───────────────┈⊷*
┏        *【 ᴍᴇɴᴜ ʟɪsᴛ 】⇳︎*
- . ①  *ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ*
- . ②  *ɢʀᴏᴜᴘ ᴍᴇɴᴜ*
- . ③  *ғᴜɴ ᴍᴇɴᴜ*
- . ④  *ᴏᴡɴᴇʀ ᴍᴇɴᴜ*
- . ⑤  *ᴀɪ ᴍᴇɴᴜ*
- . ⑥  *ᴀɴɪᴍᴇ ᴍᴇɴᴜ*
- . ⑦  *ᴄᴏɴᴠᴇʀᴛᴇʀ ᴍᴇɴᴜ*
- . ⑧  *ᴏᴛʜᴇʀ ᴍᴇɴᴜ*
- . ⑨  *ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ*
- . ⑩  *ᴍᴀɪɴ ᴍᴇɴᴜ*
┗
╭─────────────────⊷
┊*Hallo my family ${pushwish}*
╰─────────────────⊷
`;

      // Create list message for menu navigation
      const listMessage = {
        text: "CASEYRHODES AI MENU",
        footer: "CASEYRHODES AI",
        title: "CASEYRHODES-AI Menu",
        buttonText: "Select an option",
        sections: [
          {
            title: "Menu Navigation",
            rows: [
              {
                title: "📥 ᴅᴏᴡɴʟᴏᴀᴅ",
                rowId: `${prefix}download-menu`,
                description: "ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "👥 ɢʀᴏᴜᴘ",
                rowId: `${prefix}group-menu`,
                description: "ɢʀᴏᴜᴘ ᴍᴀɴᴀɢᴇᴍᴇɴᴛ",
              },
              {
                title: "🎉 ғᴜɴ",
                rowId: `${prefix}fun-menu`,
                description: "ғᴜɴ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "👑 ᴏᴡɴᴇʀ",
                rowId: `${prefix}owner-menu`,
                description: "ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "🤖 ᴀɪ",
                rowId: `${prefix}ai-menu`,
                description: "ᴀɪ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "🌸 ᴀɴɪᴍᴇ",
                rowId: `${prefix}anime-menu`,
                description: "ᴀɴɪᴍᴇ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ",
                rowId: `${prefix}converter-menu`,
                description: "ᴄᴏɴᴠᴇʀᴛᴇʀ ᴛᴏᴏʟs",
              },
              {
                title: "🌟 ᴏᴛʜᴇʀ",
                rowId: `${prefix}other-menu`,
                description: "ᴏᴛʜᴇʀ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "🎭 ʀᴇᴀᴄᴛɪᴏɴs",
                rowId: `${prefix}reactions-menu`,
                description: "ʀᴇᴀᴄᴛɪᴏɴ ᴄᴏᴍᴍᴀɴᴅs",
              },
              {
                title: "📂 ᴍᴀɪɴ",
                rowId: `${prefix}main-menu`,
                description: "ᴍᴀɪɴ ᴄᴏᴍᴍᴀɴᴅs",
              },
            ],
          },
        ],
      };

      // Send menu with or without image
      if (menuImage) {
        await Matrix.sendMessage(m.from, { 
          image: menuImage,
          caption: mainMenu,
          ...listMessage
        }, { 
          quoted: {
            key: {
                fromMe: false,
                participant: `0@s.whatsapp.net`,
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: "CASEYRHODES VERIFIED ✅",
                    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
                }
            }
          }
        });
      } else {
        // Fallback to text-only if image fails
        await Matrix.sendMessage(m.from, { text: mainMenu, ...listMessage }, { quoted: m });
      }

      // Send audio as a voice note
      try {
        await Matrix.sendMessage(m.from, { 
          audio: { url: "https://files.catbox.moe/mwohwu.mp3" },
          mimetype: "audio/mp4", 
          ptt: true
        }, { 
          quoted: {
            key: {
              fromMe: false,
              participant: `0@s.whatsapp.net`,
              remoteJid: "status@broadcast"
            },
            message: {
              contactMessage: {
                displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ✅",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
              }
            }
          }
        });
      } catch (audioError) {
        console.error("❌ Failed to send audio:", audioError.message);
        // Continue without audio if it fails
      }
    }
  
    // Handle sub-menu commands
    if (subMenuCommands.includes(cmd)) {
      const category = cmd.replace("-menu", "");
      const categoryData = commandCategories[category];
      
      if (!categoryData) return;

      let menuResponse = "";
      categoryData.commands.forEach((cmdObj, index) => {
        const num = (index + 1).toString().padStart(2, "0");
        menuResponse += `${toFancyFont(`${prefix}${cmdObj.command}`)} - ${cmdObj.desc}\n`;
      });

      // Format the full response
      const fullResponse = `
*${categoryData.title}*

${menuResponse}

*📅 Date*: ${xdate}
*⏰ Time*: ${xtime}
*⚙️ Prefix*: ${prefix}
*🌐 Mode*: ${mode}
*📊 Commands*: ${categoryData.commands.length}

> ✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟
`;

      // Create command selection buttons
      const commandButtons = categoryData.commands.map(cmdObj => ({
        title: cmdObj.command,
        description: cmdObj.desc,
        rowId: `${prefix}${cmdObj.command}`,
      }));

      // Create back button
      const backButton = {
        title: "ʙᴀᴄᴋ ᴛᴏ ᴍᴀɪɴ ᴍᴇɴᴜ",
        description: "ʀᴇᴛᴜʀɴ ᴛᴏ ᴍᴀɪɴ ᴍᴇɴᴜ",
        rowId: `${prefix}menu`,
      };

      const listMessage = {
        text: fullResponse,
        footer: "CASEYRHODES AI",
        title: categoryData.title,
        buttonText: "Select a command",
        sections: [
          {
            title: "Available Commands",
            rows: [...commandButtons, backButton],
          },
        ],
      };

      // Send sub-menu with image
      if (menuImage) {
        await Matrix.sendMessage(m.from, { 
          image: menuImage,
          caption: fullResponse,
          ...listMessage
        }, { quoted: m });
      } else {
        await Matrix.sendMessage(m.from, listMessage, { quoted: m });
      }
    }
  } catch (error) {
    console.error(`❌ Menu error: ${error.message}`);
    await Matrix.sendMessage(m.from, {
      text: `•
• *📁 ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* hit a snag! Error: ${error.message || "Failed to load menu"} 😡
•`,
    }, { quoted: m });
  }
};

export default menu;
