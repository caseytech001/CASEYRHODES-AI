import config from '../config.cjs';
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
    j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
    s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const deleteMessage = async (m, gss) => {
  try {
    const botNumber = gss.user.id;
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    
    const validCommands = ['del', 'delete'];

    if (validCommands.includes(cmd)) {
      if (!isCreator) {
        const templateButtons = [
          { index: 1, urlButton: { displayText: '📞 Contact Owner', url: `https://wa.me/${config.OWNER_NUMBER.replace('+', '')}` }},
          { index: 2, quickReplyButton: { displayText: '🏠 Main Menu', id: '.menu' }}
        ];

        const message = {
          text: `🚫 *${toFancyFont("Access Denied")}*\n\nThis command is restricted to the bot owner only.`,
          footer: 'Bot Security',
          templateButtons: templateButtons,
          headerType: 1,
          mentions: [m.sender]
        };
        
        return await gss.sendMessage(m.from, message);
      }

      if (!m.quoted) {
        const templateButtons = [
          { index: 1, quickReplyButton: { displayText: '❓ How to use', id: '.help delete' }},
          { index: 2, quickReplyButton: { displayText: '🏠 Main Menu', id: '.menu' }}
        ];

        const message = {
          text: `📝 *${toFancyFont("Usage Instructions")}*\n\nPlease reply to the message you want to delete with the command:\n\`${prefix}delete\``,
          footer: 'Delete Command',
          templateButtons: templateButtons,
          headerType: 1,
          mentions: [m.sender]
        };
        
        return await gss.sendMessage(m.from, message);
      }

      // Delete the quoted message
      const key = {
        remoteJid: m.from,
        id: m.quoted.id,
        participant: m.quoted.participant || m.quoted.sender
      };

      await gss.sendMessage(m.from, { delete: key });

      // Success response with quick replies
      const quickReplies = [
        { index: 1, quickReplyButton: { displayText: '🗑️ Delete Another', id: '.delete' }},
        { index: 2, quickReplyButton: { displayText: '🏠 Main Menu', id: '.menu' }},
        { index: 3, quickReplyButton: { displayText: '⚙️ Settings', id: '.settings' }}
      ];

      const successMessage = {
        text: `✅ *${toFancyFont("Success")}*\n\nMessage has been successfully deleted!`,
        footer: 'Delete Command',
        templateButtons: quickReplies,
        headerType: 1
      };
      
      await gss.sendMessage(m.from, successMessage);

    }
  } catch (error) {
    console.error('Error deleting message:', error);
    
    const templateButtons = [
      { index: 1, quickReplyButton: { displayText: '🔄 Try Again', id: '.delete' }},
      { index: 2, quickReplyButton: { displayText: '📋 Report Issue', id: '.report' }},
      { index: 3, quickReplyButton: { displayText: '🏠 Main Menu', id: '.menu' }}
    ];

    const errorMessage = {
      text: `❌ *${toFancyFont("Error")}*\n\nFailed to delete the message. This might be because:\n• The message is too old\n• I don't have permission to delete it\n• The message was already deleted\n\nError: ${error.message}`,
      footer: 'Delete Command - Error',
      templateButtons: templateButtons,
      headerType: 1,
      mentions: [m.sender]
    };
    
    await gss.sendMessage(m.from, errorMessage);
  }
};

export default deleteMessage;
