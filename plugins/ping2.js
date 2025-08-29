import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

const ping = async (m, Matrix) => {
  // ======================
  // CONFIGURATION SECTION
  // ======================
  const prefix = config.PREFIX || ".";
  
  // Command detection
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
    : "";
  
  // ======================
  // COMMAND HANDLING SECTION
  // ======================
  if (cmd === "ping2") {
    // ======================
    // PERFORMANCE MEASUREMENT
    // ======================
    const start = new Date().getTime();
    await m.React("👻");
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    
    // ======================
    // CONTENT DEFINITION
    // ======================
    const imageUrl = "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg";
    const text = `🤖 *AI SYSTEM STATUS*\n\n` +
                 `⚡ *Response Time:* ${responseTime.toFixed(2)} seconds\n` +
                 `🕒 *Timestamp:* ${new Date().toLocaleTimeString()}\n` +
                 `📊 *System:* Operational\n` +
                 `🔧 *Version:* ${config.version || '1.0.0'}\n\n` +
                 `_Powered by CaseyRhodes AI Infrastructure_`;
    
    // ======================
    // BUTTONS DEFINITION
    // ======================
    const buttons = [
      {
        buttonId: `${prefix}owner`,
        buttonText: { displayText: "👤 Owner" },
        type: 1
      },
      {
        buttonId: `${prefix}system`,
        buttonText: { displayText: "⚙️ System" },
        type: 1
      },
      {
        buttonId: `${prefix}stats`,
        buttonText: { displayText: "📊 Stats" },
        type: 1
      },
      {
        buttonId: `${prefix}alive`,
        buttonText: { displayText: "💚 Alive" },
        type: 1
      }
    ];

    // ======================
    // MESSAGE CONSTRUCTION
    // ======================
    const buttonMessage = {
      // Media content
      image: { url: imageUrl },
      
      // Text content
      caption: text,
      footer: "AI Assistant • Powered by CaseyRhodes Tech",
      
      // Interactive elements
      buttons: buttons,
      headerType: 4,
      
      // Message settings
      viewOnce: false,
      
      // Context information - AI signature
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363302677217436@newsletter',
          newsletterName: 'AI Assistant',
          serverMessageId: -1
        },
        participant: '0@s.whatsapp.net', // Makes it look like system-generated
        stanzaId: m.key.id,
        remoteJid: 'status@broadcast',
        expiration: 604800, // 1 week expiration
        ephemeralSettingTimestamp: Date.now()
      }
    };

    // ======================
    // MESSAGE SENDING
    // ======================
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    
    // Add AI typing effect
    await Matrix.sendPresenceUpdate('composing', m.from);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await Matrix.sendPresenceUpdate('paused', m.from);
  }
};
                             
export default ping;
