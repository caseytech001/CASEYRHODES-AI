import config from '../config.cjs';

const ownerContact = async (m, gss) => {
    const ownernumber = config.OWNER_NUMBER;
    const prefix = config.PREFIX;
    const channelLink = config.CHANNEL_LINK; // Add this to your config.cjs file
    
    // Check if message starts with prefix OR is a button response
    const isButtonResponse = m.body && !m.body.startsWith(prefix) && 
                           (m.body === `${prefix}callowner` || m.body === `${prefix}whatsappowner` || m.body === `${prefix}joinchannel`);
    
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

            // Send contact with buttons in a single message
            const contactMessage = {
                text: "What would you like to do?",
                footer: "Owner Contact Options",
                buttons: [
                    { buttonId: `${prefix}joinchannel`, buttonText: { displayText: "📢 Join Channel" }, type: 1 },
                    { buttonId: `${prefix}whatsappowner`, buttonText: { displayText: "💬 Send WhatsApp" }, type: 1 }
                ],
                headerType: 6, // Changed to 6 for contact message
                contacts: {
                    displayName: "Owner",
                    contacts: [{ 
                        displayName: "Owner", 
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Owner;;;\nFN:Owner\nTEL;type=CELL;type=VOICE;waid=${ownernumber.replace('@s.whatsapp.net', '')}:${ownernumber.replace('@s.whatsapp.net', '')}\nEND:VCARD`
                    }]
                }
            };
            
            await gss.sendMessage(m.from, contactMessage, { quoted: m });
            await m.react("✅");
            
        } catch (error) {
            console.error('Error sending owner contact:', error);
            await m.reply('Error sending owner contact. Please make sure the owner number is properly configured.');
            await m.react("❌");
        }
    }
    
    // Handle join channel button interaction
    else if (cmd === 'joinchannel') {
        try {
            if (!channelLink) {
                throw new Error('Channel link not configured');
            }
            
            // Send the channel link as a clickable message
            await gss.sendMessage(m.from, {
                text: `Click the link below to join our channel:\n\n${channelLink}`,
                detectLinks: true
            }, { quoted: m });
            
            await m.react("📢");
            
        } catch (error) {
            console.error('Error sending channel link:', error);
            await m.reply('Error sending channel link. Channel link not configured.');
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
            await gss.sendContact(m.from, [ownernumber], m);
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
