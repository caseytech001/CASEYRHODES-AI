import config from '../config.cjs';

const ownerContact = async (m, gss) => {
    const ownernumber = config.OWNER_NUMBER;
    const prefix = config.PREFIX;
    
    // Check if message starts with prefix OR is a button response
    const isButtonResponse = m.body && !m.body.startsWith(prefix) && 
                           (m.body === `${prefix}callowner` || m.body === `${prefix}whatsappowner`);
    
    if (!m.body.startsWith(prefix) && !isButtonResponse) return;
    
    let cmd;
    let text;
    
    if (isButtonResponse) {
        // Handle button responses
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
            if (!ownernumber) {
                throw new Error('Owner number not configured');
            }

            // Send contact immediately
            await gss.sendContact(m.from, [ownernumber], m);
            
            // Send interactive buttons for additional options
            const buttonMessage = {
                text: "What would you like to do?",
                footer: "Owner Contact Options",
                buttons: [
                    { buttonId: `${prefix}callowner`, buttonText: { displayText: "📞 Call Owner" }, type: 1 },
                    { buttonId: `${prefix}whatsappowner`, buttonText: { displayText: "💬 Send WhatsApp" }, type: 1 }
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
    
    // Handle button interactions
    else if (cmd === 'callowner') {
        try {
            // Use config.OWNER_NUMBER directly for the phone number
            if (!ownernumber) {
                throw new Error('Owner number not configured');
            }
            
            // Extract phone number from JID (remove @s.whatsapp.net if present)
            const phoneNumber = ownernumber.includes('@') ? ownernumber.split('@')[0] : ownernumber;
            await m.reply(`To call the owner, please use this number: ${phoneNumber}`);
            await m.react("📞");
            
        } catch (error) {
            console.error('Error handling call request:', error);
            await m.reply('Error processing call request. Owner number not configured.');
            await m.react("❌");
        }
    }
    
    else if (cmd === 'whatsappowner') {
        try {
            // Validate owner number format
            if (!ownernumber) {
                throw new Error('Owner number not configured');
            }

            // Send contact again when WhatsApp button is clicked
            `OWNER CONTACTS:

            CASWYRHODES TECH

            > 254112192119`
            await m.reply("Owner contact sent again! 📱");
            await m.react("💬");
            
        } catch (error) {
            console.error('Error sending owner contact:', error);
            await m.reply('Error sending owner contact. Owner number not configured.');
            await m.react("❌");
        }
    }
};

export default ownerContact;
