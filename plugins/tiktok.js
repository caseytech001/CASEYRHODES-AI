import axios from "axios";
import config from "../config.cjs";

const tiktok = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const text = m.body.slice(prefix.length + cmd.length).trim();
  const query = text.split(" ")[0]; // Get the first word as URL

  // Menu button handler
  if (cmd === "tiktok" && (text === "menu" || text === "" || !text.startsWith("http"))) {
    const buttonMessage = {
      text: `🎵 *TikTok Downloader Menu*\n\nSend *${prefix}tiktok <url>* to download a TikTok video\n\nExample: *${prefix}tiktok https://vm.tiktok.com/ABC123/*`,
      footer: "CASEYRHODES-XMD 👻 TikTok Downloader",
      buttons: [
        { buttonId: `${prefix}help`, buttonText: { displayText: "Help" }, type: 1 },
        { buttonId: `${prefix}tiktok https://example.com`, buttonText: { displayText: "Example" }, type: 1 }
      ],
      headerType: 1
    };
    return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }

  if (!["tiktok", "tt"].includes(cmd)) return;

  if (!query || !query.startsWith("http")) {
    const buttonMessage = {
      text: "❌ *Invalid URL*\n\nPlease provide a valid TikTok URL starting with http/https",
      footer: "Type '.tiktok menu' to see usage examples",
      buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
      headerType: 1
    };
    return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }

  try {
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    const { data } = await axios.get(`https://api.diioffc.web.id/api/search/tiktok?query=${encodeURIComponent(query)}`);

    if (!data.success || !data.result || !data.result.video) {
      const buttonMessage = {
        text: "⚠️ *Failed to fetch TikTok video.*\n\nThe URL might be invalid or the API is temporarily unavailable.",
        footer: "Please try again with a different URL",
        buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
        headerType: 1
      };
      return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const { desc, author, statistics, video, music } = data.result;

    const caption = `🎵 *TikTok Video*\n\n💬 *${desc}*\n👤 *By:* ${author.nickname}\n❤️ *Likes:* ${statistics.likeCount}\n💬 *Comments:* ${statistics.commentCount}\n🔄 *Shares:* ${statistics.shareCount}\n\n📥 *Powered By CASEYRHODES-XMD 👻✅*`;

    await Matrix.sendMessage(m.from, {
      video: { url: video },
      mimetype: "video/mp4",
      caption,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363302677217436@newsletter",
          newsletterName: "CASEYRHODES-XMD 👻",
          serverMessageId: 143,
        },
      },
    }, { quoted: m });

    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    // Send the TikTok music separately with a menu button
    const audioMessage = {
      audio: { url: music },
      mimetype: "audio/mpeg",
      fileName: "TikTok_Audio.mp3",
      caption: "🎶 *TikTok Audio Downloaded*",
      footer: "CASEYRHODES-XMD 👻 TikTok Downloader",
      buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Download Another" }, type: 1 }]
    };
    
    await Matrix.sendMessage(m.from, audioMessage, { quoted: m });

  } catch (error) {
    console.error("TikTok Downloader Error:", error);
    const buttonMessage = {
      text: "❌ *An error occurred while processing your request.*\n\nPlease try again later or with a different URL.",
      footer: "Server might be busy or URL is invalid",
      buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
      headerType: 1
    };
    Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};

export default tiktok;
