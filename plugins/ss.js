// plugins/screenshot.js
import config from "../config.cjs";

const screenshot = async (m, sock, { from, args, reply, sender, isGroup, isAdmins, isBotAdmins }) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const body = m.body || "";
    const cmd = body.startsWith(prefix)
      ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
      : "";

    if (!["screenshot", "ss", "ssweb"].includes(cmd)) return;

    // React to trigger message
    try {
      await sock.sendMessage(m.from, {
        react: { text: "🌐", key: m.key }
      });
    } catch (err) {
      console.error("Reaction failed:", err);
    }

    const url = args[0];
    if (!url) {
      return await sock.sendMessage(m.from, { 
        text: "❌ Please provide a URL\nExample: .screenshot https://google.com" 
      }, { quoted: m });
    }
    
    if (!url.startsWith("http")) {
      return await sock.sendMessage(m.from, { 
        text: "❌ URL must start with http:// or https://" 
      }, { quoted: m });
    }

    // Newsletter configuration
    const newsletterConfig = {
      contextInfo: {
        mentionedJid: [sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363402973786789@newsletter',
          newsletterName: 'CASEYRHODES AI',
          serverMessageId: 143
        }
      }
    };

    // Send the screenshot directly
    await sock.sendMessage(m.from, {
      image: { 
        url: `https://image.thum.io/get/fullpage/${url}`,
        mimetype: "image/jpeg"
      },
      caption: "🖼️ *Screenshot Generated*\n\n" +
              "🔗 *Website:* " + url + "\n\n" +
              "> ⚡ *by Caseyrhodes AI*",
      ...newsletterConfig
    }, { quoted: m });

  } catch (error) {
    console.error("Screenshot Error:", error);
    await sock.sendMessage(m.from, { 
      text: "❌ Failed to capture screenshot\n✦ Please try again later" 
    }, { quoted: m });
  }
};

// Add pattern property for handler detection
screenshot.pattern = /^screenshot$/i;
screenshot.alias = ["ss", "ssweb"];
screenshot.desc = "Capture a full-page screenshot of a website.";
screenshot.category = "main";
screenshot.use = ".screenshot <url>";

export default screenshot;
