import config from '../config.cjs';

const setprefixCommand = async (m, Matrix) => {
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    if (cmd === 'setprefix') {
        if (!isCreator) {
            // Create buttons for the message
            const buttons = [
                {buttonId: `${prefix}menu`, buttonText: {displayText: '📋 Menu'}, type: 1},
                {buttonId: `${prefix}ping`, buttonText: {displayText: '🏓 Ping'}, type: 1},
                {buttonId: `${prefix}owner`, buttonText: {displayText: '👤 Owner'}, type: 1}
            ];
            
            const buttonMessage = {
                text: "*📛 THIS IS AN OWNER COMMAND*",
                footer: "Select an option below",
                buttons: buttons,
                headerType: 1
            };
            
            await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
            return;
        }

        if (text) {
            config.PREFIX = text;
            m.reply(`Prefix has been changed to '${text}'.`);
        } else {
            m.reply("Please specify a new prefix.");
        }
    }
};

export default setprefixCommand;
