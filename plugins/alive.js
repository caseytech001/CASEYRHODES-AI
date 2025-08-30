import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

const alive = async (m, Matrix) => {
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / (24 * 3600));
  const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  const prefix = /^[\\/!#.]/gi.test(m.body) ? m.body.match(/^[\\/!#.]/gi)[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).toLowerCase() : '';
  
  if (['alive'].includes(cmd)) {
    const uptimeMessage = `*🤖 Caseyrhodes Status Overview*
_______________________________________

*📆 ${days} Day*
*🕰️ ${hours} Hour*
*⏳ ${minutes} Minute*
*⏲️ ${seconds} Second*
_______powered by Caseyrhodes ____________
`;

    // Create JSON data to be copied
    const statusData = {
      bot: "Caseyrhodes AI",
      status: "Online",
      uptime: {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        total_seconds: uptimeSeconds
      },
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      platform: process.platform,
      poweredBy: "Caseyrhodes"
    };

    // Create the text to be copied with both human-readable and JSON format
    const copyText = `🤖 Caseyrhodes Status Overview
---------------------------------------
📆 Uptime: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds
🔄 Status: Online
⏰ Timestamp: ${new Date().toLocaleString()}
💻 Platform: ${process.platform}
🔖 Version: 2.0.0

=== JSON Data ===
${JSON.stringify(statusData, null, 2)}

© Powered by Caseyrhodes AI`;

    // Create interactive message using the new Baileys format
    const template = generateWAMessageFromContent(m.from, {
      templateMessage: {
        hydratedTemplate: {
          hydratedContentText: uptimeMessage,
          hydratedFooterText: "© Powered By Caseyrhodes AI",
          hydratedButtons: [
            {
              quickReplyButton: {
                displayText: "MENU",
                id: ".menu"
              }
            },
            {
              copyButton: {
                displayText: "Copy Status",
                copyText: copyText
              }
            },
            {
              urlButton: {
                displayText: "Follow our Channel",
                url: "https://whatsapp.com/channel/0029VagJlnG6xCSU2tS1Vz19"
              }
            },
            {
              quickReplyButton: {
                displayText: "PING",
                id: ".ping"
              }
            }
          ]
        }
      }
    }, { userJid: m.from });

    // Send the message
    await Matrix.relayMessage(m.from, template.message, { messageId: template.key.id });
  }
};

export default alive;
