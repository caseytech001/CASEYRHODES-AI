import config from '../config.cjs';

const ownerContact = async (m, gss) => {
    const ownernumber = config.OWNER_NUMBER;
    const prefix = config.PREFIX;
    
    // Check if message starts with prefix OR is a button response (which won't have prefix)
    const isButtonResponse = m.body && !m.body.startsWith(prefix) && 
                           (m.body === `${prefix}callowner` || m.body === `${prefix}whatsappowner`);
    
    if (!m.body.startsWith(prefix) && !isButtonResponse) return;
    
    let cmd;
    let text;
    
    if (isButtonResponse) {
        // Handle button responses (they come without prefix but contain the full command)
        cmd = m.body.slice(prefix.length).toLowerCase();
        text = '';
    } else {
        // Handle regular prefixed commands
        const bodyText = m.body.startsWith(prefix) ? m.body : `${prefix}${m.body}`;
        cmd = bodyText.slice(prefix.length).split(' ')[0].toLowerCase();
        text = bodyText.slice(prefix.length + cmd.length).trim();
    }

    // Handle owner command
    if (cmd === 'owner') {
        try {
            // Validate owner number format
            if (!ownernumber || !ownernumber.includes('@')) {
                throw new Error('Invalid owner number format');
            }

            // Send contact
            await gss.sendContact(m.from, [ownernumber], m);
            
            // Send message with buttons
            const buttonMessage = {
                text: "You can also contact the owner directly using the buttons below:",
                footer: "Owner Contact",
                buttons: [
                    { buttonId: `${prefix}callowner`, buttonText: { displayText: "📞 Call Owner" }, type: 1 },
                    { buttonId: `${prefix}whatsappowner`, buttonText: { displayText: "💬 WhatsApp" }, type: 1 }
                ],
                headerType: 1
            };
            
            await gss.sendMessage(m.from, buttonMessage, { quoted: m });
            await m.react("✅");
            
        } catch (error) {
            console.error('Error sending owner contact:', error);
            await m.reply('Error sending owner contact. Please make sure the owner number is properly configured.');
            await m.react("❌");
        }
    }
    
    // Handle the whatsappowner button click
    else if (cmd === 'whatsappowner') {
        try {
            // Validate owner number format
            if (!ownernumber || !ownernumber.includes('@')) {
                throw new Error('Invalid owner number format');
            }

            // Send contact again when button is clicked
            await gss.sendContact(m.from, [ownernumber], m);
            await m.react("✅");
            
        } catch (error) {
            console.error('Error sending owner contact:', error);
            await m.reply('Error sending owner contact. Please make sure the owner number is properly configured.');
            await m.react("❌");
        }
    }
};

export default ownerContact;
