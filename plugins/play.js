import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg;

// Create promisified pipeline
const streamPipeline = promisify(pipeline);

// Create temporary directory
const tmpDir = os.tmpdir();

function toFancyFont(text) {
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
  return text
    .toLowerCase()
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const song = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const args = m.body.slice(prefix.length + cmd.length).trim().split(" ");

    if (cmd === "song") {
      if (args.length === 0 || !args.join(" ")) {
        return Matrix.sendMessage(m.from, {
          text: `◈━━━━━━━━━━━━━━━━◈
│❒ Give me a song name or keywords to search 😎
◈━━━━━━━━━━━━━━━━◈`,
        }, { quoted: m });
      }

      const searchQuery = args.join(" ");
      await Matrix.sendMessage(m.from, {
        text: `◈━━━━━━━━━━━━━━━━◈
│❒ *Toxic-MD* huntin' for "${searchQuery}"... 🎧
◈━━━━━━━━━━━━━━━━◈`,
      }, { quoted: m });

      // Search YouTube for song info
      const searchResults = await ytSearch(searchQuery);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return Matrix.sendMessage(m.from, {
          text: `◈━━━━━━━━━━━━━━━━◈
│❒ No tracks found for "${searchQuery}". You slippin'! 💀
◈━━━━━━━━━━━━━━━━◈`,
        }, { quoted: m });
      }

      const song = searchResults.videos[0];
      const safeTitle = song.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 100);
      const filePath = `${tmpDir}/${safeTitle}.mp3`;

      // Fetch download URL from the new API
      let apiResponse;
      try {
        const apiUrl = `https://api.giftedtech.web.id/api/download/dlmp3?apikey=gifted_api_se5dccy&url=${encodeURIComponent(song.url)}`;
        apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
          throw new Error(`API responded with status: ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        if (!data.success || !data.result.download_url) {
          throw new Error('API response missing download URL or failed');
        }

        // Send song info from yt-search and API
        const songInfo = `
◈━━━━━━━━━━━━━━━━◈
│❒ *Toxic-MD* Song Intel 🔥
│❒ *Title*: ${song.title}
│❒ *Views*: ${song.views.toLocaleString()}
│❒ *Duration*: ${song.timestamp}
│❒ *Channel*: ${song.author.name}
│❒ *Quality*: ${data.result.quality}
│❒ *Uploaded*: ${song.ago}
│❒ *URL*: ${song.url}
◈━━━━━━━━━━━━━━━━◈`;
        await Matrix.sendMessage(m.from, { text: songInfo }, { quoted: m });

        // Download the audio file
        const downloadResponse = await fetch(data.result.download_url);
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download audio: ${downloadResponse.status}`);
        }
        const fileStream = fs.createWriteStream(filePath);
        await streamPipeline(downloadResponse.body, fileStream);
      } catch (apiError) {
        console.error(`API error:`, apiError.message);
        return Matrix.sendMessage(m.from, {
          text: `◈━━━━━━━━━━━━━━━━◈
│❒ *Toxic-MD* couldn't hit the API for "${song.title}". Server's actin' up! 😡
◈━━━━━━━━━━━━━━━━◈`,
        }, { quoted: m });
      }

      // Send the audio file
      try {
        const audioBuffer = fs.readFileSync(filePath);
        
        // Prepare audio message with buttons
        const audioMessage = {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: `${safeTitle}.mp3`,
          ptt: false
        };
        
        // Create message with buttons
        const buttonMessage = {
          text: `◈━━━━━━━━━━━━━━━━◈
│❒ *${song.title}* dropped by *Toxic-MD*! Blast it! 🎶
◈━━━━━━━━━━━━━━━━◈`,
          footer: 'Toxic-MD Music Bot',
          buttons: [
            { buttonId: `${prefix}song ${searchQuery}`, buttonText: { displayText: 'Download Again' }, type: 1 },
            { buttonId: `${prefix}yt ${searchQuery}`, buttonText: { displayText: 'Video Version' }, type: 1 }
          ],
          headerType: 1
        };
        
        // Send audio
        await Matrix.sendMessage(m.from, audioMessage, { quoted: m });
        
        // Send buttons
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });

        // Clean up temp file after 5 seconds
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted temp file: ${filePath}`);
            }
          } catch (cleanupErr) {
            console.error('Error during file cleanup:', cleanupErr);
          }
        }, 5000);
      } catch (sendError) {
        console.error(`Failed to send audio:`, sendError.message);
        return Matrix.sendMessage(m.from, {
          text: `◈━━━━━━━━━━━━━━━━◈
│❒ *Toxic-MD* can't song "${song.title}". Failed to send audio 😣
◈━━━━━━━━━━━━━━━━◈`,
        }, { quoted: m });
      }
    }
  } catch (error) {
    console.error(`❌ song error: ${error.message}`);
    await Matrix.sendMessage(m.from, {
      text: `◈━━━━━━━━━━━━━━━━◈
│❒ *Toxic-MD* hit a snag, fam! Try again or pick a better track! 😈
◈━━━━━━━━━━━━━━━━◈`,
    }, { quoted: m });
  }
};

export default song;
