import config from '../config.cjs';

const block = async (m, gss) => {
  try {
    // Get the owner's JID in proper format
    const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    // Check if the sender is the owner (including international format)
    const senderJid = m.sender.includes(':') ? m.sender.split(':')[0] : m.sender;
    const isOwner = senderJid === ownerJid;
    
    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    
    // Only process block command
    if (cmd !== 'block') return;

    if (!isOwner) {
      // Send a button message for non-owners
      const buttonMessage = {
        text: "*📛 THIS IS AN OWNER ONLY COMMAND*",
        footer: "You don't have permission to use this command",
        buttons: [
          { buttonId: `${prefix}support`, buttonText: { displayText: "REQUEST SUPPORT" }, type: 1 }
        ],
        headerType: 1
      };
      return await gss.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const text = body.slice(prefix.length + cmd.length).trim();

    // Check if any user is mentioned or quoted
    if (!m.mentionedJid?.length && !m.quoted && !text) {
      const buttonMessage = {
        text: `Please mention a user, quote a message, or provide a number.\nUsage: ${prefix}block @user`,
        footer: "Select an option below",
        buttons: [
          { buttonId: `${prefix}help block`, buttonText: { displayText: "HELP GUIDE" }, type: 1 },
          { buttonId: `${prefix}listblock`, buttonText: { displayText: "BLOCKED LIST" }, type: 1 }
        ],
        headerType: 1
      };
      return await gss.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    let users = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
    
    // If no mentioned/quoted user, try to extract from text
    if (!users && text) {
      const numberMatch = text.match(/[\d+]+/g);
      if (numberMatch) {
        // Format the number properly for WhatsApp
        users = numberMatch[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      }
    }

    if (!users) {
      const buttonMessage = {
        text: 'Could not identify a valid user to block.',
        footer: "Please try again",
        buttons: [
          { buttonId: `${prefix}help block`, buttonText: { displayText: "HELP" }, type: 1 }
        ],
        headerType: 1
      };
      return await gss.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    // Ensure the user JID is in the correct format
    if (!users.endsWith('@s.whatsapp.net')) {
      users = users.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }

    const userName = users.split('@')[0];
    const displayName = m.quoted?.pushName || userName;

    // Create confirmation buttons before taking action
    const confirmButtons = {
      text: `Are you sure you want to block *${displayName}*?`,
      footer: "This action cannot be undone",
      buttons: [
        { buttonId: `${prefix}confirm-block-${userName}`, buttonText: { displayText: "YES, BLOCK" }, type: 1 },
        { buttonId: `${prefix}cancel`, buttonText: { displayText: "CANCEL" }, type: 1 }
      ],
      headerType: 1
    };

    // Store the pending action in a temporary variable
    gss.pendingActions = gss.pendingActions || {};
    gss.pendingActions[m.sender] = {
      action: 'block',
      userJid: users,
      timestamp: Date.now()
    };

    await gss.sendMessage(m.from, confirmButtons, { quoted: m });
      
  } catch (error) {
    console.error('Error in block command:', error);
    
    const errorButtons = {
      text: '❌ An error occurred while processing the command.',
      footer: "Please try again later",
      buttons: [
        { buttonId: `${prefix}support`, buttonText: { displayText: "REPORT ERROR" }, type: 1 }
      ],
      headerType: 1
    };
    
    await gss.sendMessage(m.from, errorButtons, { quoted: m });
  }
};

export default block;
