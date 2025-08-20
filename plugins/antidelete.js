import pkg from '@whiskeysockets/baileys';
const { proto, downloadContentFromMessage } = pkg;
import config from '../config.cjs';
import { DeletedMessage, Settings } from '../data/database.js';
import { Sequelize } from 'sequelize'; // Added missing import

class AntiDeleteSystem {
  constructor() {
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanExpiredMessages(), this.cacheExpiry);
    this.lastRecoveryTimestamps = new Map(); // Anti-spam tracking
  }

  async isEnabled() {
    try {
      const settings = await Settings.findByPk(1);
      return settings?.enabled ?? config.ANTI_DELETE;
    } catch (error) {
      console.error('Error checking anti-delete status:', error);
      return config.ANTI_DELETE || false;
    }
  }

  async getPath() {
    try {
      const settings = await Settings.findByPk(1);
      return settings?.path || config.ANTI_DELETE_PATH || 'inbox';
    } catch (error) {
      console.error('Error getting anti-delete path:', error);
      return config.ANTI_DELETE_PATH || 'inbox';
    }
  }

  async addMessage(key, message) {
    try {
      // Check if message already exists
      const existing = await DeletedMessage.findByPk(key);
      if (!existing) {
        await DeletedMessage.create({
          id: key,
          ...message,
          media: message.media ? Buffer.from(message.media) : null
        });
      }
    } catch (error) {
      console.error('Failed to save message:', error.message);
    }
  }

  async getMessage(key) {
    try {
      return await DeletedMessage.findByPk(key);
    } catch (error) {
      console.error('Error retrieving message:', error);
      return null;
    }
  }

  async deleteMessage(key) {
    try {
      await DeletedMessage.destroy({ where: { id: key } });
    } catch (error) {
      console.error('Error deleting message from cache:', error);
    }
  }

  async cleanExpiredMessages() {
    try {
      const expiryTime = Date.now() - this.cacheExpiry;
      await DeletedMessage.destroy({ 
        where: { timestamp: { [Sequelize.Op.lt]: expiryTime } }
      });
    } catch (error) {
      console.error('Error cleaning expired messages:', error);
    }
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      hour12: true,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' PKT';
  }

  // Anti-spam check
  shouldRecover(chatJid) {
    const now = Date.now();
    const lastRecovery = this.lastRecoveryTimestamps.get(chatJid) || 0;
    if (now - lastRecovery < 2000) { // 2 second cooldown
      return false;
    }
    this.lastRecoveryTimestamps.set(chatJid, now);
    return true;
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

const AntiDelete = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
  const text = m.body?.slice(prefix.length).trim().split(' ') || [];
  const cmd = text[0]?.toLowerCase();
  const subCmd = text[1]?.toLowerCase();

  const formatJid = (jid) => jid ? jid.replace(/@s\.whatsapp\.net|@g\.us/g, '') : 'Unknown';

  const getChatInfo = async (jid) => {
    if (!jid) return { name: 'Unknown Chat', isGroup: false };
    
    if (jid.includes('@g.us')) {
      try {
        const groupMetadata = await Matrix.groupMetadata(jid);
        return {
          name: groupMetadata?.subject || 'Unknown Group',
          isGroup: true
        };
      } catch {
        return { name: 'Unknown Group', isGroup: true };
      }
    }
    
    try {
      // Try to get the contact name for private chats
      const contact = await Matrix.getContact(jid);
      return {
        name: contact?.name || contact?.notify || 'Private Chat',
        isGroup: false
      };
    } catch {
      return { name: 'Private Chat', isGroup: false };
    }
  };

  const antiDelete = new AntiDeleteSystem();

  if (cmd === 'antidelete') {
    if (!isCreator) {
      await m.reply('╭━━〔 *PERMISSION DENIED* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• You are not authorized!\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷');
      return;
    }

    try {
      const mode = await antiDelete.getPath();
      const modeName = mode === "same" ? "Same Chat" : 
                     mode === "inbox" ? "Bot Inbox" : "Owner PM";
      const isEnabled = await antiDelete.isEnabled();

      if (subCmd === 'on') {
        await Settings.upsert({ id: 1, enabled: true, path: mode });
        await m.reply(`╭━━〔 *ANTI-DELETE* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• Status: ✅ Enabled\n┃◈┃• Mode: ${modeName}\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷`);
      } 
      else if (subCmd === 'off') {
        await Settings.upsert({ id: 1, enabled: false, path: mode });
        await antiDelete.cleanExpiredMessages();
        await m.reply(`╭━━〔 *ANTI-DELETE* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• Status: ❌ Disabled\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷`);
      }
      else if (subCmd === 'mode') {
        const newMode = text[2]?.toLowerCase();
        if (newMode && ['same', 'inbox', 'owner'].includes(newMode)) {
          await Settings.upsert({ id: 1, enabled: isEnabled, path: newMode });
          const newModeName = newMode === "same" ? "Same Chat" : 
                            newMode === "inbox" ? "Bot Inbox" : "Owner PM";
          await m.reply(`╭━━〔 *ANTI-DELETE* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• Mode changed to: ${newModeName}\n┃◈┃• Status: ${isEnabled ? '✅' : '❌'}\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷`);
        } else {
          await m.reply(`╭━━〔 *ANTI-DELETE* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• Usage: ${prefix}antidelete mode <same|inbox|owner>\n┃◈┃• Current mode: ${modeName}\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷`);
        }
      }
      else {
        await m.reply(`╭━━〔 *ANTI-DELETE* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• ${prefix}antidelete on/off\n┃◈┃• ${prefix}antidelete mode <same|inbox|owner>\n┃◈┃• Status: ${isEnabled ? '✅' : '❌'}\n┃◈┃• Mode: ${modeName}\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷`);
      }
      await m.React('✅');
    } catch (error) {
      console.error('Command error:', error);
      await m.React('❌');
    }
    return;
  }

  // Message handling
  Matrix.ev.on('messages.upsert', async ({ messages }) => {
    const isEnabled = await antiDelete.isEnabled();
    if (!isEnabled || !messages?.length) return;
    
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message || msg.key.remoteJid === 'status@broadcast') continue;
      
      try {
        const content = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text ||
                       msg.message.imageMessage?.caption ||
                       msg.message.videoMessage?.caption ||
                       msg.message.documentMessage?.caption ||
                       msg.message.buttonsMessage?.contentText ||
                       msg.message.templateMessage?.fourRowTemplate?.content?.text ||
                       msg.message.templateMessage?.hydratedTemplate?.content?.text ||
                       msg.message.templateMessage?.hydratedFourRowTemplate?.content?.text ||
                       '';

        let media, type, mimetype;
        
        const mediaTypes = ['image', 'video', 'audio', 'sticker', 'document'];
        for (const mediaType of mediaTypes) {
          if (msg.message[`${mediaType}Message`]) {
            const mediaMsg = msg.message[`${mediaType}Message`];
            try {
              const stream = await downloadContentFromMessage(mediaMsg, mediaType);
              let buffer = Buffer.from([]);
              for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
              }
              media = buffer;
              type = mediaType;
              mimetype = mediaMsg.mimetype;
              break;
            } catch (e) {
              console.error(`Media download error:`, e);
            }
          }
        }
        
        if (msg.message.audioMessage?.ptt) {
          try {
            const stream = await downloadContentFromMessage(msg.message.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }
            media = buffer;
            type = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
          } catch (e) {
            console.error('Voice download error:', e);
          }
        }
        
        // Also check for viewOnce messages
        if (msg.message.viewOnceMessage?.message) {
          const viewOnceMsg = msg.message.viewOnceMessage.message;
          const viewOnceContent = viewOnceMsg.conversation || 
                                viewOnceMsg.extendedTextMessage?.text ||
                                viewOnceMsg.imageMessage?.caption ||
                                viewOnceMsg.videoMessage?.caption ||
                                viewOnceMsg.documentMessage?.caption || '';
          
          if (viewOnceContent) {
            content = viewOnceContent;
          }
          
          // Check for media in viewOnce messages
          for (const mediaType of mediaTypes) {
            if (viewOnceMsg[`${mediaType}Message`]) {
              const mediaMsg = viewOnceMsg[`${mediaType}Message`];
              try {
                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                  buffer = Buffer.concat([buffer, chunk]);
                }
                media = buffer;
                type = mediaType;
                mimetype = mediaMsg.mimetype;
                break;
              } catch (e) {
                console.error(`ViewOnce media download error:`, e);
              }
            }
          }
        }
        
        if (content || media) {
          await antiDelete.addMessage(msg.key.id, {
            content,
            media,
            type,
            mimetype,
            sender: msg.key.participant || msg.key.remoteJid,
            senderFormatted: `@${formatJid(msg.key.participant || msg.key.remoteJid)}`,
            timestamp: Date.now(),
            chatJid: msg.key.remoteJid
          });
        }
      } catch (error) {
        console.error('Message processing error:', error);
      }
    }
  });

  // Deletion handling with anti-spam
  Matrix.ev.on('messages.update', async (updates) => {
    const isEnabled = await antiDelete.isEnabled();
    if (!isEnabled || !updates?.length) return;

    for (const update of updates) {
      try {
        const { key, update: updateData } = update;
        const isDeleted = updateData?.messageStubType === proto.WebMessageInfo.StubType.REVOKE;
        
        if (!isDeleted || key.fromMe) continue;

        // Anti-spam check
        if (!antiDelete.shouldRecover(key.remoteJid)) {
          console.log('Skipping recovery due to anti-spam');
          continue;
        }

        const cachedMsg = await antiDelete.getMessage(key.id);
        if (!cachedMsg) continue;

        await antiDelete.deleteMessage(key.id);
        
        const path = await antiDelete.getPath();
        let destination;
        if (path === "same") {
          destination = key.remoteJid;
        } else if (path === "inbox") {
          destination = Matrix.user.id;
        } else {
          destination = config.OWNER_NUMBER + '@s.whatsapp.net';
        }

        const chatInfo = await getChatInfo(cachedMsg.chatJid);
        const deletedBy = updateData?.participant ? 
          `@${formatJid(updateData.participant)}` : 
          (key.participant ? `@${formatJid(key.participant)}` : 'Unknown');

        const messageType = cachedMsg.type ? 
          cachedMsg.type.charAt(0).toUpperCase() + cachedMsg.type.slice(1) : 
          'Text';
        
        // Send alert first
        await Matrix.sendMessage(destination, {
          text: `╭━━〔 *DELETED ${messageType}* 〕━━┈⊷\n┃◈╭─────────────·๏\n┃◈┃• Sender: ${cachedMsg.senderFormatted}\n┃◈┃• Deleted By: ${deletedBy}\n┃◈┃• Chat: ${chatInfo.name}${chatInfo.isGroup ? ' (Group)' : ''}\n┃◈┃• Sent At: ${antiDelete.formatTime(cachedMsg.timestamp)}\n┃◈┃• Deleted At: ${antiDelete.formatTime(Date.now())}\n┃◈╰─────────────·๏\n╰━━━━━━━━━━━━━━━━┈⊷`
        });

        // Send media if exists
        if (cachedMsg.media) {
          await Matrix.sendMessage(destination, {
            [cachedMsg.type]: cachedMsg.media,
            mimetype: cachedMsg.mimetype,
            ...(cachedMsg.type === 'audio' && { ptt: true })
          });
        }
        
        // Send text content
        if (cachedMsg.content) {
          await Matrix.sendMessage(destination, {
            text: `💬 *Content:*\n${cachedMsg.content}`
          });
        }
      } catch (error) {
        console.error('Recovery error:', error);
      }
    }
  });
};

export default AntiDelete;
