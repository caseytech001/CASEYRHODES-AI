import axios from 'axios';
import config from '../config.cjs';

const githubStalk = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();
    const args = text.split(' ');

    const validCommands = ['githubstalk', 'ghstalk'];

    if (validCommands.includes(cmd)) {
      if (!args[0]) {
        // Send message with button to prompt for username
        const buttonMessage = {
          text: "🌟 *GitHub Stalker* 🌟\n\nPlease provide a GitHub username to stalk.\nExample: `!ghstalk octocat`",
          footer: "GitHub Stalker Bot",
          buttons: [
            { buttonId: `${prefix}help githubstalk`, buttonText: { displayText: "📖 Help" }, type: 1 },
            { buttonId: `${prefix}cancel`, buttonText: { displayText: "❌ Cancel" }, type: 1 }
          ],
          headerType: 1
        };
        return await gss.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
      }

      const username = args[0];

      try {
        // Show waiting message with button
        const waitMsg = {
          text: `⏳ Fetching GitHub data for *${username}*...`,
          footer: "This may take a moment",
          buttons: [
            { buttonId: `${prefix}cancel`, buttonText: { displayText: "❌ Cancel" }, type: 1 }
          ],
          headerType: 1
        };
        await gss.sendMessage(m.key.remoteJid, waitMsg, { quoted: m });

        // Fetch GitHub user data using Axios
        const githubResponse = await axios.get(`https://api.github.com/users/${username}`);
        const userData = githubResponse.data;

        if (githubResponse.status !== 200) {
          return await gss.sendMessage(m.key.remoteJid, { 
            text: `❌ GitHub user *${username}* not found.` 
          }, { quoted: m });
        }

        // Construct the response message
        let responseMessage = `🌟 *GitHub Profile - @${userData.login}*\n\n`;
        responseMessage += `  ◦  *Name*: ${userData.name || 'N/A'}\n`;
        responseMessage += `  ◦  *Username*: @${userData.login}\n`;
        responseMessage += `  ◦  *Bio*: ${userData.bio || 'N/A'}\n`;
        responseMessage += `  ◦  *ID*: ${userData.id}\n`;
        responseMessage += `  ◦  *Node ID*: ${userData.node_id}\n`;
        responseMessage += `  ◦  *Profile URL*: ${userData.avatar_url}\n`;
        responseMessage += `  ◦  *GitHub URL*: ${userData.html_url}\n`;
        responseMessage += `  ◦  *Type*: ${userData.type}\n`;
        responseMessage += `  ◦  *Admin*: ${userData.site_admin ? 'Yes' : 'No'}\n`;
        responseMessage += `  ◦  *Company*: ${userData.company || 'N/A'}\n`;
        responseMessage += `  ◦  *Blog*: ${userData.blog || 'N/A'}\n`;
        responseMessage += `  ◦  *Location*: ${userData.location || 'N/A'}\n`;
        responseMessage += `  ◦  *Email*: ${userData.email || 'N/A'}\n`;
        responseMessage += `  ◦  *Public Repositories*: ${userData.public_repos}\n`;
        responseMessage += `  ◦  *Public Gists*: ${userData.public_gists}\n`;
        responseMessage += `  ◦  *Followers*: ${userData.followers}\n`;
        responseMessage += `  ◦  *Following*: ${userData.following}\n`;
        responseMessage += `  ◦  *Created At*: ${userData.created_at}\n`;
        responseMessage += `  ◦  *Updated At*: ${userData.updated_at}\n`;

        const githubReposResponse = await axios.get(`https://api.github.com/users/${username}/repos?per_page=5&sort=stargazers_count&direction=desc`);
        const reposData = githubReposResponse.data;

        if (reposData.length > 0) {
          const topRepos = reposData.slice(0, 5); // Display the top 5 starred repositories

          const reposList = topRepos.map(repo => {
            return `  ◦  *Repository*: [${repo.name}](${repo.html_url})
  ◦  *Description*: ${repo.description || 'N/A'}
  ◦  *Stars*: ${repo.stargazers_count}
  ◦  *Forks*: ${repo.forks}`;
          });

          const reposCaption = `📚 *Top Starred Repositories*\n\n${reposList.join('\n\n')}`;
          responseMessage += `\n\n${reposCaption}`;
        } else {
          responseMessage += `\n\nNo public repositories found.`;
        }

        // Create buttons for additional actions
        const buttons = [
          {
            buttonId: `${prefix}ghrepos ${username}`,
            buttonText: { displayText: "📂 All Repos" },
            type: 1
          },
          {
            buttonId: `${prefix}ghfollowers ${username}`,
            buttonText: { displayText: "👥 Followers" },
            type: 1
          },
          {
            buttonId: `${prefix}ghuser ${username}`,
            buttonText: { displayText: "🌐 Visit Profile" },
            type: 1
          }
        ];

        // Send the message with the updated Baileys syntax including buttons
        await gss.sendMessage(m.key.remoteJid, {
          image: { url: userData.avatar_url },
          caption: responseMessage,
          footer: "GitHub Stalker Bot • Powered by Caseyrhodes,
          buttons: buttons,
          headerType: 4
        }, { quoted: m });

      } catch (error) {
        console.error('Error fetching GitHub data:', error);
        
        // Error message with button to try again
        const errorButtons = [
          { buttonId: `${prefix}ghstalk ${args[0]}`, buttonText: { displayText: "🔄 Try Again" }, type: 1 },
          { buttonId: `${prefix}help githubstalk`, buttonText: { displayText: "📖 Help" }, type: 1 }
        ];
        
        await gss.sendMessage(m.key.remoteJid, { 
          text: '❌ An error occurred while fetching GitHub data.\n\nPossible reasons:\n• User not found\n• Rate limit exceeded\n• Network issues',
          buttons: errorButtons,
          footer: "GitHub Stalker Bot"
        }, { quoted: m });
      }
    }
  } catch (error) {
    console.error('Error processing the command:', error);
    await gss.sendMessage(m.key.remoteJid, { 
      text: '❌ An error occurred while processing the command.' 
    }, { quoted: m });
  }
};

export default githubStalk;
