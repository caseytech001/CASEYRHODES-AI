import config from '../config.cjs';

const autorecordingCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'autorecording') {
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");
    
    let responseMessage;
    let buttons = [];

    if (text === 'on') {
      config.AUTO_RECORDING = true;
      responseMessage = "✅ *Auto-Recording has been enabled.*";
      buttons = [
        { buttonId: `${prefix}autorecording off`, buttonText: { displayText: '🔴 Turn Off' }, type: 1 }
      ];
    } else if (text === 'off') {
      config.AUTO_RECORDING = false;
      responseMessage = "❌ *Auto-Recording has been disabled.*";
      buttons = [
        { buttonId: `${prefix}autorecording on`, buttonText: { displayText: '🟢 Turn On' }, type: 1 }
      ];
    } else {
      // Show current status with toggle buttons
      const status = config.AUTO_RECORDING ? '🟢 Enabled' : '🔴 Disabled';
      responseMessage = `📹 *Auto-Recording Settings*\n\nCurrent Status: ${status}\n\nUse the buttons below to toggle or use commands:\n- \`${prefix}autorecording on\`: Enable Auto-Recording\n- \`${prefix}autorecording off\`: Disable Auto-Recording`;
      
      buttons = [
        { 
          buttonId: `${prefix}autorecording ${config.AUTO_RECORDING ? 'off' : 'on'}`, 
          buttonText: { displayText: `🔄 ${config.AUTO_RECORDING ? 'Disable' : 'Enable'}` }, 
          type: 1 
        }
      ];
    }

    try {
      const buttonMessage = {
        text: responseMessage,
        footer: config.BOT_NAME || "Matrix Bot",
        buttons: buttons,
        headerType: 1
      };
      
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    } catch (error) {
      console.error("Error processing your request:", error);
      await Matrix.sendMessage(m.from, { text: 'Error processing your request.' }, { quoted: m });
    }
  }
};

export default autorecordingCommand;
