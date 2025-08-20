import config from '../config.cjs';
import pkg, { prepareWAMessageMedia } from "baileys-pro";
const { generateWAMessageFromContent, proto } = pkg;

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

const deleteMessage = async (m, gss) => {
  try {
    const botNumber = await gss.decodeJid(gss.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['del', 'delete'];

    if (validCommands.includes(cmd)) {
      if (!isCreator) {
        const buttons = [
          {
            quickReplyButton: {
              displayText: `👤 ${toFancyFont("Contact Owner")}`,
              id: '.owner'
            }
          }
        ];
        
        const buttonMessage = {
          text: "*THIS IS AN OWNER COMMAND*",
          footer: "Only the bot owner can use this command",
          buttons: buttons,
          headerType: 1,
          mentions: [m.sender]
        };
        
        return gss.sendMessage(m.from, buttonMessage);
      }

      if (!m.quoted) {
        const buttons = [
          {
            quickReplyButton: {
              displayText: `🤲 ${toFancyFont("Help")}`,
              id: '.help'
            }
          }
        ];
        
        const buttonMessage = {
          text: '✳️ Reply to the message you want to delete',
          footer: "This command requires you to reply to a message",
          buttons: buttons,
          headerType: 1,
          mentions: [m.sender]
        };
        
        return gss.sendMessage(m.from, buttonMessage);
      }

      const key = {
        remoteJid: m.from,
        id: m.quoted.key.id,
        participant: m.quoted.key.participant || m.quoted.key.remoteJid
      };

      await gss.sendMessage(m.from, { delete: key });

      const buttons = [
        {
          quickReplyButton: {
            displayText: `📃 ${toFancyFont("Menu")}`,
            id: '.menu'
          }
        }
      ];
      
      const buttonMessage = {
        text: `*${toFancyFont("Message deleted successfully")}*`,
        footer: "Message was successfully deleted",
        buttons: buttons,
        headerType: 1,
        mentions: [m.sender]
      };
      
      return gss.sendMessage(m.from, buttonMessage);
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    
    const buttons = [
      {
        quickReplyButton: {
          displayText: `⚠️ ${toFancyFont("Report")}`,
          id: '.report'
        }
      }
    ];
    
    const buttonMessage = {
      text: 'An error occurred while trying to delete the message.',
      footer: "Please report this issue if it persists",
      buttons: buttons,
      headerType: 1,
      mentions: [m.sender]
    };
    
    return gss.sendMessage(m.from, buttonMessage);
  }
};

export default deleteMessage;
