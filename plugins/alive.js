import fs from 'fs';
import os from 'os';

const alive = async (m, Matrix) => {
  const prefix = process.env.PREFIX || '!';
  
  // Check if it's a button response
  const isButtonResponse = m.message?.buttonsResponseMessage;
  
  if (isButtonResponse) {
    const selectedButtonId = m.message.buttonsResponseMessage.selectedButtonId;
    
    if (selectedButtonId === `${prefix}join` || selectedButtonId === `${prefix}owner`) {
      // Handle both buttons silently - no text response
      return;
    }
  }
  
  // Regular command handling
  const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (!['alive', 'uptime', 'runtime'].includes(cmd)) return;

  // Uptime calculation
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / (3600 * 24));
  const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  const timeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  // Memory usage calculation
  const usedMem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const platform = os.platform();

  const caption = `
╭───❰ *AM ALIVE 🎉* ❱──┈⊷
┃ *✨𝖴ᴘᴛɪᴍᴇ* : *${timeString}*
┃ *💾 𝖱ᴀᴍ ᴜsᴀɢᴇ* : *${usedMem}MB / ${totalMem}MB*
┃ *🧑‍💻𝖣ᴇᴘʟᴏʏᴇᴅ ᴏɴ* : *${platform}*
┃ *👨‍💻𝖮ᴡɴᴇʀ* : *𝖬ʀ ᴄᴀsᴇʏʀʜᴏᴅᴇs*
┃ *🧬𝖵ᴇʀsɪᴏɴ* : *𝟣.𝟢.𝟢 𝖡𝖤𝖳𝖠*
╰────────────┈⊷
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ`;

  const buttons = [
    {
      buttonId: `${prefix}join`,
      buttonText: { displayText: '📢 Join Channel' },
      type: 1
    },
    {
      buttonId: `${prefix}owner`,
      buttonText: { displayText: '👤 Owner' },
      type: 1
    }
  ];

  const buttonMessage = {
    image: fs.readFileSync('./media/Casey.jpg'),
    audio: fs.readFileSync('./media/alive.mp3'), // Add your audio file
    mimetype: 'audio/mp4', // Set the appropriate mimetype
    caption: caption,
    buttons: buttons,
    headerType: 4
  };

  await Matrix.sendMessage(m.from, buttonMessage, {
    quoted: m
  });
};

export default alive;
