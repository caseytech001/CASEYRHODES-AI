import moment from "moment-timezone";
import fs from "fs";
import os from "os";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";
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
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ",
    h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ",
    o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ",
    v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const menu = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const mode = config.MODE === "public" ? "public" : "private";
    const totalCommands = 70;

    const validCommands = ["repo2", "sc2", "script2"];
    
    // Fetch repo data
    const repoUrl = "https://api.github.com/repos/caswyweb/CASEYRHODES-XMD";
    const headers = {
      Accept: "application/vnd.github.v3+json",
      ...(config.GITHUB_TOKEN ? { Authorization: `token ${config.GITHUB_TOKEN}` } : {}),
    };

    const response = await axios.get(repoUrl, { headers });
    const repoData = response.data;

    if (response.status !== 200 || !repoData.full_name) {
      throw new Error("Failed to fetch repo data or repo not found.");
    }

    const createdDate = new Date(repoData.created_at).toLocaleDateString("en-GB");
    const lastUpdateDate = new Date(repoData.updated_at).toLocaleDateString("en-GB");

    // Image fetch utility
    async function fetchMenuImage() {
      const imageUrl = "https://files.catbox.moe/nj1w1s.jpg";
      for (let i = 0; i < 3; i++) {
        try {
          const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
          return Buffer.from(response.data, "binary");
        } catch (error) {
          if (error.response?.status === 429 && i < 2) {
            console.log(`Rate limit hit, retrying in 2s...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
          console.error("❌ Failed to fetch image:", error);
          return null;
        }
      }
    }

    // Fetch image for all cases
    const menuImage = await fetchMenuImage();

    // Handle main menu
    if (validCommands.includes(cmd)) {
      const mainMenu = `*${toFancyFont("Caseyrhodes ai")}* ${toFancyFont("Repo")}\n
${toFancyFont("*Bot*")}: ${repoData.name || "N/A"}
${toFancyFont("*Stars*")}: ${repoData.stargazers_count || 0} *(star it, fam!)*
${toFancyFont("*Forks*")}: ${repoData.forks_count || 0} *(fork it, now!)*
${toFancyFont("*Description*")}: ${repoData.description || "No description"}
${toFancyFont("*Created*")}: ${createdDate}
${toFancyFont("*Updated*")}: ${lastUpdateDate}
${toFancyFont("*Link*")}: ${repoData.html_url}

Give star and forks and deploy bot on *(render)* 
is alive *(24/8)* online✓


*${pushwish} @${m.pushName}*! 

> Tap a button to select a more cmd category:
`;

      const buttons = [
        {
          buttonId: `${prefix}menu`,
          buttonText: { displayText: `📃 ${toFancyFont("alive")}` },
          type: 1,
        },
        {
          buttonId: `${prefix}script`,
          buttonText: { displayText: `📃 ${toFancyFont("script")}` },
          type: 1,
        },
      ];

      const contextInfo = {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363302677217436@newsletter',
            newsletterName: 'CASEYRHODES-XMD 👻',
            serverMessageId: 143
        }
      };

      const messageOptions = {
        viewOnce: true,
        buttons: buttons,
        contextInfo: contextInfo,
        caption: mainMenu
      };

      // Send menu with or without image
      if (menuImage) {
        await Matrix.sendMessage(
          m.from,
          {
            image: menuImage,
            ...messageOptions
          },
          { quoted: m }
        );
      } else {
        await Matrix.sendMessage(
          m.from, 
          { 
            text: mainMenu, 
            ...messageOptions 
          }, 
          { quoted: m }
        );
      }
    }
  } catch (error) {
    console.error(`❌ Menu error: ${error.message}`);
    await Matrix.sendMessage(
      m.from,
      {
        text: `•
• *Caseyrhodes ai* hit a snag! Error: ${error.message || "Failed to load menu"} 😡
•`,
      },
      { quoted: m }
    );
  }
};

export default menu;
