import { exec } from 'child_process';
import fs from 'fs';
import { getRandom } from '../lib/myfunc.cjs'; 
import config from '../config.cjs';

const audioEffects = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['bass', 'blown', 'deep', 'earrape', 'fast', 'fat', 'nightcore', 'reverse', 'robot', 'slow', 'smooth', 'tupai'];
    
    // Show help menu with buttons if no command or help command
    if (cmd === 'edit' || cmd === 'audioeffects' || cmd === '') {
      const buttonMessage = {
        text: `🎵 *AUDIO EFFECTS MENU* 🎵\n\n*Available Effects:*\n• bass - Enhance bass\n• blown - Distorted effect\n• deep - Deep voice\n• earrape - Loud volume\n• fast - Speed up audio\n• fat - Bass boost\n• nightcore - Nightcore effect\n• reverse - Reverse audio\n• robot - Robot voice\n• slow - Slow down audio\n• smooth - Smooth effect\n• tupai - Chipmunk voice\n\n*Usage:* Reply to an audio with *${prefix}[effect]*`,
        footer: config.BOT_NAME,
        buttons: [
          { buttonId: `${prefix}bass`, buttonText: { displayText: '🎸 BASS' }, type: 1 },
          { buttonId: `${prefix}deep`, buttonText: { displayText: '🔊 DEEP' }, type: 1 },
          { buttonId: `${prefix}nightcore`, buttonText: { displayText: '🎶 NIGHTCORE' }, type: 1 }
        ],
        headerType: 1
      };
      return gss.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
    }

    if (!validCommands.includes(cmd)) return;

    let set;
    if (cmd === 'bass') {
      set = '-af equalizer=f=54:width_type=o:width=2:g=20';
    } else if (cmd === 'blown') {
      set = '-af acrusher=.1:1:64:0:log';
    } else if (cmd === 'deep') {
      set = '-af atempo=4/4,asetrate=44500*2/3';
    } else if (cmd === 'earrape') {
      set = '-af volume=12';
    } else if (cmd === 'fast') {
      set = '-filter:a "atempo=1.63,asetrate=44100"';
    } else if (cmd === 'fat') {
      set = '-filter:a "atempo=1.6,asetrate=22100"';
    } else if (cmd === 'nightcore') {
      set = '-filter:a atempo=1.06,asetrate=44100*1.25';
    } else if (cmd === 'reverse') {
      set = '-filter_complex "areverse"';
    } else if (cmd === 'robot') {
      set = '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"';
    } else if (cmd === 'slow') {
      set = '-filter:a "atempo=0.7,asetrate=44100"';
    } else if (cmd === 'smooth') {
      set = '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"';
    } else if (cmd === 'tupai') {
      set = '-filter:a "atempo=0.5,asetrate=65100"';
    }

    // Check if message is quoted and contains audio
    if (!m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage) {
      const noAudioMessage = {
        text: `❌ *Please reply to an audio message!*\n\nReply to an audio with *${prefix + cmd}* to apply the effect.`,
        footer: config.BOT_NAME,
        buttons: [
          { buttonId: `${prefix}audio`, buttonText: { displayText: '📋 EFFECTS MENU' }, type: 1 },
          { buttonId: `${prefix}help`, buttonText: { displayText: '❓ HELP' }, type: 1 }
        ],
        headerType: 1
      };
      return gss.sendMessage(m.key.remoteJid, noAudioMessage, { quoted: m });
    }

    const processingMessage = {
      text: `⏳ *Processing ${cmd.toUpperCase()} effect...*\nPlease wait while we apply the audio effect.`,
      footer: config.BOT_NAME
    };
    await gss.sendMessage(m.key.remoteJid, processingMessage, { quoted: m });

    const quoted = m.message.extendedTextMessage.contextInfo;
    
    // Download the quoted audio message
    const buffer = await gss.downloadAndSaveMediaMessage(quoted.quotedMessage.audioMessage);
    const mediaPath = `./${getRandom('.webm')}`;
    fs.renameSync(buffer, mediaPath);
    const outputPath = `./${getRandom('.mp3')}`;

    exec(`ffmpeg -i ${mediaPath} ${set} ${outputPath}`, async (err, stderr, stdout) => {
      fs.unlinkSync(mediaPath);
      if (err) {
        console.error('Error:', err);
        const errorMessage = {
          text: `❌ *Error Processing Audio*\nAn error occurred while applying the ${cmd} effect.`,
          footer: config.BOT_NAME,
          buttons: [
            { buttonId: `${prefix}audio`, buttonText: { displayText: '📋 TRY AGAIN' }, type: 1 }
          ],
          headerType: 1
        };
        return gss.sendMessage(m.key.remoteJid, errorMessage, { quoted: m });
      }
      
      const buff = fs.readFileSync(outputPath);
      
      // Send success message with buttons
      const successMessage = {
        text: `✅ *${cmd.toUpperCase()} Effect Applied Successfully!*\n\nAudio has been processed with ${cmd} effect.`,
        footer: config.BOT_NAME,
        buttons: [
          { buttonId: `${prefix}audio`, buttonText: { displayText: '🎵 MORE EFFECTS' }, type: 1 },
          { buttonId: `${prefix}bass`, buttonText: { displayText: '🎸 BASS' }, type: 1 },
          { buttonId: `${prefix}nightcore`, buttonText: { displayText: '🎶 NIGHTCORE' }, type: 1 }
        ],
        headerType: 1
      };
      
      // Send the success message
      await gss.sendMessage(m.key.remoteJid, successMessage, { quoted: m });
      
      // Send the processed audio
      await gss.sendMessage(m.key.remoteJid, { 
        audio: buff, 
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: m });
      
      fs.unlinkSync(outputPath);
    });
  } catch (e) {
    console.error('Error:', e);
    const errorMessage = {
      text: `❌ *Unexpected Error*\nAn error occurred while processing the command.`,
      footer: config.BOT_NAME,
      buttons: [
        { buttonId: `${prefix}audio`, buttonText: { displayText: '📋 MENU' }, type: 1 },
        { buttonId: `${prefix}help`, buttonText: { displayText: '❓ HELP' }, type: 1 }
      ],
      headerType: 1
    };
    gss.sendMessage(m.key.remoteJid, errorMessage, { quoted: m });
  }
};

export default audioEffects;
