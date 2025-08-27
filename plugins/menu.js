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
      { command: "mistral", desc: "Mistral AI" },
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
// Function to create interactive native flow message
function createInteractiveMessage(body, sections, footer = "") {
  const interactiveMessage = {
    body: { text: body },
    footer: { text: footer },
    header: {
      hasMediaAttachment: false
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📂 ꜱᴇʟᴇᴄᴛ ᴍᴇɴᴜ",
            sections: sections
          })
        }
      ]
    }
  };

  return generateWAMessageFromContent("", {
    viewOnceMessage: {
      message: {
        interactiveMessage
      }
    }
  }, { userJid: "", quoted: null });
}

// Function to create interactive message with image
function createInteractiveMessageWithImage(image, body, sections, footer = "") {
  const interactiveMessage = {
    body: { text: body },
    footer: { text: footer },
    header: {
      hasMediaAttachment: true,
      imageMessage: image
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📂 ꜱᴇʟᴇᴄᴛ ᴍᴇɴᴜ",
            sections: sections
          })
        }
      ]
    }
  };

  return generateWAMessageFromContent("", {
    viewOnceMessage: {
      message: {
        interactiveMessage
      }
    }
  }, { userJid: "", quoted: null });
}

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
    if (!hasPrefix && !m.message?.nativeFlowResponseMessage && !m.message?.buttonsResponseMessage && !m.message?.listResponseMessage) {
      return;
    }
    
    const cmd = hasPrefix ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const mode = config.MODE === "public" ? "public" : "private";
    const totalCommands = Object.values(commandCategories).reduce((acc, category) => acc + category.commands.length, 0);

    const validCommands = ["list", "help", "menu"];
    const subMenuCommands = Object.keys(commandCategories).map(cat => `${cat}-menu`);

    // Handle native flow response (interactive message selection)
    if (m.message?.nativeFlowResponseMessage) {
      try {
        const responseParams = JSON.parse(m.message.nativeFlowResponseMessage.paramsJson);
        const selectedId = responseParams.id || responseParams.name;
        
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
      } catch (error) {
        console.error("Error parsing native flow response:", error);
        await Matrix.sendMessage(m.from, {
          text: "❌ Error processing menu selection. Please try again."
        }, { quoted: m });
        return;
      }
    }
    // Handle list response message (fallback for older versions)
    if (m.message?.listResponseMessage) {
      const selectedId = m.message.listResponseMessage.singleSelectReply.selectedRowId;
      
      if (selectedId) {
        if (selectedId.endsWith('-menu')) {
          const simulatedMessage = {
            ...m,
            body: selectedId
          };
          return menu(simulatedMessage, Matrix);
        }
        
        const commandName = selectedId.startsWith(prefix) 
          ? selectedId.slice(prefix.length) 
          : selectedId;
          
        return executeCommand(m, Matrix, commandName);
      }
    }

    // Handle button response (for compatibility)
    if (m.message?.buttonsResponseMessage) {
      const selectedId = m.message.buttonsResponseMessage.selectedButtonId;
      
      if (selectedId) {
        if (selectedId.endsWith('-menu')) {
          const simulatedMessage = {
            ...m,
            body: selectedId
          };
          return menu(simulatedMessage, Matrix);
        }
        
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
      const mainMenuText = `*HI 👋* *${pushwish}*
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
╰─────────────────⊷`;
// Create menu sections for native flow
      const menuSections = [
        {
          title: "ᴄᴀᴛᴇɢᴏʀɪᴇs",
          highlight_label: "ꜱᴇʟᴇᴄᴛ ᴀ ᴄᴀᴛᴇɢᴏʀʏ",
          rows: [
            {
              header: "📥 ᴅᴏᴡɴʟᴏᴀᴅ",
              title: "Download Menu",
              description: "Access all download commands",
              id: `download-menu`,
            },
            {
              header: "👥 ɢʀᴏᴜᴘ",
              title: "Group Menu",
              description: "Group management commands",
              id: `group-menu`,
            },
            {
              header: "🎉 ғᴜɴ",
              title: "Fun Menu",
              description: "Entertainment and fun commands",
              id: `fun-menu`,
            },
            {
              header: "👑 ᴏᴡɴᴇʀ",
              title: "Owner Menu",
              description: "Owner-only commands",
              id: `owner-menu`,
            },
            {
              header: "🤖 ᴀɪ",
              title: "AI Menu",
              description: "Artificial intelligence commands",
              id: `ai-menu`,
            },
            {
              header: "🌸 ᴀɴɪᴍᴇ",
              title: "Anime Menu",
              description: "Anime-related commands",
              id: `anime-menu`,
            },
            {
              header: "🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ",
              title: "Converter Menu",
              description: "File conversion tools",
              id: `converter-menu`,
            },
            {
              header: "🌟 ᴏᴛʜᴇʀ",
              title: "Other Menu",
              description: "Miscellaneous commands",
              id: `other-menu`,
            },
            {
              header: "🎭 ʀᴇᴀᴄᴛɪᴏɴs",
              title: "Reactions Menu",
              description: "Reaction and emotion commands",
              id: `reactions-menu`,
            },
            {
              header: "📂 ᴍᴀɪɴ",
              title: "Main Menu",
              description: "Core bot commands",
              id: `main-menu`,
            }
          ],
        },
      ];

      // Create interactive message
      let interactiveMsg;
      
      if (menuImage) {
        // Upload image first
        const imageMsg = await Matrix.sendMessage(m.from, { image: menuImage }, { quoted: m });
        
        interactiveMsg = createInteractiveMessageWithImage(
          imageMsg.message.imageMessage,
          mainMenuText,
          menuSections,
          "✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟"
        );
      } else {
        interactiveMsg = createInteractiveMessage(
          mainMenuText,
          menuSections,
          "✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟"
        );
      }

      // Send the interactive message
      await Matrix.relayMessage(m.from, interactiveMsg.message, {
        messageId: interactiveMsg.key.id
      });

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

      const fullResponse = `*${categoryData.title}*

${menuResponse}
*📅 Date*: ${xdate}
*⏰ Time*: ${xtime}
*⚙️ Prefix*: ${prefix}
*🌐 Mode*: ${mode}
*📊 Commands*: ${categoryData.commands.length}`;

      // Create command selection rows
      const commandRows = categoryData.commands.map(cmdObj => ({
        header: `${prefix}${cmdObj.command}`,
        title: cmdObj.command.toUpperCase(),
        description: cmdObj.desc,
        id: `${cmdObj.command}`,
      }));

      // Add back button
      commandRows.push({
        header: "⬅️ ʙᴀᴄᴋ",
        title: "Main Menu",
        description: "Return to main menu",
        id: `menu`,
      });

      const commandSections = [
        {
          title: "ᴄᴏᴍᴍᴀɴᴅs",
          highlight_label: "ꜱᴇʟᴇᴄᴛ ᴀ ᴄᴏᴍᴍᴀɴᴅ",
          rows: commandRows,
        },
      ];

      // Create interactive sub-menu
      let subInteractiveMsg;
      
      if (menuImage) {
        const imageMsg = await Matrix.sendMessage(m.from, { image: menuImage }, { quoted: m });
        
        subInteractiveMsg = createInteractiveMessageWithImage(
          imageMsg.message.imageMessage,
          fullResponse,
          commandSections,
          "✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟"
        );
      } else {
        subInteractiveMsg = createInteractiveMessage(
          fullResponse,
          commandSections,
          "✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟"
        );
      }

      // Send the interactive sub-menu
      await Matrix.relayMessage(m.from, subInteractiveMsg.message, {
        messageId: subInteractiveMsg.key.id
      });
    }
  } catch (error) {
    console.error(`❌ Menu error: ${error.message}`);
    
    // Fallback to simple text menu if interactive fails
    const fallbackMenu = `❌ Interactive menu failed. Here's the text version:

*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ᴍᴇɴᴜ*

Available categories:
• ${config.PREFIX}download-menu - Download commands
• ${config.PREFIX}group-menu - Group management
• ${config.PREFIX}fun-menu - Fun commands  
• ${config.PREFIX}owner-menu - Owner commands
• ${config.PREFIX}ai-menu - AI commands
• ${config.PREFIX}anime-menu - Anime commands
• ${config.PREFIX}converter-menu - Converter tools
• ${config.PREFIX}other-menu - Other commands
• ${config.PREFIX}reactions-menu - Reaction commands
• ${config.PREFIX}main-menu - Main commands

Error: ${error.message || "Failed to load interactive menu"}`;

    await Matrix.sendMessage(m.from, {
      text: fallbackMenu,
    }, { quoted: m });
  }
};

// Additional helper functions for better button handling

// Function to handle quick replies
async function handleQuickReply(m, Matrix, replyId) {
  const prefix = config.PREFIX;
  
  // Handle menu navigation
  if (replyId.endsWith('-menu')) {
    const simulatedMessage = {
      ...m,
      body: `${prefix}${replyId}`
    };
    return menu(simulatedMessage, Matrix);
  }
  
  // Handle direct command execution
  return executeCommand(m, Matrix, replyId);
}

// Function to create quick reply buttons (fallback for older WhatsApp versions)
function createQuickReplyButtons(buttons) {
  return {
    templateButtons: buttons.map((btn, index) => ({
      index: index + 1,
      quickReplyButton: {
        displayText: btn.text,
        id: btn.id
      }
    }))
  };
}

// Function to create URL buttons
function createUrlButtons(buttons) {
  return {
    templateButtons: buttons.map((btn, index) => ({
      index: index + 1,
      urlButton: {
        displayText: btn.text,
        url: btn.url
      }
    }))
  };
}

// Enhanced message sending with multiple fallback options
async function sendInteractiveMenu(Matrix, chatId, menuData, quoted = null) {
  const { image, text, sections, footer } = menuData;
  
  try {
    // Try native flow first (newest method)
    let interactiveMsg;
    
    if (image) {
      interactiveMsg = createInteractiveMessageWithImage(image, text, sections, footer);
    } else {
      interactiveMsg = createInteractiveMessage(text, sections, footer);
    }
    
    await Matrix.relayMessage(chatId, interactiveMsg.message, {
      messageId: interactiveMsg.key.id
    });
    
    return true;
  } catch (error) {
    console.log("Native flow failed, trying list message...", error.message);
    
    try {
      // Fallback to list message
      const listMessage = {
        text: text,
        footer: footer,
        title: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ᴍᴇɴᴜ",
        buttonText: "📂 ꜱᴇʟᴇᴄᴛ ᴍᴇɴᴜ",
        sections: sections
      };
      
      if (image) {
        await Matrix.sendMessage(chatId, {
          image: image,
          caption: text,
          footer: footer,
          title: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ᴍᴇɴᴜ",
          buttonText: "📂 ꜱᴇʟᴇᴄᴛ ᴍᴇɴᴜ",
          sections: sections
        }, { quoted });
      } else {
        await Matrix.sendMessage(chatId, listMessage, { quoted });
      }
      
      return true;
    } catch (listError) {
      console.log("List message failed, trying template buttons...", listError.message);
      
      try {
        // Final fallback to template buttons
        const quickButtons = sections[0].rows.slice(0, 3).map(row => ({
          text: row.title,
          id: row.id
        }));
        
        const templateMessage = {
          text: text,
          footer: footer,
          ...createQuickReplyButtons(quickButtons)
        };
        
        if (image) {
          await Matrix.sendMessage(chatId, {
            image: image,
            caption: text,
            footer: footer,
            ...createQuickReplyButtons(quickButtons)
          }, { quoted });
        } else {
          await Matrix.sendMessage(chatId, templateMessage, { quoted });
        }
        
        return true;
      } catch (templateError) {
        console.log("All interactive methods failed, sending text only...", templateError.message);
        
        // Ultimate fallback - plain text
        let fallbackText = text + "\n\n" + footer;
        fallbackText += "\n\nAvailable options:\n";
        
        sections.forEach(section => {
          section.rows.forEach(row => {
            fallbackText += `• ${config.PREFIX}${row.id} - ${row.description}\n`;
          });
        });
        
        await Matrix.sendMessage(chatId, { text: fallbackText }, { quoted });
        return false;
      }
    }
  }
}

// Enhanced response handler for better compatibility
async function handleMenuResponse(m, Matrix) {
  // Handle different types of responses
  let selectedId = null;
  let responseType = "unknown";
  
  if (m.message?.nativeFlowResponseMessage) {
    try {
      const responseParams = JSON.parse(m.message.nativeFlowResponseMessage.paramsJson);
      selectedId = responseParams.id || responseParams.name;
      responseType = "nativeFlow";
    } catch (error) {
      console.error("Error parsing native flow response:", error);
    }
  } else if (m.message?.listResponseMessage) {
    selectedId = m.message.listResponseMessage.singleSelectReply.selectedRowId;
    responseType = "listResponse";
  } else if (m.message?.buttonsResponseMessage) {
    selectedId = m.message.buttonsResponseMessage.selectedButtonId;
    responseType = "buttonResponse";
  } else if (m.message?.templateButtonReplyMessage) {
    selectedId = m.message.templateButtonReplyMessage.selectedId;
    responseType = "templateButton";
  }
  
  if (selectedId) {
    console.log(`Handling ${responseType} with ID: ${selectedId}`);
    return handleQuickReply(m, Matrix, selectedId);
  }
  
  return false;
}

export default menu;
