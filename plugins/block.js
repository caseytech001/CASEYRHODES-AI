import config from '../config.cjs';

const block = async (m, gss) => {
  try {
    const botNumber = gss.user.id.split(':')[0] + '@s.whatsapp.net';
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['block'];

    if (!validCommands.includes(cmd)) return;
    
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");

    // Extract user from mention, quote, or text input
    let users;
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      users = m.mentionedJid[0];
    } else if (m.quoted) {
      users = m.quoted.sender;
    } else if (text) {
      users = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
      return m.reply('Please mention a user, reply to a message, or provide a number to block.');
    }

    // Validate the JID format
    if (!users.includes('@s.whatsapp.net')) {
      return m.reply('Invalid user format. Please provide a valid WhatsApp number.');
    }

    // Block the user
    await gss.updateBlockStatus(users, 'block')
      .then(() => m.reply(`✅ Successfully blocked ${users.split('@')[0]}`))
      .catch((err) => m.reply(`❌ Failed to block user: ${err.message || err}`));
      
  } catch (error) {
    console.error('Error in block command:', error);
    m.reply('❌ An error occurred while processing the command.');
  }
};

export default block;
