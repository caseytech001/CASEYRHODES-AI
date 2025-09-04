import config from '../config.cjs';

const linkgc = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['linkgc', 'grouplink'];

    if (!validCommands.includes(cmd)) return;

    if (!m.isGroup) {
      return m.reply('*📛 THIS COMMAND CAN ONLY BE USED IN GROUPS.*');
    }

    // Get group metadata using the new method
    const groupMetadata = await gss.groupMetadata(m.from);
    const botNumber = gss.user.id; // No need to decodeJid in newer versions
    const isBotAdmin = groupMetadata.participants.find(p => p.id === botNumber)?.admin;

    if (!isBotAdmin) {
      return m.reply('*📛 BOT MUST BE AN ADMIN TO USE THIS COMMAND.*');
    }

    // Get group invite code using the new method
    const response = await gss.groupInviteCode(m.from);
    
    // Send message with updated syntax
    await gss.sendMessage(m.from, {
      text: `https://chat.whatsapp.com/${response}\n\nGroup Link: ${groupMetadata.subject}`,
      mentions: [] // Add empty mentions array to avoid errors
    });

  } catch (error) {
    console.error('Error:', error);
    m.reply('An error occurred while processing the command.');
  }
};

export default linkgc;
