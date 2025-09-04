import config from "../config.cjs";
import fs from "fs";
import path from "path";
import pkg from "@whiskeysockets/baileys";

const { proto } = pkg;

const online = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const body = m.body || "";
    const cmd = body.startsWith(prefix)
      ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
      : "";

    if (!["online", "whosonline", "onlinemembers"].includes(cmd)) return;

    // React to trigger message
    try {
      await Matrix.sendMessage(m.from, {
        react: { text: "🟢", key: m.key }
      });
    } catch (err) {
      console.error("Reaction failed:", err);
    }

    const isGroup = m.from.endsWith("@g.us");
    if (!isGroup) {
      return await Matrix.sendMessage(m.from, { text: "❌ This command can only be used in a group!" }, { quoted: m });
    }

    const groupData = await Matrix.groupMetadata(m.from);
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const ownerNumber = config.OWNER_NUMBER + "@s.whatsapp.net";
    const isOwner = m.sender === ownerNumber || m.sender === botNumber;
    const isAdmin = groupData.participants.some(p => p.id === m.sender && p.admin);

    if (!isAdmin && !isOwner) {
      return await Matrix.sendMessage(m.from, { text: "❌ This command is for admins and owner only!" }, { quoted: m });
    }

    const onlineMembers = new Set();

    // Request presence updates for all participants
    const presencePromises = groupData.participants.map(participant => 
      Matrix.presenceSubscribe(participant.id)
        .then(() => Matrix.sendPresenceUpdate('composing', participant.id))
        .catch(() => {}) // Silently handle errors for individual participants
    );

    await Promise.all(presencePromises);

    // Presence update handler
    const presenceHandler = (json) => {
      try {
        for (const id in json.presences) {
          const presence = json.presences[id]?.lastKnownPresence;
          if (['available', 'composing', 'recording'].includes(presence)) {
            onlineMembers.add(id);
          }
        }
      } catch (e) {
        console.error("Error in presence handler:", e);
      }
    };

    Matrix.ev.on('presence.update', presenceHandler);

    // Setup cleanup and response
    const checks = 3;
    const checkInterval = 5000;
    let checksDone = 0;

    // Pick random image from assets/
    const imageDir = path.join(process.cwd(), "assets");
    let randomImage = null;
    if (fs.existsSync(imageDir)) {
      const images = fs.readdirSync(imageDir).filter(file => file.match(/\.(jpg|png|jpeg|webp)$/i));
      if (images.length > 0) {
        randomImage = path.join(imageDir, images[Math.floor(Math.random() * images.length)]);
      }
    }

    // Verified contact (quoted base)
    const verifiedContact = {
      key: {
        fromMe: false,
        participant: `0@s.whatsapp.net`,
        remoteJid: "status@broadcast"
      },
      message: {
        contactMessage: {
          displayName: "Caseyrhodes-AI",
          vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
        }
      }
    };

    const checkOnline = async () => {
      try {
        checksDone++;
        
        if (checksDone >= checks) {
          clearInterval(interval);
          Matrix.ev.off('presence.update', presenceHandler);
          
          if (onlineMembers.size === 0) {
            return await Matrix.sendMessage(m.from, { text: "⚠️ Couldn't detect any online members. They might be hiding their presence." }, { quoted: m });
          }
          
          const onlineArray = Array.from(onlineMembers);
          const onlineList = onlineArray.map((member, index) => 
            `${index + 1}. @${member.split('@')[0]}`
          ).join('\n');
          
          // Channel forwarding context (reusable)
          const channelContext = {
            mentionedJid: onlineArray,
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363402973786789@newsletter',
              newsletterName: 'Caseyrhodes AI',
              serverMessageId: 143
            }
          };

          let messageContent = {
            caption: ` *ᴏɴʟɪɴᴇ ᴍᴇᴍʙᴇʀꜱ* (${onlineArray.length}/${groupData.participants.length}):\n\n${onlineList}\n\n _ꜰᴀꜱᴛ ᴀꜱꜰ!_ `,
            contextInfo: channelContext
          };

          if (randomImage) {
            messageContent.image = fs.readFileSync(randomImage);
          } else {
            delete messageContent.caption;
            messageContent.text = ` *ᴏɴʟɪɴᴇ ᴍᴇᴍʙᴇʀꜱ* (${onlineArray.length}/${groupData.participants.length}):\n\n${onlineList}\n\n _ꜰᴀꜱᴛ ᴀꜱꜰ!_ `;
          }

          // Send image/text with caption + channel context
          await Matrix.sendMessage(m.from, messageContent, { quoted: verifiedContact });
        }
      } catch (e) {
        console.error("Error in checkOnline:", e);
        await Matrix.sendMessage(m.from, { text: `ᴄᴀʟᴍꜱ ᴇʀʀᴏʀ ᴡʜɪʟᴇ ᴄʜᴇᴄᴋɪɴɢ` }, { quoted: m });
      }
    };

    const interval = setInterval(checkOnline, checkInterval);

    // Set timeout to clean up if something goes wrong
    setTimeout(() => {
      clearInterval(interval);
      Matrix.ev.off('presence.update', presenceHandler);
    }, checkInterval * checks + 10000); // Extra 10 seconds buffer

  } catch (e) {
    console.error("Error in online command:", e);
    await Matrix.sendMessage(m.from, { text: `❌ An error occurred: ${e.message}` }, { quoted: m });
  }
};

export default online;
