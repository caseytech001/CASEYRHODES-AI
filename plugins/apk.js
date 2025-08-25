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

    // Fixed API endpoint - using a more reliable APK download API
    const apiUrl = `https://api.apkdownloaders.com/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(apiUrl);

    if (!data?.results?.length) {
      const buttons = [
        {
          buttonId: `${prefix}menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1,
        },
        {
          buttonId: `${prefix}apk ${query}`,
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

    const app = data.results[0];
    const appSize = (app.size / 1048576).toFixed(2); // Convert bytes to MB

    const caption = `╭━━━〔 *ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 〕━━━┈⊷
┃  *Name:* ${app.name}
┃  *Size:* ${appSize} MB
┃  *Package:* ${app.packageName}
┃  *Updated On:* ${app.updated}
┃  *Developer:* ${app.developer}
╰━━━━━━━━━━━━━━━┈⊷
> *ᴍᴀᴅᴇ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ*`;

    try {
      // Prepare the document with buttons
      const docMedia = await prepareWAMessageMedia(
        { 
          document: { url: app.downloadUrl }, 
          fileName: `${app.name}.apk`,
          mimetype: "application/vnd.android.package-archive"
        },
        { upload: Matrix.waUploadToServer }
      );

      // Create message with document
      const message = generateWAMessageFromContent(
        m.from,
        {
          documentMessage: {
            url: docMedia.document.url,
            mimetype: docMedia.document.mimetype,
            fileLength: docMedia.document.fileLength,
            fileName: `${app.name}.apk`,
            caption: caption,
          }
        },
        { quoted: m }
      );

      await Matrix.sendMessage(m.from, { react: { text: "⬆️", key: m.key } });
      await Matrix.relayMessage(m.from, message.message, { messageId: message.key.id });
      await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    } catch (mediaError) {
      console.error("Media preparation error:", mediaError);
      // Fallback to sending download link as text
      const fallbackMessage = {
        text: `${caption}\n\n*Download Link:* ${app.downloadUrl}`,
        footer: "APK Downloader",
        headerType: 1,
        mentions: [m.sender]
      };
      await Matrix.sendMessage(m.from, fallbackMessage, { quoted: m });
    }

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
