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
  
  // Check if it's a button response
  const isButtonResponse = m.message?.buttonsResponseMessage;
  
  if (isButtonResponse) {
    const selectedButtonId = m.message.buttonsResponseMessage.selectedButtonId;
    
    if (selectedButtonId === `${prefix}audio`) {
      const audioUrls = [
        'https://files.catbox.moe/m0xfku.mp3',
        'https://files.catbox.moe/8stziq.mp3',
        'https://files.catbox.moe/3au05j.m4a',
        'https://files.catbox.moe/dcxfi1.mp3',
        'https://files.catbox.moe/ebkzu5.mp3',
        'https://files.catbox.moe/xsa1ig.mp3',
        'https://files.catbox.moe/iq4ouj.mp3',
        'https://files.catbox.moe/wtux78.mp3'
      ];

      const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
      
      // Send audio
      await Matrix.sendMessage(m.from, {
        audio: { url: randomAudioUrl },
        mimetype: 'audio/mp4',
        ptt: true
      }, { quoted: m });
      
      return; // Exit after sending audio
    } else if (selectedButtonId === `${prefix}owner`) {
      // Handle owner button - replace with your owner info
      await Matrix.sendMessage(m.from, { 
        text: "👤 *Owner Information*\n\nName: Your Name\nContact: your@contact.info" 
      }, { quoted: m });
      return;
    }
  }
  
  // Regular command handling
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (!['alive', 'uptime', 'runtime'].includes(cmd)) return;

  const str = `*🤖 Bot Status: Online*\n*⏳ Uptime: ${timeString}*`;

  const buttons = [
    {
      buttonId: `${prefix}owner`,
      buttonText: { displayText: '👤 Owner' },
      type: 1
    },
    {
      buttonId: `${prefix}audio`,
      buttonText: { displayText: '🎵 Random Audio' },
      type: 1
    }
  ];

  const buttonMessage = {
    image: fs.readFileSync('./media/Casey.jpg'),
    caption: str,
    footer: 'Choose an option',
    buttons: buttons,
    headerType: 4,
    contextInfo: {
      mentionedJid: [m.sender],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363302677217436@newsletter',
        newsletterName: "JINX-XMD",
        serverMessageId: 143
      }
    }
  };

  await Matrix.sendMessage(m.from, buttonMessage, {
    quoted: m
  });
};

export default alive;
