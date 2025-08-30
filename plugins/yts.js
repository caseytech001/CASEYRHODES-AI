import axios from "axios";
import yts from "yt-search";
import config from '../config.cjs';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';

if (cmd === "yts") {
  if (args.length === 0 || !args.join(" ").trim()) {
    return reply("*Please provide a song name or keywords to search for.*");
  }

  try {
    const searchResults = await yts(args.join(" "));
    if (!searchResults.videos || searchResults.videos.length === 0) {
      return reply(` No results found for "${args.join(" ")}".`);
    }

    let mesaj = '';
    searchResults.all.forEach((video) => {
      mesaj += ' *🖲️' + video.title + '*\n🔗 ' + video.url + '\n\n';
    });
    await gss.sendMessage(m.from, { text: mesaj }, { quoted: m });

    const firstResult = searchResults.videos[0];
    const videoUrl = firstResult.url;
    const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
    
    const response = await axios.get(apiUrl);
    if (!response.data.success) {
      return reply(` Failed to fetch audio for "${args.join(" ")}".`);
    }
    
    const { title, download_url } = response.data.result;
    const outputFile = `${Date.now()}.mp3`;
    const outputFilePath = `./${outputFile}`;
    const boostedFilePath = `${outputFilePath}boosted.mp3`;

    try {
      // Download the file
      const response = await axios({
        method: 'GET',
        url: download_url,
        responseType: 'stream'
      });

      const writer = createWriteStream(outputFilePath);
      await pipeline(response.data, writer);

      // Process with ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(outputFilePath)
          .audioFilters('equalizer=f=100:width_type=o:width=2:g=10')
          .output(boostedFilePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      // Send the audio file
      await gss.sendMessage(
        m.from, 
        { 
          audio: { url: boostedFilePath }, 
          mimetype: 'audio/mp4',
          fileName: `${title}.mp3`
        }, 
        { quoted: m }
      );

    } catch (error) {
      console.error('Processing error:', error);
      return reply('*Error processing audio!*');
    } finally {
      // Clean up files
      try {
        if (fs.existsSync(outputFilePath)) {
          fs.unlinkSync(outputFilePath);
        }
        if (fs.existsSync(boostedFilePath)) {
          fs.unlinkSync(boostedFilePath);
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

  } catch (error) {
    console.error('General error:', error);
    reply(" An error occurred while processing your request.");
  }
}
