import axios from "axios";
import yts from "yt-search";
import config from '../config.cjs';

const play2 = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const args = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === "play") {
    if (!args) return m.reply("Please provide a YouTube link or song name\nExample: .play2 Moye Moye\nOr: .play2 https://youtu.be/xyz");

    try {
      m.reply("🔍 Processing your request...");

      let videoUrl;
      
      // Check if input is a YouTube URL
      if (args.match(/(youtube\.com|youtu\.be)/)) {
        videoUrl = args;
      } else {
        // Search YouTube if input is text
        const searchResults = await yts(args);
        if (!searchResults.videos.length) return m.reply("❌ No results found");
        videoUrl = searchResults.videos[0].url;
      }

      const apiUrl = `https://api.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(videoUrl)}`;
      const { data } = await axios.get(apiUrl);

      if (!data.success) return m.reply("❌ Failed to download audio");

      const listButton = {
        buttonText: "Select an option",
        sections: [
          {
            title: "Audio Options",
            rows: [
              {
                title: "Audio",
                rowId: "audio",
                description: "Send as audio",
              },
              {
                title: "Document",
                rowId: "document",
                description: "Send as document",
              },
            ],
          },
        ],
      };

      await gss.sendMessage(
        m.from,
        {
          text: "Select an option",
          buttonText: listButton.buttonText,
          sections: listButton.sections,
          listType: 1,
        },
        { quoted: m }
      );

      gss.ev.on("messages.upsert", async (update) => {
        const msg = update.messages[0];
        if (msg.key.remoteJid === m.from && msg.listResponseMessage) {
          const selectedOption = msg.listResponseMessage.singleSelectReply.selectedRowId;

          if (selectedOption === "audio") {
            await gss.sendMessage(
              m.from,
              { 
                audio: { url: data.result.downloadUrl },
                mimetype: 'audio/mpeg'
              },
              { quoted: m }
            );
          } else if (selectedOption === "document") {
            await gss.sendMessage(
              m.from,
              { 
                document: { url: data.result.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${args}.mp3`
              },
              { quoted: m }
            );
          }
        }
      });

    } catch (error) {
      console.error(error);
      m.reply("❌ An error occurred: " + error.message);
    }
  }
};

export default play2;
