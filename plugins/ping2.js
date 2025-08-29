import { makeWASocket, makeInMemoryStore, useMultiFileAuthState, fetchLatestBaileysVersion, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import config from '../config.js'; // Fixed directory path

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
    k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ",
    u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const ping = async (m, Matrix) => {
  const prefix = config.PREFIX || ".";
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
    : "";
    
  if (cmd === "ping2") {
    const start = new Date().getTime();
    await m.React("✈");
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    const text = `*${toFancyFont("Njabulo Jb")}* : ${responseTime.toFixed(2)} s`;
    
    // Create the message with buttons
    const template = generateWAMessageFromContent(m.from, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            mentionedJid: [m.sender],
          },
          interactiveMessage: {
            body: { text },
            footer: { text: "Response Time" },
            header: {
              title: "Ping Result",
              hasMediaAttachment: false
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: toFancyFont("Alive"),
                    id: `.alive`
                  })
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: toFancyFont("Menu"),
                    id: `.menu`
                  })
                },
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: toFancyFont("Follow our Channel"),
                    url: "https://whatsapp.com/channel/0029VagJlnG6xCSU2tS1Vz19"
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: m });

    await Matrix.relayMessage(m.from, template.message, { messageId: template.key.id });
  }
};

export default ping;
