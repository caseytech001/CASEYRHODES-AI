import config from '../config.cjs';
import pkg, { prepareWAMessageMedia } from "baileys-pro";
const { generateWAMessageFromContent, proto } = pkg;

function toFancyFont(text) {
  const fonts = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  return text
    .toLowerCase()
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const demote = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['demote', 'unadmin'];

    if (!validCommands.includes(cmd)) return;

    if (!m.isGroup) return gss.sendMessage(m.from, {
      text: "*📛 ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs*",
      viewOnce: true,
    }, { quoted: m });

    const groupMetadata = await gss.groupMetadata(m.from);
    const participants = groupMetadata.participants;
    const botNumber = await gss.decodeJid(gss.user.id);
    const botAdmin = participants.find(p => p.id === botNumber)?.admin;
    const senderAdmin = participants.find(p => p.id === m.sender)?.admin;

    if (!botAdmin) return gss.sendMessage(m.from, {
      text: "*📛 ʙᴏᴛ ᴍᴜsᴛ ʙᴇ ᴀɴ ᴀᴅᴍɪɴ ᴛᴏ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ*",
      viewOnce: true,
    }, { quoted: m });

    if (!senderAdmin) return gss.sendMessage(m.from, {
      text: "*📛 ʏᴏᴜ ᴍᴜsᴛ ʙᴇ ᴀɴ ᴀᴅᴍɪɴ ᴛᴏ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ*",
      viewOnce: true,
    }, { quoted: m });

    if (!m.mentionedJid) m.mentionedJid = [];

    if (m.quoted?.participant) m.mentionedJid.push(m.quoted.participant);

    const users = m.mentionedJid.length > 0
      ? m.mentionedJid
      : text.replace(/[^0-9]/g, '').length > 0
      ? [text.replace(/[^0-9]/g, '') + '@s.whatsapp.net']
      : [];

    if (users.length === 0) {
      const buttonMessage = {
        text: `*${toFancyFont("please mention or quote a user to demote")}*`,
        footer: "Click the button below to see usage",
        buttons: [
          { buttonId: `${prefix}demote @user`, buttonText: { displayText: "👤 Demote User" }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
      };
      
      return gss.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const validUsers = users.filter(Boolean);

    await gss.groupParticipantsUpdate(m.from, validUsers, 'demote')
      .then(() => {
        const demotedNames = validUsers.map(user => `@${user.split("@")[0]}`);
        const buttonMessage = {
          text: `*${toFancyFont("users")} ${demotedNames.join(', ')} ${toFancyFont("demoted successfully in the group")} ${groupMetadata.subject}*`,
          footer: "Click to promote them again",
          buttons: [
            { buttonId: `${prefix}promote @user`, buttonText: { displayText: "👤 Promote User" }, type: 1 }
          ],
          headerType: 1,
          viewOnce: true,
          mentions: validUsers
        };
        
        gss.sendMessage(m.from, buttonMessage, { quoted: m });
      })
      .catch((error) => {
        console.error('Demote error:', error);
        gss.sendMessage(m.from, {
          text: `*${toFancyFont("failed to demote user(s) in the group")}*`,
          viewOnce: true,
        }, { quoted: m });
      });
  } catch (error) {
    console.error('Error:', error);
    gss.sendMessage(m.from, {
      text: `*${toFancyFont("an error occurred while processing the command")}*`,
      viewOnce: true,
    }, { quoted: m });
  }
};

export default demote;
