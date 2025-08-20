import config from '../config.cjs';

const ownerContact = async (m, gss) => {
    const ownernumber = config.OWNER_NUMBER;
    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    if (cmd === 'owner' || cmd === 'support') {
        try {
            // Create buttons for the menu
            const buttons = [
                { buttonId: `${prefix}owner`, buttonText: { displayText: '👑 Owner' }, type: 1 },
                { buttonId: `${prefix}ping`, buttonText: { displayText: '🏓 Ping' }, type: 1 },
                { buttonId: `${prefix}support`, buttonText: { displayText: '💬 Support' }, type: 1 }
            ];
            
            // Create button message
            const buttonMessage = {
                text: "🌟 *BOT MENU* 🌟\n\nPlease select an option:",
                footer: "Powered by YourBotName",
                buttons: buttons,
                headerType: 1
            };
            
            // Send the button message
            await gss.sendMessage(m.from, buttonMessage);
            if (m.React) await m.React("✅");
        } catch (error) {
            console.error('Error sending menu:', error);
            if (m.reply) m.reply('Error sending menu.');
            if (m.React) await m.React("❌");
        }
    } 
    else if (cmd === 'ping') {
        try {
            const start = Date.now();
            if (m.React) await m.React("⏱️");
            
            // Simulate some processing
            const latency = Date.now() - start;
            
            await gss.sendMessage(m.from, {
                text: `🏓 Pong!\n⏱️ Latency: ${latency}ms\n💻 Server: Active`
            });
            
            if (m.React) await m.React("✅");
        } catch (error) {
            console.error('Error with ping command:', error);
            if (m.reply) m.reply('Error with ping command.');
            if (m.React) await m.React("❌");
        }
    }
    else if (cmd === 'support') {
        try {
            await gss.sendMessage(m.from, {
                text: `💬 *SUPPORT INFORMATION*\n\nFor support, please contact:\n📞 ${ownernumber}\n\nOr join our support group: [Your Support Group Link]`
            });
            if (m.React) await m.React("✅");
        } catch (error) {
            console.error('Error sending support info:', error);
            if (m.reply) m.reply('Error sending support information.');
            if (m.React) await m.React("❌");
        }
    }
};

export default ownerContact;
