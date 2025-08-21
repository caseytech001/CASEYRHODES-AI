import axios from "axios";
import yts from "yt-search";
import config from '../config.cjs';

// Constants for better maintainability
const YOUTUBE_REGEX = /(youtube\.com|youtu\.be)/;
const API_BASE_URL = "https://api.davidcyriltech.my.id/youtube/mp3";
const AUDIO_MIMETYPE = 'audio/mpeg';

const play2 = async (m, gss) => {
  const prefix = config.PREFIX;
  const body = m.body || '';
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const args = body.slice(prefix.length + cmd.length).trim();

  if (cmd !== "play") return;

  if (!args) {
    return m.reply("Please provide a YouTube link or song name\nExample: .play2 Moye Moye\nOr: .play2 https://youtu.be/xyz");
  }

  try {
    await m.reply("🔍 Processing your request...");

    let videoUrl;
    
    // Check if input is a YouTube URL
    if (YOUTUBE_REGEX.test(args)) {
      videoUrl = args;
    } else {
      // Search YouTube if input is text
      const searchResults = await yts(args);
      if (!searchResults.videos || !searchResults.videos.length) {
        return m.reply("❌ No results found for your search");
      }
      videoUrl = searchResults.videos[0].url;
    }

    // Validate video URL
    if (!videoUrl || typeof videoUrl !== 'string') {
      return m.reply("❌ Invalid video URL obtained");
    }

    const apiUrl = `${API_BASE_URL}?url=${encodeURIComponent(videoUrl)}`;
    
    // Add timeout and better error handling for API request
    const { data } = await axios.get(apiUrl, {
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500 // Don't throw for 4xx errors
    });

    if (!data || !data.success || !data.result || !data.result.downloadUrl) {
      console.error('API response error:', data);
      return m.reply("❌ Failed to process audio. The service might be unavailable.");
    }

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

    // Send the options menu
    await gss.sendMessage(
      m.from,
      {
        text: "Select how you want to receive the audio:",
        footer: "Audio: Plays in chat | Document: Downloadable file",
        buttonText: listButton.buttonText,
        sections: listButton.sections,
        listType: 1,
      },
      { quoted: m }
    );

    // Create a one-time listener for the response
    const responseListener = async (update) => {
      try {
        const msg = update.messages?.[0];
        if (!msg || msg.key.remoteJid !== m.from) return;
        
        // Check if it's a list response
        if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
          const selectedOption = msg.listResponseMessage.singleSelectReply.selectedRowId;
          
          // Remove listener to prevent multiple responses
          gss.ev.off("messages.upsert", responseListener);

          // Add processing indicator
          await gss.sendMessage(m.from, { text: "⏳ Preparing your audio..." }, { quoted: m });

          if (selectedOption === "audio") {
            await gss.sendMessage(
              m.from,
              { 
                audio: { url: data.result.downloadUrl },
                mimetype: AUDIO_MIMETYPE,
                ptt: false // Not push-to-talk
              },
              { quoted: m }
            );
          } else if (selectedOption === "document") {
            await gss.sendMessage(
              m.from,
              { 
                document: { url: data.result.downloadUrl },
                mimetype: AUDIO_MIMETYPE,
                fileName: `${args.substring(0, 50)}.mp3`.replace(/[^a-zA-Z0-9._-]/g, '_')
              },
              { quoted: m }
            );
          }
        }
      } catch (error) {
        console.error('Error handling user selection:', error);
        await gss.sendMessage(m.from, { text: "❌ Failed to send audio. Please try again." }, { quoted: m });
      }
    };

    // Add timeout for user response (2 minutes)
    const responseTimeout = setTimeout(() => {
      gss.ev.off("messages.upsert", responseListener);
      gss.sendMessage(m.from, { text: "⏰ Response timeout. Please use the command again." }, { quoted: m });
    }, 120000);

    // Clean up timeout when listener is removed
    gss.ev.on("messages.upsert", responseListener);
    
    // Remove timeout when listener is triggered
    gss.ev.once("messages.upsert", () => clearTimeout(responseTimeout));

  } catch (error) {
    console.error('Play2 command error:', error);
    
    let errorMessage = "❌ An error occurred";
    if (error.code === 'ECONNABORTED') {
      errorMessage = "⏰ Request timeout. Please try again.";
    } else if (error.response?.status === 404) {
      errorMessage = "❌ Audio not found. The video might be unavailable.";
    } else if (error.response?.status >= 500) {
      errorMessage = "❌ Service temporarily unavailable. Please try again later.";
    }
    
    m.reply(errorMessage + (config.DEBUG ? `\nError: ${error.message}` : ''));
  }
};

export default play2;
