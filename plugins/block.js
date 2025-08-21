import config from '../config.cjs';

const block = async (m, gss) => {
  try {
    const botNumber = await gss.decodeJid(gss.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net', ...(config.SUDO_NUMBERS || []).map(num => num + '@s.whatsapp.net')].includes(m.sender);
    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['block', 'unblock'];
    
    if (!validCommands.includes(cmd)) return;
    
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER/SUDO COMMAND*");

    // Check if any user is mentioned or quoted
    if (!m.mentionedJid?.length && !m.quoted && !text) {
      return m.reply(`Please mention a user, quote a message, or provide a number.\nUsage: ${prefix}block @user`);
    }

    let users = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
    
    // If no mentioned/quoted user, try to extract from text
    if (!users && text) {
      const numberMatch = text.match(/[\d+]+/g);
      if (numberMatch) {
        users = numberMatch[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      }
    }

    if (!users) {
      return m.reply('Could not identify a valid user to block.');
    }

    const action = cmd === 'block' ? 'block' : 'unblock';
    const actionText = cmd === 'block' ? 'Blocked' : 'Unblocked';

    await gss.updateBlockStatus(users, action)
      .then((res) => m.reply(`✅ ${actionText} ${users.split('@')[0]} successfully.`))
      .catch((err) => m.reply(`❌ Failed to ${action} user: ${err.message || err}`));
      
  } catch (error) {
    console.error('Error:', error);
    m.reply('❌ An error occurred while processing the command.');
  }
};

export default block;
