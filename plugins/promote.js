import config from '../config.cjs';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from "@whiskeysockets/baileys";

function toFancyFont(text, isUpperCase = false) {
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
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const promote = async (m, gss) => {
  try {
    const botNumber = gss.user.id;
    const prefix = config.PREFIX;
    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['promote', 'admin', 'toadmin'];

    if (!validCommands.includes(cmd)) return;

    if (!m.isGroup) {
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      const messageOptions = {
        buttons,
        contextInfo: {
          mentionedJid: [m.sender],
        },
      };
      return gss.sendMessage(m.from, {
        text: `*${toFancyFont("This command can only be used in groups!")}*`,
        ...messageOptions,
      }, { quoted: m });
    }
    
    const groupMetadata = await gss.groupMetadata(m.from);
    const participants = groupMetadata.participants;
    const botAdmin = participants.find(p => p.id === botNumber)?.admin;
    const senderAdmin = participants.find(p => p.id === m.sender)?.admin;

    if (!botAdmin) {
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      const messageOptions = {
        buttons,
        contextInfo: {
          mentionedJid: [m.sender],
        },
      };
      return gss.sendMessage(m.from, {
        text: `*${toFancyFont("Bot must be an admin to use this command!")}*`,
        ...messageOptions,
      }, { quoted: m });
    }
    if (!senderAdmin) {
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      const messageOptions = {
        buttons,
        contextInfo: {
          mentionedJid: [m.sender],
        },
      };
      return gss.sendMessage(m.from, {
        text: `*${toFancyFont("You must be an admin to use this command!")}*`,
        ...messageOptions,
      }, { quoted: m });
    }

    let mentionedJid = [];
    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      mentionedJid = m.message.extendedTextMessage.contextInfo.mentionedJid;
    }
    
    if (m.message?.extendedTextMessage?.contextInfo?.participant) {
      mentionedJid.push(m.message.extendedTextMessage.contextInfo.participant);
    }

    const users = mentionedJid.length > 0
      ? mentionedJid
      : text.replace(/[^0-9]/g, '').length > 0
      ? [text.replace(/[^0-9]/g, '') + '@s.whatsapp.net']
      : [];

    if (users.length === 0) {
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      const messageOptions = {
        buttons,
        contextInfo: {
          mentionedJid: [m.sender],
        },
      };
      return gss.sendMessage(m.from, {
        text: `*${toFancyFont("Please mention or quote a user to promote!")}*`,
        ...messageOptions,
      }, { quoted: m });
    }

    const validUsers = users.filter(Boolean);

    const usernames = await Promise.all(
      validUsers.map(async (user) => {
        try {
          const contact = await gss.getContact(user);
          return contact.notify || contact.name || user.split('@')[0];
        } catch (error) {
          return user.split('@')[0];
        }
      })
    );

    await gss.groupParticipantsUpdate(m.from, validUsers, 'promote')
      .then(() => {
        const promotedNames = usernames.map(username => `@${username}`).join(', ');
        const buttons = [
          {
            buttonId: `.menu`,
            buttonText: { displayText: `${toFancyFont("Menu")}` },
            type: 1,
          },
        ];
        const messageOptions = {
          buttons,
          contextInfo: {
            mentionedJid: validUsers,
          },
        };
        gss.sendMessage(m.from, {
          text: `*${toFancyFont("Users " + promotedNames + " promoted successfully in the group " + groupMetadata.subject + "!")}*`,
          ...messageOptions,
        }, { quoted: m });
      })
      .catch(() => {
        const buttons = [
          {
            buttonId: `.promote`,
            buttonText: { displayText: `${toFancyFont("Try Again")}` },
            type: 1,
          },
        ];
        const messageOptions = {
          buttons,
          contextInfo: {
            mentionedJid: [m.sender],
          },
        };
        gss.sendMessage(m.from, {
          text: `*${toFancyFont("Failed to promote user(s) in the group!")}*`,
          ...messageOptions,
        }, { quoted: m });
      });
  } catch (error) {
    console.error('Error:', error);
    const buttons = [
      {
        buttonId: `.promote`,
        buttonText: { displayText: `${toFancyFont("Try Again")}` },
        type: 1,
      },
    ];
    const messageOptions = {
      buttons,
      contextInfo: {
        mentionedJid: [m.sender],
      },
    };
    gss.sendMessage(m.from, {
      text: `*${toFancyFont("An error occurred while processing the command!")}*`,
      ...messageOptions,
    }, { quoted: m });
  }
};

export default promote;
