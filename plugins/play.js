import axios from "axios";
import yts from "yt-search";
import config from '../config.cjs';

const play = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const args = m.body.slice(prefix.length + cmd.length).trim().split(" ");

  if (cmd === "play") {
    if (args.length === 0 || !args.join(" ")) {
      return m.reply("*Please provide a song name or keywords to search for.*");
    }

    const searchQuery = args.join(" ");
    m.reply("*🎧 Searching for the song...*");

    try {
      const searchResults = await yts(searchQuery);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return m.reply(`❌ No results found for "${searchQuery}".`);
      }

      const firstResult = searchResults.videos[0];
      const videoUrl = firstResult.url;

      // Create buttons for format selection
      const buttons = [
        { buttonId: `${prefix}playmp3 ${firstResult.videoId}`, buttonText: { displayText: '🎵 MP3 Audio' }, type: 1 },
        { buttonId: `${prefix}playmp4 ${firstResult.videoId}`, buttonText: { displayText: '🎥 MP4 Video' }, type: 1 },
        { buttonId: `${prefix}playdoc ${firstResult.videoId}`, buttonText: { displayText: '📄 Document' }, type: 1 }
      ];

      const buttonMessage = {
        text: `📹 *Song Details*\n🎬 *Title:* ${firstResult.title}\n⏳ *Duration:* ${firstResult.timestamp}\n👀 *Views:* ${firstResult.views}\n👤 *Author:* ${firstResult.author.name}\n🔗 *Link:* ${firstResult.url}\n\n*Select download format:*`,
        footer: "Audio Downloader Bot",
        buttons: buttons,
        headerType: 1
      };

      // Send the message with buttons
      await gss.sendMessage(m.from, buttonMessage, { quoted: m });

    } catch (error) {
      console.error(error);
      m.reply("❌ An error occurred while processing your request.");
    }
  }

  // Handle the button selections
  if (cmd === "playmp3" || cmd === "playmp4" || cmd === "playdoc") {
    if (args.length === 0) {
      return m.reply("*Please provide a video ID.*");
    }

    const videoId = args[0];
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    m.reply("*⬇️ Downloading your media...*");

    try {
      let apiUrl, mimetype, fileName, messageOptions;
      
      if (cmd === "playmp3") {
        // MP3 Audio
        apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${videoUrl}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data.success) {
          return m.reply(`❌ Failed to fetch audio.`);
        }

        const { title, download_url } = response.data.result;
        fileName = title.replace(/[^\w\s]/gi, '') + '.mp3';
        
        // Send as audio message
        await gss.sendMessage(
          m.from,
          {
            audio: { url: download_url },
            mimetype: "audio/mp4",
            ptt: false,
          },
          { quoted: m }
        );
        
        m.reply(`✅ *${title}* has been downloaded as audio!`);
        
      } else if (cmd === "playmp4") {
        // MP4 Video
        apiUrl = `https://api.davidcyriltech.my.id/download/ytmp4?url=${videoUrl}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data.success) {
          return m.reply(`❌ Failed to fetch video.`);
        }

        const { title, download_url } = response.data.result;
        
        // Send as video message
        await gss.sendMessage(
          m.from,
          {
            video: { url: download_url },
            caption: title,
            mimetype: "video/mp4",
          },
          { quoted: m }
        );
        
        m.reply(`✅ *${title}* has been downloaded as video!`);
        
      } else if (cmd === "playdoc") {
        // Document format
        apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${videoUrl}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data.success) {
          return m.reply(`❌ Failed to fetch audio.`);
        }

        const { title, download_url } = response.data.result;
        fileName = title.replace(/[^\w\s]/gi, '') + '.mp3';
        
        // Send as document
        await gss.sendMessage(
          m.from,
          {
            document: { url: download_url },
            mimetype: "audio/mpeg",
            fileName: fileName,
          },
          { quoted: m }
        );
        
        m.reply(`✅ *${title}* has been downloaded as document!`);
      }
      
    } catch (error) {
      console.error(error);
      m.reply("❌ An error occurred while downloading your media.");
    }
  }
};

export default play;
