import config from '../config.cjs';

// Matrix structure to manage users and pending actions
const matrix = {
  // Store users with their JIDs and roles
  users: new Map(),
  
  // Store pending actions
  pendingActions: new Map(),
  
  // Initialize with owner from config
  init: function() {
    const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    this.users.set(ownerJid, { 
      role: 'owner', 
      permissions: ['block', 'unblock', 'admin'] 
    });
    
    // Clean up old pending actions periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, action] of this.pendingActions.entries()) {
        if (now - action.timestamp > 5 * 60 * 1000) {
          this.pendingActions.delete(key);
        }
      }
    }, 60 * 1000); // Check every minute
  },
  
  // Check if user has permission
  hasPermission: function(jid, permission) {
    const user = this.users.get(jid);
    return user && user.permissions && user.permissions.includes(permission);
  },
  
  // Add user to matrix
  addUser: function(jid, data = {}) {
    if (!this.users.has(jid)) {
      this.users.set(jid, { role: 'user', permissions: [], ...data });
    }
    return this.users.get(jid);
  },
  
  // Get user from matrix
  getUser: function(jid) {
    return this.users.get(jid);
  }
};

// Initialize the matrix
matrix.init();

const block = async (m, gss) => {
  try {
    // Get the sender's JID in proper format
    const senderJid = m.sender.includes(':') ? m.sender.split(':')[0] : m.sender;
    
    // Add sender to matrix if not already present
    matrix.addUser(senderJid);
    
    // Check if the sender is the owner
    const isOwner = matrix.hasPermission(senderJid, 'block');
    
    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    
    // Handle confirmation responses
    if (body.startsWith(`${prefix}confirm-block-`)) {
      if (!isOwner) {
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
      
      const targetUser = body.split('-').pop();
      const pendingAction = matrix.pendingActions.get(senderJid);
      
      if (pendingAction && pendingAction.action === 'block') {
        // Execute the block
        await gss.updateBlockStatus(pendingAction.userJid, "block");
        
        // Add blocked user to matrix
        matrix.addUser(pendingAction.userJid, { 
          status: 'blocked', 
          blockedBy: senderJid,
          blockedAt: new Date().toISOString()
        });
        
        // Remove from pending actions
        matrix.pendingActions.delete(senderJid);
        
        return await gss.sendMessage(m.from, { 
          text: `✅ Successfully blocked *${targetUser}*` 
        }, { quoted: m });
      }
      
      return await gss.sendMessage(m.from, { 
        text: "❌ No pending block action or action expired" 
      }, { quoted: m });
    }
    
    // Handle cancel responses
    if (body === `${prefix}cancel`) {
      if (matrix.pendingActions.has(senderJid)) {
        matrix.pendingActions.delete(senderJid);
        return await gss.sendMessage(m.from, { 
          text: "❌ Block operation cancelled" 
        }, { quoted: m });
      }
    }
    
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

    // Add target user to matrix
    matrix.addUser(users);
    
    const userName = users.split('@')[0];
    const displayName = m.quoted?.pushName || userName;

    // Check if user is already blocked
    const targetUser = matrix.getUser(users);
    if (targetUser && targetUser.status === 'blocked') {
      return await gss.sendMessage(m.from, { 
        text: `❌ User *${displayName}* is already blocked.` 
      }, { quoted: m });
    }

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

    // Store the pending action in the matrix
    matrix.pendingActions.set(senderJid, {
      action: 'block',
      userJid: users,
      timestamp: Date.now(),
      userName: userName,
      displayName: displayName
    });

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

// Helper function to get list of blocked users
export const getBlockedList = () => {
  const blocked = [];
  for (const [jid, user] of matrix.users.entries()) {
    if (user.status === 'blocked') {
      blocked.push({
        jid,
        blockedBy: user.blockedBy,
        blockedAt: user.blockedAt
      });
    }
  }
  return blocked;
};

// Helper function to check if a user is blocked
export const isBlocked = (jid) => {
  const user = matrix.users.get(jid);
  return user && user.status === 'blocked';
};

export default block;
