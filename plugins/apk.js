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
  const query = m.body.slice(prefix.length + cmd.length).trim();

  if (!["apk", "app", "application"].includes(cmd)) return;
  
  if (!query) {
    return await Matrix.sendMessage(m.from, {
      text: "❌ *Usage:* `.apk <App Name>`",
      footer: "APK Downloader",
      mentions: [m.sender]
    }, { quoted: m });
  }

  try {
    // Send processing reaction
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    // Use multiple API endpoints for better reliability
    const apiUrls = [
      `https://api.nexoracle.com/downloader/apk?apikey=free_key@maher_apis&q=${encodeURIComponent(query)}`,
      `https://apkdownloaders.com/api/search?q=${encodeURIComponent(query)}`
    ];

    let apkData = null;
    let apiError = null;

    // Try multiple APIs concurrently with timeout
    for (const apiUrl of apiUrls) {
      try {
        const response = await Promise.race([
          axios.get(apiUrl, { timeout: 10000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);

        if (response.data && (response.data.status === 200 || response.data.results)) {
          apkData = response.data;
          break;
        }
      } catch (error) {
        apiError = error;
        continue;
      }
    }

    if (!apkData) {
      throw new Error(apiError || 'No APK found');
    }

    // Extract APK data based on API response format
    let name, lastup, packageName, size, icon, dllink;

    if (apkData.status === 200 && apkData.result) {
      // NexOracle format
      ({ name, lastup, package: packageName, size, icon, dllink } = apkData.result);
    } else if (apkData.results && apkData.results.length > 0) {
      // Alternative API format
      const app = apkData.results[0];
      name = app.name;
      lastup = app.updated || app.lastUpdate;
      packageName = app.packageName || app.package;
      size = app.size ? (app.size / 1048576).toFixed(2) + ' MB' : 'Unknown';
      icon = app.icon || app.image;
      dllink = app.downloadUrl || app.dllink;
    } else {
      throw new Error('Invalid API response format');
    }

    // Send thumbnail immediately while downloading APK in background
    const thumbnailPromise = Matrix.sendMessage(m.from, {
      image: { url: icon },
      caption: `📦 *Downloading ${name}...*\n⏳ *Please wait while we prepare your file...*`,
      mentions: [m.sender]
    }, { quoted: m });

    // Download APK concurrently with thumbnail sending
    const apkPromise = Promise.race([
      axios.get(dllink, { 
        responseType: 'arraybuffer', 
        timeout: 30000,
        onDownloadProgress: (progress) => {
          if (progress.loaded / progress.total > 0.5) {
            Matrix.sendMessage(m.from, { react: { text: "⬆️", key: m.key } });
          }
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Download timeout')), 45000))
    ]);

    // Wait for both operations
    const [apkResponse] = await Promise.all([apkPromise, thumbnailPromise]);

    if (!apkResponse.data) {
      throw new Error('Failed to download APK file');
    }

    const apkBuffer = Buffer.from(apkResponse.data);

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
    console.error("APK Downloader Error:", error);
    
    // Remove processing reaction
    await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
    
    await Matrix.sendMessage(m.from, {
      text: "❌ *Failed to download APK. Please try again with a different app name.*",
      footer: "APK Downloader",
      mentions: [m.sender]
    }, { quoted: m });
  }
};

export default apkDownloader;
