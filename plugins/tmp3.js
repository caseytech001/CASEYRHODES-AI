import config from "../config.cjs";
import converter from "../data/stickerconverter.js";

const tomp3 = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const body = m.body || "";
    const cmd = body.startsWith(prefix)
      ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
      : "";

    if (!["tomp3"].includes(cmd)) return;

    // React to trigger message
    try {
      await Matrix.sendMessage(m.from, {
        react: { text: "🎵", key: m.key }
      });
    } catch (err) {
      console.error("Reaction failed:", err);
    }

    if (!m.quoted) {
      return await Matrix.sendMessage(m.from, { text: "*ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴠɪᴅᴇᴏ/ᴀᴜᴅɪᴏ ᴍᴇꜱꜱᴀɢᴇ*" }, { quoted: m });
    }

    if (!['videoMessage', 'audioMessage'].includes(m.quoted.mtype)) {
      return await Matrix.sendMessage(m.from, { text: "ᴏɴʟʏ ᴠɪᴅᴇᴏ/ᴀᴜᴅɪᴏ ᴍᴇꜱꜱᴀɢᴇꜱ ᴄᴀɴ ʙᴇ ᴄᴏɴᴠᴇʀᴛᴇᴅ" }, { quoted: m });
    }

    if (m.quoted.seconds > 300) {
      return await Matrix.sendMessage(m.from, { text: "ᴍᴇᴅɪᴀ ᴛᴏᴏ ʟᴏɴɢ (ᴍᴀx 5 ᴍɪɴᴜᴛᴇꜱ)" }, { quoted: m });
    }

    // Send processing message
    await Matrix.sendMessage(m.from, { text: "ᴄᴏɴᴠᴇʀᴛɪɴɢ ᴛᴏ ᴀᴜᴅɪᴏ..." }, { quoted: m });

    const buffer = await m.quoted.download();
    const ext = m.quoted.mtype === 'videoMessage' ? 'mp4' : 'm4a';
    const audio = await converter.toAudio(buffer, ext);

    // Send result
    await Matrix.sendMessage(m.from, {
      audio: audio,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

  } catch (error) {
    console.error('Conversion error:', error);
    await Matrix.sendMessage(m.from, {
      text: `◈━━━━━━━━━━━━━━━━◈
│❒ *Error:* ${error.message || "Failed to convert to audio"} 😡
◈━━━━━━━━━━━━━━━━◈`
    }, { quoted: m });
  }
};

export default tomp3;
