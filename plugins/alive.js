import fs from 'fs';
import config from '../config.cjs';

const alive = async (m, Matrix) => {
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / (3600 * 24));
  const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  const timeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  // Handle button responses
  if (m.type === 'interactive' && m.message?.interactiveType === 'button_reply') {
    const selectedButtonId = m.message.interactiveContent.buttonId;
    
    if (selectedButtonId === `${prefix}menu`) {
      // Handle menu button
      await Matrix.sendMessage(m.from, { 
        text: `📋 *Menu Options*\n\n• ${prefix}help - Show all commands\n• ${prefix}sticker - Create stickers\n• ${prefix}download - Download media\n• ${prefix}ai - AI features` 
      }, { quoted: m });
      return;
    }
    
    if (selectedButtonId === `${prefix}github`) {
      // Handle GitHub button
      await Matrix.sendMessage(m.from, { 
        text: '🌐 *GitHub Repository*\n\nCheck out our GitHub for updates and source code:\nhttps://github.com/caseyweb/CASEYRHODES-XMD' 
      }, { quoted: m });
      return;
    }
    
    if (selectedButtonId === `${prefix}audio`) {
      // Handle audio button - send without newsletter formatting
      const audioMessage = {
        audio: { url: 'https://files.catbox.moe/dcxfi1.mp3' },
        mimetype: 'audio/mp4',
        ptt: true,
        caption: '🔊 Audio sent from JINX-XMD Bot'
      };
      
      await Matrix.sendMessage(m.from, audioMessage, { quoted: m });
      return;
    }
  }

  if (!['alive', 'uptime', 'runtime'].includes(cmd)) return;

  const str = `*🤖 Bot Status: Online*\n*⏳ Uptime: ${timeString}*\n\n*Choose an option:*`;

  // Create a single message with all buttons (removed ping, added GitHub)
  const buttonMessage = {
    text: str,
    footer: 'Caseyrhodes-AI | 2025',
    buttons: [
      {
        buttonId: `${prefix}menu`,
        buttonText: { displayText: '📋 Menu' },
        type: 1
      },
      {
        buttonId: `${prefix}github`,
        buttonText: { displayText: '🌐 GitHub' },
        type: 1
      },
      {
        buttonId: `${prefix}audio`,
        buttonText: { displayText: '🔊 Audio' },
        type: 1
      }
    ],
    headerType: 1
  };

  // Send the button message
  await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
};

export default alive;
