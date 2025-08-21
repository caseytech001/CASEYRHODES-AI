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
    
    if (selectedButtonId === `${prefix}audio`) {
      // Send audio in newsletter format when audio button is selected
      const audioMessage = {
        audio: { url: 'https://files.catbox.moe/dcxfi1.mp3' },
        mimetype: 'audio/mp4',
        ptt: true,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363302677217436@newsletter',
            newsletterName: "JINX-XMD Audio",
            serverMessageId: Math.floor(Math.random() * 1000) // Random ID for the audio message
          }
        }
      };
      
      await Matrix.sendMessage(m.from, audioMessage, {
        quoted: m
      });
      return;
    }
  }

  if (!['alive', 'uptime', 'runtime'].includes(cmd)) return;

  const str = `*🤖 Bot Status: Online*\n*⏳ Uptime: ${timeString}*`;

  const buttons = [
    {
      buttonId: `${prefix}menu`,
      buttonText: { displayText: '📋 Menu' },
      type: 1
    },
    {
      buttonId: `${prefix}ping`,
      buttonText: { displayText: '🏓 Ping' },
      type: 1
    },
    {
      buttonId: `${prefix}audio`,
      buttonText: { displayText: '🔊 Audio' },
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

  // Send the button message
  await Matrix.sendMessage(m.from, buttonMessage, {
    quoted: m
  });
};

export default alive;
