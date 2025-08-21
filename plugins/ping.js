import config from '../config.cjs';

const ping = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd === "ping") {
    const start = new Date().getTime();

    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
    const text = `*CASEYRHODES SPEED: ${responseTime.toFixed(2)}ms*\n\n` +
                 `Select an option below:`;

    // Create buttons with display text
    const buttonMessage = {
      text: text,
      footer: "Caseyrhodes Performance Menu",
      templateButtons: [
        {
          index: 1,
          urlButton: {
            displayText: 'Bot Status',
            url: `${prefix}status`
          }
        },
        {
          index: 2,
          urlButton: {
            displayText: 'Help Menu',
            url: `${prefix}help`
          }
        },
        {
          index: 3,
          urlButton: {
            displayText: 'Speed Test',
            url: `${prefix}speedtest`
          }
        }
      ],
      headerType: 1,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      }
    };

    // Send image separately, then buttons
    await Matrix.sendMessage(m.from, { 
      image: { url: imageUrl },
      caption: text
    }, { quoted: m });
    
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};

export default ping;
