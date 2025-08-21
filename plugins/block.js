import config from '../config.cjs';

const block = async (m, gss) => {
  try {
    const botNumber = await gss.decodeJid(gss.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['block'];

    if (!validCommands.includes(cmd)) return;
    
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");

    try {
        const chatId = m.chat; // Get current chat ID
        await gss.updateBlockStatus(chatId, "block");
        await m.react("✅");
        return m.reply("_Chat has been blocked successfully._");
    } catch (error) {
        console.error("Block command error:", error);
        await m.react("❌");
        return m.reply(`_Failed to block this chat._\nError: ${error.message}_`);
    }
  } catch (error) {
    console.error("Unexpected error in block command:", error);
  }
};

export default block;
