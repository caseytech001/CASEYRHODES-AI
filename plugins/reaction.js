import axios from 'axios';
import config from '../config.cjs';

const stickerCommandHandler = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();
  
  const stickerCommands = ['cry', 'kiss', 'kill', 'kick', 'hug', 'pat', 'lick', 'bite', 'yeet', 'bully', 'bonk', 'wink', 'poke', 'nom', 'slap', 'smile', 'wave', 'awoo', 'blush', 'smug', 'dance', 'happy', 'sad', 'cringe', 'cuddle', 'shinobu', 'handhold', 'glomp', 'highfive'];

  // Handle button interactions
  if (m?.message?.buttonsResponseMessage) {
    const selectedButton = m.message.buttonsResponseMessage.selectedButtonId;
    if (selectedButton && stickerCommands.includes(selectedButton)) {
      const packname = `CASEYRHODES-AI`;
      const author = '';

      try {
        const { data } = await axios.get(`https://api.waifu.pics/sfw/${selectedButton}`);
        if (data && data.url) {
          await gss.sendImageAsSticker(m.from, data.url, m, { packname, author });
        } else {
          m.reply('Error fetching sticker.');
        }
      } catch (error) {
        console.error('Error fetching sticker:', error);
        m.reply('Error fetching sticker.');
      }
    }
    return;
  }

  // Show sticker menu with buttons
  if (cmd === 'sticker' || cmd === 'stickers' || cmd === 's') {
    const sections = [
      {
        title: "Sticker Categories",
        rows: []
      }
    ];

    // Create buttons for each sticker category
    stickerCommands.forEach(command => {
      sections[0].rows.push({
        title: command.charAt(0).toUpperCase() + command.slice(1),
        rowId: command
      });
    });

    const buttonMessage = {
      text: "🎭 *STICKER MENU*\n\nSelect a sticker category from the buttons below:",
      footer: config.FOOTER,
      buttonText: "View Categories",
      sections
    };

    await gss.sendMessage(m.from, buttonMessage, { quoted: m });
    return;
  }

  // Handle direct sticker commands
  if (stickerCommands.includes(cmd)) {
    const packname = `CASEYRHODES-AI`;
    const author = '';

    try {
      const { data } = await axios.get(`https://api.waifu.pics/sfw/${cmd}`);
      if (data && data.url) {
        await gss.sendImageAsSticker(m.from, data.url, m, { packname, author });
      } else {
        m.reply('Error fetching sticker.');
      }
    } catch (error) {
      console.error('Error fetching sticker:', error);
      m.reply('Error fetching sticker.');
    }
  }
};

export default stickerCommandHandler;
