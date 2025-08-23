import axios from "axios";
import config from "../config.cjs";
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from "@whiskeysockets/baileys";

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const apkDownloader = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const query = m.body.slice(prefix.length + cmd.length).trim();

  if (!["apk", "app", "application"].includes(cmd)) return;
  if (!query) {
    const buttons = [
      {
        buttonId: `${prefix}menu`,
        buttonText: { displayText: `${toFancyFont("Menu")}` },
        type: 1,
      },
    ];
    const buttonMessage = {
      text: "❌ *Usage:* `.apk <App Name>`",
      footer: "APK Downloader",
      buttons: buttons,
      headerType: 1,
      mentions: [m.sender]
    };
    return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }

  try {
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=1`;
    const { data } = await axios.get(apiUrl);

    if (!data?.datalist?.list?.length) {
      const buttons = [
        {
          buttonId: `${prefix}menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
        {
          buttonId: `${prefix}search ${query}`,
          buttonText: { displayText: `${toFancyFont("Search Again")}` },
          type: 1,
        },
      ];
      const buttonMessage = {
        text: "⚠️ *No results found for the given app name.*",
        footer: "APK Downloader",
        buttons: buttons,
        headerType: 1,
        mentions: [m.sender]
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2); // Convert bytes to MB

    const caption = `╭━━━〔 *ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 〕━━━┈⊷
┃  *Name:* ${app.name}
┃  *Size:* ${appSize} MB
┃  *Package:* ${app.package}
┃  *Updated On:* ${app.updated}
┃  *Developer:* ${app.developer.name}
╰━━━━━━━━━━━━━━━┈⊷
> *ᴍᴀᴅᴇ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ*`;

    // Prepare the document message
    const documentMessage = {
      document: { url: app.file.path_alt },
      fileName: `${app.name}.apk`,
      mimetype: "application/vnd.android.package-archive",
      caption: caption,
    };

    // Create message with buttons
    const buttonMessage = {
      text: caption,
      footer: "APK Downloader",
      buttons: [
        { buttonId: `${prefix}menu`, buttonText: { displayText: `${toFancyFont("Menu")}` } },
        { buttonId: `${prefix}search ${query}`, buttonText: { displayText: `${toFancyFont("Search Again")}` } }
      ],
      headerType: 1,
      mentions: [m.sender],
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true
      }
    };

    await Matrix.sendMessage(m.from, { react: { text: "⬆️", key: m.key } });

    // Prepare and send the document
    const docMedia = await prepareWAMessageMedia(
      { document: { url: app.file.path_alt }, fileName: `${app.name}.apk` },
      { upload: Matrix.waUploadToServer }
    );
    
    const docMsg = generateWAMessageFromContent(
      m.from,
      {
        documentMessage: {
          ...docMedia.documentMessage,
          caption: caption,
          fileName: `${app.name}.apk`,
          mimetype: "application/vnd.android.package-archive",
        }
      },
      { quoted: m }
    );
    
    await Matrix.relayMessage(m.from, docMsg.message, { messageId: docMsg.key.id });

    // Send the button message
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });

    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("APK Downloader Error:", error);
    const buttons = [
      {
        buttonId: `${prefix}menu`,
        buttonText: { displayText: `${toFancyFont("Menu")}` },
        type: 1,
      },
    ];
    const buttonMessage = {
      text: "❌ *An error occurred while fetching the APK. Please try again.*",
      footer: "APK Downloader",
      buttons: buttons,
      headerType: 1,
      mentions: [m.sender]
    };
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};

export default apkDownloader;
