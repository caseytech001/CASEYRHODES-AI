import { toAudio } from '../lib/converter.cjs';
import config from '../config.cjs';

const tomp3 = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['tomp3', 'mp3'];

    if (!validCommands.includes(cmd)) return;

    if (!m.quoted || !m.quoted.mtype || !m.quoted.mtype.match(/(video|audio)/i)) {
      return m.reply(`Send/Reply with a Video to convert into MP3 with caption ${prefix + cmd}`);
    }

    m.reply('Converting to MP3, please wait...');
    const media = await m.quoted.download();
    
    // Convert to audio
    const audio = await toAudio(media, 'mp4');
    
    // Send as audio message instead of document
    await gss.sendMessage(
      m.from, 
      { 
        audio: audio, 
        mimetype: 'audio/mpeg', 
        ptt: false,
        fileName: `converted_audio.mp3`
      }, 
      { quoted: m }
    );
    
  } catch (error) {
    console.error('Error in tomp3 command:', error);
    m.reply('An error occurred while converting the video to audio. Please try again.');
  }
};

export default tomp3;
