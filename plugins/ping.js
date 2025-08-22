import config from '../config.cjs';
import axios from 'axios';

const ping = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd === "ping") {
    const start = new Date().getTime();

    const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
    const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

    // Ensure reaction and text emojis are different
    while (textEmoji === reactionEmoji) {
      textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    }

    await m.React(textEmoji);

    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const text = `> *CASEYRHODES SPEED: ${responseTime.toFixed(2)}ms ${reactionEmoji}*\n\n` +
                 `Select an option below:`;

    const buttons = [
      {
        buttonId: `${prefix}sendaudio`,
        buttonText: { displayText: '🎵 Send Audio' },
        type: 1
      },
      {
        buttonId: `${prefix}menu`,
        buttonText: { displayText: '❓ Help Menu' },
        type: 1
      },
      {
        buttonId: `${prefix}speedtest`,
        buttonText: { displayText: '⚡ Speed Test' },
        type: 1
      }
    ];

    // Create the button message with image
    const buttonMessage = {
      image: { url: "https://files.catbox.moe/y3j3kl.jpg" },
      caption: text,
      footer: "Caseyrhodes Performance Menu",
      buttons: buttons,
      headerType: 4,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363302677217436@newsletter',
          newsletterName: "Caseyrhodes Xtech",
          serverMessageId: 143
        }
      }
    };

    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
  
  // Handle the audio button
  if (cmd === "sendaudio") {
    const audioUrls = [
      'https://files.catbox.moe/m0xfku.mp3',
      // Add more audio URLs as needed
    ];
    
    // Select a random audio URL
    const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
    
    // Send audio message
    await Matrix.sendMessage(
      m.from, 
      { 
        audio: { url: randomAudioUrl }, 
        mimetype: 'audio/mp4',
        ptt: true 
      }, 
      { quoted: m }
    );
  }
};

export default ping;
