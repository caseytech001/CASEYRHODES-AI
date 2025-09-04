import axios from 'axios';
import config from '../config.cjs';

const gitstalk = async (m, Matrix) => {
    try {
        const prefix = config.PREFIX || ".";
        const body = m.body || "";
        const cmd = body.startsWith(prefix)
            ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
            : "";
            
        if (cmd !== "gitstalk") return;

        const args = body.slice(prefix.length).trim().split(" ");
        const username = args[1];
        
        if (!username) {
            return await Matrix.sendMessage(
                m.from,
                { text: "Please provide a GitHub username.\nExample: .gitstalk caseyrhodes" },
                { quoted: m }
            );
        }

        const apiUrl = `https://api.github.com/users/${username}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        let userInfo = `👤 *Username*: ${data.name || data.login}
🔗 *Github Url*: ${data.html_url}
📝 *Bio*: ${data.bio || 'Not available'}
🏙️ *Location*: ${data.location || 'Unknown'}
📊 *Public Repos*: ${data.public_repos}
👥 *Followers*: ${data.followers} | Following: ${data.following}
📅 *Created At*: ${new Date(data.created_at).toDateString()}
🔭 *Public Gists*: ${data.public_gists}
> © CASEYRHODES TECH`;

        // Verified contact (quoted base)
        const verifiedContact = {
            key: {
                fromMe: false,
                participant: `0@s.whatsapp.net`,
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: "Caseyrhodes AI",
                    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
                }
            }
        };

        // Channel forwarding context (reusable)
        const channelContext = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363402973786789@newsletter',
                newsletterName: 'Caseyrhodes AI',
                serverMessageId: 269
            }
        };

        await Matrix.sendMessage(
            m.from,
            {
                image: { url: data.avatar_url },
                caption: userInfo,
                contextInfo: channelContext
            },
            { quoted: verifiedContact }
        );

    } catch (e) {
        console.log(e);
        await Matrix.sendMessage(
            m.from,
            { text: `❌ Error: ${e.response ? e.response.data.message : e.message}` },
            { quoted: m }
        );
    }
};

// Add pattern property for handler detection
gitstalk.pattern = /^gitstalk$/i;
gitstalk.desc = "Get information about a GitHub user";
gitstalk.category = "tools";
gitstalk.use = ".gitstalk <username>";

export default gitstalk;
