import axios from "axios";
import config from "../config.cjs";
import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";

function toFancyFont(text) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", 
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", 
    q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", 
    y: "ʏ", z: "ᴢ",
  };
  return text.toLowerCase()
    .split("")
    .map(char => fonts[char] || char)
    .join("");
}

const apkDownloader = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const text = m.body.slice(prefix.length + cmd.length).trim();
  const query = text.split(" ")[0]; // Get only the first word as query

  if (!["apk", "app", "application"].includes(cmd)) return;
  
  if (!query) {
    return await Matrix.sendMessage(m.from, {
      text: "❌ *Usage:* `.apk <App Name>`\nExample: `.apk whatsapp`",
      footer: "APK Downloader",
      mentions: [m.sender]
    }, { quoted: m });
  }

  try {
    // Send processing reaction
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    // Use a reliable APK API
    const apiUrl = `https://api.nexoracle.com/downloader/apk`;
    const params = {
      apikey: 'free_key@maher_apis',
      q: query,
    };

    // Call the API with timeout
    const response = await Promise.race([
      axios.get(apiUrl, { params, timeout: 15000 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 15000))
    ]);

    // Check if API response is valid
    if (!response.data || response.data.status !== 200 || !response.data.result) {
      throw new Error('No APK found or invalid API response');
    }

    // Extract APK data
    const { name, lastup, package: packageName, size, icon, dllink } = response.data.result;

    // Send thumbnail immediately
    await Matrix.sendMessage(m.from, {
      image: { url: icon },
      caption: `📦 *Downloading ${name}...*\n⏳ *Please wait while we prepare your file...*`,
      mentions: [m.sender]
    }, { quoted: m });

    // Download APK file
    const apkResponse = await Promise.race([
      axios.get(dllink, { 
        responseType: 'arraybuffer', 
        timeout: 45000,
        maxContentLength: 100 * 1024 * 1024 // 100MB limit
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Download timeout')), 45000))
    ]);

    if (!apkResponse.data) {
      throw new Error('Failed to download APK file - no data received');
    }

    const apkBuffer = Buffer.from(apkResponse.data);

    // Check if file size is reasonable
    if (apkBuffer.length > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('APK file too large');
    }

    // Prepare caption
    const caption = `╭━━━〔 *ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 〕━━━┈⊷
┃  *Name:* ${name}
┃  *Size:* ${size}
┃  *Package:* ${packageName}
┃  *Updated On:* ${lastup}
╰━━━━━━━━━━━━━━━┈⊷
> *ᴍᴀᴅᴇ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ*`;

    // Upload and send APK file
    const docMedia = await prepareWAMessageMedia(
      { 
        document: apkBuffer,
        fileName: `${name.replace(/[^\w\s]/gi, '')}.apk`,
        mimetype: "application/vnd.android.package-archive"
      },
      { upload: Matrix.waUploadToServer }
    );

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

    // Send the APK file
    await Matrix.relayMessage(m.from, message.message, { messageId: message.key.id });
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("APK Downloader Error:", error.message);
    
    // Remove processing reaction and show error
    await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
    
    let errorMessage = "❌ *Failed to download APK. Please try again with a different app name.*";
    
    if (error.message.includes('timeout')) {
      errorMessage = "❌ *Request timeout. Please try again.*";
    } else if (error.message.includes('large')) {
      errorMessage = "❌ *APK file is too large to send via WhatsApp.*";
    }
    
    await Matrix.sendMessage(m.from, {
      text: errorMessage,
      footer: "APK Downloader",
      mentions: [m.sender]
    }, { quoted: m });
  }
};

export default apkDownloader;
