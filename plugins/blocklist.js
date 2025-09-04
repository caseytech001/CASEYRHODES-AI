import config from '../config.cjs'; // Adjust if config is ESM
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

// List of random emojis to use for blocked numbers
const blockEmojis = ["🚫", "⛔", "🔒", "🔞", "📛", "🚷", "🚯", "🚳", "🚭", "❌", "🛑", "💢", "♨️", "💀", "☠️", "⚠️", "🔞"];

// Helper function to get random emoji
function getRandomBlockEmoji() {
    return blockEmojis[Math.floor(Math.random() * blockEmojis.length)];
}

const blocklist = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX || config.Prefix || ".";
    const cmd = m.body?.startsWith(prefix)
      ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
      : "";

    if (!["blocklist"].includes(cmd)) return;

    // React to the message (matching original 'react: "📋"')
    try {
        await Matrix.sendMessage(m.from, { react: { text: "📋", key: m.key } });
    } catch (err) {
        console.error("Failed to react:", err);
    }

    // Ownership check (aligned with handler's isCreator)
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const ownerNumber = config.OWNER_NUMBER + '@s.whatsapp.net';
    const isOwner = m.sender === ownerNumber || m.sender === botNumber;

    if (!isOwner) {
        return await Matrix.sendMessage(m.from, { text: "*📛 You are not the owner!*" }, { quoted: m });
    }

    // Fetch the block list
    const blockedUsers = await Matrix.fetchBlocklist();

    if (blockedUsers.length === 0) {
        return await Matrix.sendMessage(m.from, { text: "📋 Your block list is empty." }, { quoted: m });
    }

    // Format the blocked users with count and random emojis
    const list = blockedUsers
        .map((user, i) => `${i + 1}. ${getRandomBlockEmoji()} ${user.split('@')[0]}`)
        .join('\n');

    const count = blockedUsers.length;
    const dec = `📋 *ʙʟᴏᴄᴋᴇᴅ ᴜꜱᴇʀꜱ* (${count}):\n\n${list}\n\n*ʙᴏᴛ ɴᴀᴍᴇ:* ${config.BOT_NAME}`;

    const verifiedContact = {
        key: {
            fromMe: false,
            participant: '0@s.whatsapp.net',
            remoteJid: 'status@broadcast'
        },
        message: {
            contactMessage: {
                displayName: `${config.BOT_NAME}`,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.BOT_NAME}\nORG:${config.BOT_NAME} TEAM;\nTEL;type=CELL;type=VOICE;waid=${config.MOD_NUMBER}:${config.MOD_NUMBER}\nEND:VCARD`
            }
        }
    };

    // Send object
    let sendObj = {
      text: dec,
      contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
              newsletterJid: '120363402973786789@newsletter',
              newsletterName: `${config.BOT_NAME} Updates`,
              serverMessageId: Math.floor(Math.random() * 1000)
          }
      }
    };

    // Send blocklist message
    await Matrix.sendMessage(m.from, sendObj, { quoted: verifiedContact });
        
  } catch (error) {
    console.error(`❌ Blocklist error: ${error.message}`);
    await Matrix.sendMessage(
      m.from,
      {
        text: `◈━━━━━━━━━━━━━━━━◈
│❒ *Blocklist* hit a snag! Error: ${
          error.message || "Failed to fetch block list"
        } 😡
◈━━━━━━━━━━━━━━━━◈`,
      },
      { quoted: m }
    );
  }
};

export default blocklist;
