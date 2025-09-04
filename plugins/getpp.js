import config from "../config.cjs";

const getpp = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
    if (!["getpp", "pp"].includes(cmd)) return;
    
    await Matrix.sendMessage(m.from, { react: { text: "🖼️", key: m.key } });
    
    const isGroup = m.from.endsWith('@g.us');
    const sender = m.sender;
    
    const reply = async (text) => {
      await Matrix.sendMessage(m.from, { text }, { quoted: m });
    };
    
    const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant;
    const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    let targetJid;
    if (isGroup) {
      if (quotedParticipant && quotedMessage) {
        targetJid = quotedParticipant;
      } else {
        return reply(" ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ꜱᴏᴍᴇᴏɴᴇ'ꜱ ᴍᴇꜱꜱᴀɢᴇ ᴛᴏ ɢᴇᴛ ᴛʜᴇɪʀ ᴘʀᴏꜰɪʟᴇ ᴘɪᴄᴛᴜʀᴇ.");
      }
    } else {
      targetJid = m.from.endsWith("@s.whatsapp.net") ? m.from : sender;
    }
    
    let imageUrl;
    try {
      imageUrl = await Matrix.profilePictureUrl(targetJid, 'image');
    } catch {
      imageUrl = "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg";
    }
    
    // Fixed fakeVCard with proper structure
    const fakeVCard = {
      key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        remoteJid: "status@broadcast"
      },
      message: {
        contactMessage: {
          displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ✅",
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
        }
      }
    };

    const messageOptions = {
      image: { url: imageUrl },
      caption: ` ᴘʀᴏꜰɪʟᴇ ᴘɪᴄᴛᴜʀᴇ ᴏꜰ @${targetJid.split('@')[0]}`,
      mentions: [targetJid], // Fixed: Use 'mentions' instead of 'contextInfo.mentionedJid'
      contextInfo: {
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363402973786789@newsletter",
          newsletterName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟",
          serverMessageId: -1
        }
      }
    };
    
    await Matrix.sendMessage(m.from, messageOptions, { quoted: fakeVCard });
    
  } catch (err) {
    console.error("Error in getpp:", err);
    // Define reply function again in case it wasn't defined earlier in the catch block
    const reply = async (text) => {
      await Matrix.sendMessage(m.from, { text }, { quoted: m });
    };
    reply("❌ Failed to fetch profile picture.");
  }
};

export default getpp;
