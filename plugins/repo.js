import axios from "axios";
import config from '../config.cjs';

const repo = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const args = m.body.slice(prefix.length).trim().split(/ +/).slice(1);

  if (["repo", "sc", "script", "info"].includes(cmd)) {
    const githubRepoURL = "https://github.com/caseyweb/CASEYRHODES-XMD";
    const channelURL = "https://whatsapp.com/channel/0029VakUEfb4o7qVdkwPk83E";
    const supportURL = "https://chat.whatsapp.com/GbpVWoHH0XLHOHJsYLtbjH?mode=ac_t";

    try {
      const [, username, repoName] = githubRepoURL.match(/github\.com\/([^/]+)\/([^/]+)/);
      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}`);

      if (!response.data) {
        throw new Error("GitHub API request failed.");
      }

      const repoData = response.data;
      const formattedInfo = `*BOT NAME:*\n> ${repoData.name}\n\n*OWNER NAME:*\n> ${repoData.owner.login}\n\n*STARS:*\n> ${repoData.stargazers_count}\n\n*FORKS:*\n> ${repoData.forks_count}\n\n*GITHUB LINK:*\n> ${repoData.html_url}\n\n*DESCRIPTION:*\n> ${repoData.description || "No description"}\n\n*Don't Forget To Star and Fork Repository*\n\n> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ 🖤*`;

      // Create buttons
      const buttons = [
        {
          buttonId: `${prefix}sendaudio`,
          buttonText: { displayText: "🔊 Send Audio" },
          type: 1
        },
        {
          buttonId: `${prefix}joinchannel`,
          buttonText: { displayText: "📢 Join Channel" },
          type: 1
        },
        {
          buttonId: `${prefix}support`,
          buttonText: { displayText: "Join Group 🚀" },
          type: 1
        }
      ];

      // Send message with buttons
      await gss.sendMessage(
        m.from,
        {
          image: { url: "https://files.catbox.moe/y3j3kl.jpg" },
          caption: formattedInfo,
          buttons: buttons,
          headerType: 1
        },
        { quoted: m }
      );

    } catch (error) {
      console.error("Error in repo command:", error);
      m.reply("Sorry, something went wrong while fetching the repository information. Please try again later.");
    }
  }

  // Handle button responses - This should be outside the command check
  if (m.message?.buttonsResponseMessage) {
    const selectedButtonId = m.message.buttonsResponseMessage.selectedButtonId;
    
    if (selectedButtonId === `${prefix}sendaudio`) {
      try {
        await gss.sendMessage(
          m.from,
          {
            audio: { url: "https://files.catbox.moe/a95ye6.aac" },
            mimetype: "audio/mp4",
            ptt: true
          },
          { quoted: m }
        );
      } catch (error) {
        console.error("Error sending audio:", error);
        m.reply("Failed to send audio. Please try again.");
      }
    }
    else if (selectedButtonId === `${prefix}joinchannel`) {
      // Send channel link
      m.reply("Join our channel: https://whatsapp.com/channel/0029VakUEfb4o7qVdkwPk83E");
    }
    else if (selectedButtonId === `${prefix}support`) {
      // Send support group link
      m.reply("Join our support group: https://chat.whatsapp.com/GbpVWoHH0XLHOHJsYLtbjH?mode=ac_t");
    }
  }
};

export default repo;
