import moment from "moment-timezone";
import fs from "fs";
import os from "os";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg;
import config from "../config.cjs";
import axios from "axios";

// System stats
const totalMemoryBytes = os.totalmem();
const freeMemoryBytes = os.freemem();
const byteToKB = 1 / 1024;
const byteToMB = byteToKB / 1024;
const byteToGB = byteToMB / 1024;

function formatBytes(bytes) {
  if (bytes >= Math.pow(1024, 3)) return (bytes * byteToGB).toFixed(2) + " GB";
  if (bytes >= Math.pow(1024, 2)) return (bytes * byteToMB).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes * byteToKB).toFixed(2) + " KB";
  return bytes.toFixed(2) + " bytes";
}

const uptime = process.uptime();
const day = Math.floor(uptime / (24 * 3600));
const hours = Math.floor((uptime % (24 * 3600)) / 3600);
const minutes = Math.floor((uptime % 3600) / 60);
const seconds = Math.floor(uptime % 60);
const uptimeMessage = `*I’ve been grindin’ for ${day}d ${hours}h ${minutes}m ${seconds}s* 🕒`;
const runMessage = `*☀️ ${day} Day*\n*🕐 ${hours} Hour*\n*⏰ ${minutes} Min*\n*⏱️ ${seconds} Sec*`;

// Time logic
const xtime = moment.tz("Africa/Nairobi").format("HH:mm:ss");
const xdate = moment.tz("Africa/Nairobi").format("DD/MM/YYYY");
const time2 = moment().tz("Africa/Nairobi").format("HH:mm:ss");
let pushwish = "";

if (time2 < "05:00:00") {
  pushwish = `🌄 𝐆𝐨𝐨𝐝 𝐌𝐨𝐫𝐧𝐢𝐧𝐠`;
} else if (time2 < "11:00:00") {
  pushwish = `🌄 𝐆𝐨𝐨𝐝 𝐌𝐨𝐫𝐧𝐢𝐧𝐠`;
} else if (time2 < "15:00:00") {
  pushwish = `🌅𝐆𝐨𝐨𝐝 𝐀𝐟𝐭𝐞𝐫𝐧𝐨𝐨𝐧`;
} else if (time2 < "18:00:00") {
  pushwish = `🌃 𝐆𝐨𝐨𝐝 𝐄𝐯𝐞𝐧𝐢𝐧𝐠`;
} else if (time2 < "19:00:00") {
  pushwish = `🌃𝐆𝐨𝐨𝐝 𝐄𝐯𝐞𝐧𝐢𝐧𝐠`;
} else {
  pushwish = `🌌 𝐆𝐨𝐨𝐝 𝐍𝐢𝐠𝐡𝐭`;
} 

const menu = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const validCommands = ["owner", "oownernumber", "ownerbot"];

    if (!validCommands.includes(cmd)) return;

    const mode = config.MODE === "public" ? "public" : "private";
    const str = `*╰► ${pushwish}* ${m.pushName}
`;

    let menuImage;
    if (config.MENU_IMAGE && config.MENU_IMAGE.trim() !== "") {
      try {
        const response = await axios.get(config.MENU_IMAGE, { responseType: "arraybuffer" });
        menuImage = Buffer.from(response.data, "binary");
      } catch (error) {
        console.error("Error fetching menu image:", error.message);
        menuImage = fs.readFileSync("./media/Casey.jpg");
      }
    } else {
      menuImage = fs.readFileSync("./media/Casey.jpg");
    }

    const buttons = [
      {
        name: "quick_reply",
       buttonParamsJson: JSON.stringify({
       display_text: "💬message",
        id: "message"
            })
          },
      {
      name: "cta_copy",
       buttonParamsJson: JSON.stringify({
      display_text: "📋Copy message",
        id: "copy_code",
        copy_code: +25777821911  
        })
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "📚Follow Channel",
          url: `https://whatsapp.com/channel/0029VbAUmPuDJ6GuVsg8YC3R`
        }),
      },
    ];

    const msg = generateWAMessageFromContent(m.from, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({
              text: str,
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: "𝐩𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐂𝐚𝐬𝐞𝐲𝐫𝐡𝐨𝐝𝐞𝐬 𝐭𝐞𝐜𝐡",
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              imageMessage: (await prepareWAMessageMedia({ image: menuImage }, { upload: Matrix.waUploadToServer })).imageMessage,
              hasMediaAttachment: true,
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons,
            }),
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363302677217436@newsletter",
                newsletterName: "𝐂𝐀𝐒𝐄𝐘𝐑𝐇𝐎𝐃𝐄𝐒 𝐀𝐈",
                serverMessageId: 143,
              },
            },
          }),
        },
      },
    }, {});

    await Matrix.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
    });

    
  } catch (error) {
    console.error(`❌ Menu error: ${error.message}`);
    await Matrix.sendMessage(m.from, {
      text: `*Caseyrhodes* hit a snag, fam! Try again! 😈`,
    }, { quoted: m });
  }
};

export default menu;
