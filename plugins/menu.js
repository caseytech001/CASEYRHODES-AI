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

const menu = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const mode = config.MODE === "public" ? "public" : "private";
    
    // Command categories - moved inside the function to access prefix
    const commandCategories = {
      [`${prefix}download`]: {
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
      [`${prefix}group`]: {
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
      [`${prefix}fun`]: {
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
      [`${prefix}owner`]: {
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
      [`${prefix}ai`]: {
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
      [`${prefix}anime`]: {
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
      [`${prefix}converter`]: {
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
      [`${prefix}other`]: {
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
      [`${prefix}reactions`]: {
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
      [`${prefix}main`]: {
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

    const totalCommands = Object.values(commandCategories).reduce((acc, category) => acc + category.commands.length, 0);

    const validCommands = ["list", "help", "menu"];
    const subMenuCommands = Object.keys(commandCategories);

    // Fetch image for all cases
    const menuImage = await fetchMenuImage();

    // Handle main menu
    if (validCommands.includes(cmd) || !cmd) {
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

      // Create buttons for each category
      const buttons = Object.keys(commandCategories).map(category => {
        const categoryName = category.replace(prefix, '').toUpperCase();
        return {
          buttonId: category,
          buttonText: { displayText: categoryName },
          type: 1
        };
      });

      // Add a ping button
      buttons.push({
        buttonId: `${prefix}ping`,
        buttonText: { displayText: '🚀 SPEED' },
        type: 1
      });

      // Create button message
      let buttonMessage = {
        text: mainMenu,
        footer: "✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟",
        buttons: buttons,
        headerType: 1
      };

      // Add image if available
      if (menuImage) {
        buttonMessage.image = menuImage;
        buttonMessage.caption = mainMenu;
      }

      // Send message
      await Matrix.sendMessage(m.from, buttonMessage, { 
        quoted: m
      });

      // Send audio as a voice note
      try {
        await Matrix.sendMessage(m.from, { 
          audio: { url: "https://files.catbox.moe/mwohwu.mp3" },
          mimetype: "audio/mp4", 
          ptt: true
        }, { 
          quoted: m
        });
      } catch (audioError) {
        console.error("❌ Failed to send audio:", audioError.message);
        // Continue without audio if it fails
      }
    }
  
    // Handle sub-menu commands
    if (subMenuCommands.includes(`${prefix}${cmd}`)) {
      const category = `${prefix}${cmd}`;
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

      // Create back button
      const backButton = {
        buttonId: `${prefix}menu`,
        buttonText: { displayText: "🔙 ʙᴀᴄᴋ ᴛᴏ ᴍᴀɪɴ ᴍᴇɴᴜ" },
        type: 1
      };

      // Create button message for sub-menu
      let subButtonMessage = {
        text: fullResponse,
        footer: "✆︎Pσɯҽɾҽԃ Ⴆყ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟",
        buttons: [backButton],
        headerType: 1
      };

      // Add image if available
      if (menuImage) {
        subButtonMessage.image = menuImage;
        subButtonMessage.caption = fullResponse;
      }

      // Send sub-menu
      await Matrix.sendMessage(m.from, subButtonMessage, { quoted: m });
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
