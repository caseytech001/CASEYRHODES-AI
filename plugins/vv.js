import pkg from '@whiskeysockets/baileys';
const { downloadMediaMessage } = pkg;
import config from '../config.cjs';

const OwnerCmd = async (m, Matrix) => {
  const botNumber = Matrix.user.id.split(':')[0] + '@s.whatsapp.net';
  const ownerNumber = config.OWNER_NUMBER + '@s.whatsapp.net';
  const prefix = config.PREFIX;

  // Check if sender is Owner or Bot
  const isOwner = m.sender === ownerNumber;
  const isBot = m.sender === botNumber;
  const isAuthorized = isOwner || isBot;

  // Extract command if prefixed
  const cmd = m.body.startsWith(prefix) 
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() 
    : '';

  // Detect reaction on View Once message
  const isReaction = m.message?.reactionMessage;
  const reactedToViewOnce = isReaction && m.quoted && (m.quoted.message.viewOnceMessage || m.quoted.message.viewOnceMessageV2);

  // Detect emoji reply (alone or with text) only on View Once media
  const isEmojiReply = m.body && /^[\p{Emoji}](\s|\S)*$/u.test(m.body.trim()) && 
                       m.quoted && (m.quoted.message.viewOnceMessage || m.quoted.message.viewOnceMessageV2);

  // Secret Mode = Emoji Reply or Reaction (For Bot/Owner Only) on View Once media
  const secretMode = (isEmojiReply || reactedToViewOnce) && isAuthorized;

  // Allow only `.vv`, `.vv2`, `.vv3`
  if (cmd && !['vv', 'vv2', 'vv3'].includes(cmd)) return;
  
  // Restrict VV commands properly
  if (cmd && !isAuthorized) return m.reply('*Only the owner or bot can use this command!*');

  // If not command & not secret mode, exit
  if (!cmd && !secretMode) return;

  // Ensure the message is a reply to a View Once message
  const targetMessage = reactedToViewOnce ? m.quoted : m;
  if (!targetMessage.quoted) return;
  
  let msg = targetMessage.quoted.message;
  if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
  else if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;

  // Additional check to ensure it's media (image, video, or audio)
  const messageType = msg ? Object.keys(msg)[0] : null;
  const isMedia = messageType && ['imageMessage', 'videoMessage', 'audioMessage'].includes(messageType);
  
  if (!msg || !isMedia) return;

  try {
    let buffer = await downloadMediaMessage(targetMessage.quoted, 'buffer');
    if (!buffer) return;

    let mimetype = msg.audioMessage?.mimetype || 'audio/ogg';
    let caption = `> *© Powered By Caseyrhodes*`;

    // Set recipient
    let recipient = secretMode || cmd === 'vv2' 
      ? botNumber
      : cmd === 'vv3' 
        ? ownerNumber
        : m.from;

    // Create buttons
    const buttons = [
      {
        buttonId: `${prefix}vv`,
        buttonText: { displayText: 'Send to Me' },
        type: 1
      },
      {
        buttonId: `${prefix}vv2`,
        buttonText: { displayText: 'Send to Bot' },
        type: 1
      },
      {
        buttonId: `${prefix}vv3`,
        buttonText: { displayText: 'Send to Owner' },
        type: 1
      }
    ];

    const buttonMessage = {
      text: "Choose where to send the media:",
      footer: "View Once Media Handler",
      buttons: buttons,
      headerType: 1
    };

    if (messageType === 'imageMessage') {
      await Matrix.sendMessage(recipient, { image: buffer, caption });
    } else if (messageType === 'videoMessage') {
      await Matrix.sendMessage(recipient, { video: buffer, caption, mimetype: 'video/mp4' });
    } else if (messageType === 'audioMessage') {  
      await Matrix.sendMessage(recipient, { audio: buffer, mimetype, ptt: true });
    }

    // Send buttons as a separate message
    if (cmd) {
      await Matrix.sendMessage(m.from, buttonMessage);
      m.reply('*Media sent successfully! Choose an option for future media:*');
    }

  } catch (error) {
    console.error(error);
    if (cmd) await m.reply('*Failed to process View Once message!*');
  }
};

export default OwnerCmd;
