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

    // Use the NexOracle API as in the first example
    const apiUrl = `https://api.nexoracle.com/downloader/apk`;
    const params = {
      apikey: 'free_key@maher_apis',
      q: query,
    };

    // Call the NexOracle API using GET
    const response = await axios.get(apiUrl, { params });

    // Check if the API response is valid
    if (!response.data || response.data.status !== 200 || !response.data.result) {
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
        text: "❌ Unable to find the APK. Please try again later.",
        footer: "APK Downloader",
        buttons: buttons,
        headerType: 1,
        mentions: [m.sender]
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    // Extract the APK details from the response
    const { name, lastup, package: packageName, size, icon, dllink } = response.data.result;

    // Send a message with the app thumbnail first
    await Matrix.sendMessage(m.from, {
      image: { url: icon },
      caption: `📦 *Downloading ${name}... Please wait.*`,
      mentions: [m.sender]
    }, { quoted: m });

    // Download the APK file
    const apkResponse = await axios.get(dllink, { responseType: 'arraybuffer' });
    if (!apkResponse.data) {
      throw new Error('Failed to download APK file');
    }

    // Prepare the APK file buffer
    const apkBuffer = Buffer.from(apkResponse.data, 'binary');

    // Prepare the message with APK details
    const caption = `╭━━━〔 *ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 〕━━━┈⊷
┃  *Name:* ${name}
┃  *Size:* ${size}
┃  *Package:* ${packageName}
┃  *Updated On:* ${lastup}
╰━━━━━━━━━━━━━━━┈⊷
> *ᴍᴀᴅᴇ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ*`;

    try {
      // Upload the APK file to server
      const docMedia = await prepareWAMessageMedia(
        { 
          document: apkBuffer,
          fileName: `${name}.apk`,
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
            fileName: `${name}.apk`,
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
        text: `${caption}\n\n*Download Link:* ${dllink}`,
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
    await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
  }
};

export default apkDownloader;
