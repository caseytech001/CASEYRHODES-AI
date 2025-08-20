import axios from "axios";
import config from "../config.cjs";

const tiktok = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const query = m.body.slice(prefix.length + cmd.length).trim();

  if (!["tiktok", "tt"].includes(cmd)) return;

  if (!query || !query.startsWith("http")) {
    return Matrix.sendMessage(m.from, { text: "❌ *Usage:* `.tiktok <TikTok URL>`" }, { quoted: m });
  }

  try {
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    const { data } = await axios.get(`https://api.davidcyriltech.my.id/download/tiktok?url=${query}`);

    if (!data.success || !data.result || !data.result.video) {
      return Matrix.sendMessage(m.from, { text: "⚠️ *Failed to fetch TikTok video. Please try again.*" }, { quoted: m });
    }

    const { desc, author, statistics, video, music } = data.result;

    const caption = `🎵 *TikTok Video*\n\n💬 *${desc}*\n👤 *By:* ${author.nickname}\n❤️ *Likes:* ${statistics.likeCount}\n💬 *Comments:* ${statistics.commentCount}\n🔄 *Shares:* ${statistics.shareCount}\n\n📥 *Select download quality:*`;

    // Create buttons for different quality options
    const buttons = [
      {
        buttonId: `${prefix}hd`,
        buttonText: { displayText: "🎬 HD Quality" },
        type: 1
      },
      {
        buttonId: `${prefix}sd`,
        buttonText: { displayText: "📱 Standard Quality" },
        type: 1
      },
      {
        buttonId: `${prefix}audio`,
        buttonText: { displayText: "🎵 Audio Only" },
        type: 1
      }
    ];

    // Send message with buttons
    await Matrix.sendMessage(m.from, {
      text: caption,
      footer: "Powered By JawadTechX ✅",
      buttons: buttons,
      headerType: 1,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      }
    }, { quoted: m });

    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    // Store the video data for later use when buttons are clicked
    // This would typically be stored in a temporary database or cache
    // For this example, we'll assume we have a simple storage mechanism
    global.tiktokData = global.tiktokData || {};
    global.tiktokData[m.sender] = {
      video,
      music,
      caption: `🎵 *TikTok Video*\n\n💬 *${desc}*\n👤 *By:* ${author.nickname}\n❤️ *Likes:* ${statistics.likeCount}\n💬 *Comments:* ${statistics.commentCount}\n🔄 *Shares:* ${statistics.shareCount}\n\n📥 *Powered By JawadTechX ✅*`
    };

  } catch (error) {
    console.error("TikTok Downloader Error:", error);
    Matrix.sendMessage(m.from, { text: "❌ *An error occurred while processing your request. Please try again later.*" }, { quoted: m });
  }
};

// Handle button responses
const handleTikTokButtons = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const text = m.body.toLowerCase();
  
  if (!global.tiktokData || !global.tiktokData[m.sender]) return;
  
  const userData = global.tiktokData[m.sender];
  
  if (text === `${prefix}hd` || text === `${prefix}sd`) {
    // For this example, we're using the same video URL for both HD and SD
    // In a real implementation, you would have different quality URLs
    await Matrix.sendMessage(m.from, {
      video: { url: userData.video },
      mimetype: "video/mp4",
      caption: userData.caption,
    }, { quoted: m });
    
    // Clean up stored data
    delete global.tiktokData[m.sender];
    
  } else if (text === `${prefix}audio`) {
    await Matrix.sendMessage(m.from, {
      audio: { url: userData.music },
      mimetype: "audio/mpeg",
      fileName: "TikTok_Audio.mp3",
      caption: "🎶 *TikTok Audio Downloaded*",
    }, { quoted: m });
    
    // Clean up stored data
    delete global.tiktokData[m.sender];
  }
};

export { tiktok, handleTikTokButtons };
