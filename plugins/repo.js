import axios from "axios";
import config from '../config.cjs';

const repo = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const args = m.body.slice(prefix.length).trim().split(/ +/).slice(1);

  if (["repo", "sc", "script", "info"].includes(cmd)) {
    const githubRepoURL = "https://github.com/caseyweb/CASEYRHODES-XMD";
    const channelURL = "https://whatsapp.com/channel/0029VakUEfb4o7qVdkwPk83E"; // Replace with your actual channel URL
    const supportURL = "https://chat.whatsapp.com/GbpVWoHH0XLHOHJsYLtbjH?mode=ac_t"; // Replace with your actual support group URL

    try {
      // Extract username and repo name from the URL
      const [, username, repoName] = githubRepoURL.match(/github\.com\/([^/]+)\/([^/]+)/);

      // Fetch repository details using GitHub API
      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}`);

      if (!response.data) {
        throw new Error("GitHub API request failed.");
      }

      const repoData = response.data;

      // Format the repository information
      const formattedInfo = `*BOT NAME:*\n> ${repoData.name}\n\n*OWNER NAME:*\n> ${repoData.owner.login}\n\n*STARS:*\n> ${repoData.stargazers_count}\n\n*FORKS:*\n> ${repoData.forks_count}\n\n*GITHUB LINK:*\n> ${repoData.html_url}\n\n*DESCRIPTION:*\n> ${repoData.description || "No description"}\n\n*Don't Forget To Star and Fork Repository*\n\n> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ 🖤*`;

      // Create buttons - Join Channel, Send Audio, and Support
      const buttons = [
        {
          buttonId: `${prefix}sendaudio`,
          buttonText: { displayText: "🔊 Send Audio" },
          type: 1
        },
        {
          buttonId: `${channelURL}`,
          buttonText: { displayText: "📢 Join Channel" },
          type: 4 // Type 4 is for URL/link buttons
        },
        {
          buttonId: `${supportURL}`,
          buttonText: { displayText: "join group🚀" },
          type: 4 // Type 4 is for URL/link buttons
        }
      ];

      // Send an image with the formatted info as a caption and buttons
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

  // Handle button actions
  if (m.message?.buttonsResponseMessage) {
    const selectedButtonId = m.message.buttonsResponseMessage.selectedButtonId;
    
    if (selectedButtonId === `${prefix}sendaudio`) {
      // Send the audio file
      await gss.sendMessage(
        m.from,
        {
          audio: { url: "https://files.catbox.moe/a95ye6.aac" },
          mimetype: "audio/mp4",
          ptt: true
        },
        { quoted: m }
      );
    }
    // Note: URL buttons (type 4) are handled automatically by WhatsApp
    // and don't trigger the buttonsResponseMessage event
  }
};

export default repo;
