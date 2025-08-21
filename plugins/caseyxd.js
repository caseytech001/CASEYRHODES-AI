import moment from 'moment-timezone';
import fs from 'fs';
import os from 'os';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, proto } = pkg;
import config from '../config.cjs';
import axios from 'axios';

// Get total memory and free memory in bytes
const totalMemoryBytes = os.totalmem();
const freeMemoryBytes = os.freemem();

// Define unit conversions
const byteToKB = 1 / 1024;
const byteToMB = byteToKB / 1024;
const byteToGB = byteToMB / 1024;

// Function to format bytes to a human-readable format
function formatBytes(bytes) {
  if (bytes >= Math.pow(1024, 3)) {
    return (bytes * byteToGB).toFixed(2) + ' GB';
  } else if (bytes >= Math.pow(1024, 2)) {
    return (bytes * byteToMB).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes * byteToKB).toFixed(2) + ' KB';
  } else {
    return bytes.toFixed(2) + ' bytes';
  }
}

// Bot Process Time
const uptime = process.uptime();
const day = Math.floor(uptime / (24 * 3600)); // Calculate days
const hours = Math.floor((uptime % (24 * 3600)) / 3600); // Calculate hours
const minutes = Math.floor((uptime % 3600) / 60); // Calculate minutes
const seconds = Math.floor(uptime % 60); // Calculate seconds

// Uptime
const uptimeMessage = `*I am alive now since ${day}d ${hours}h ${minutes}m ${seconds}s*`;
const runMessage = `*☀️ ${day} Day*\n*🕐 ${hours} Hour*\n*⏰ ${minutes} Minutes*\n*⏱️ ${seconds} Seconds*\n`;

const xtime = moment.tz("Asia/Colombo").format("HH:mm:ss");
const xdate = moment.tz("Asia/Colombo").format("DD/MM/YYYY");
const time2 = moment().tz("Asia/Colombo").format("HH:mm:ss");
let pushwish = "";

if (time2 < "05:00:00") {
  pushwish = `Good Morning 🌄`;
} else if (time2 < "11:00:00") {
  pushwish = `Good Morning 🌄`;
} else if (time2 < "15:00:00") {
  pushwish = `Good Afternoon 🌅`;
} else if (time2 < "18:00:00") {
  pushwish = `Good Evening 🌃`;
} else if (time2 < "19:00:00") {
  pushwish = `Good Evening 🌃`;
} else {
  pushwish = `Good Night 🌌`;
}

const menu = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const mode = config.MODE === 'public' ? 'public' : 'private';
  const pref = config.PREFIX;
  const pushname = m.pushName || 'User'; // Added fallback for pushname

  const validCommands = ['list', 'help', 'menu2'];

  if (validCommands.includes(cmd)) {
    const mainMenu = `_🌟 *Good ${
  new Date().getHours() < 12 ? 'Morning' : 
  (new Date().getHours() < 18 ? 'Afternoon' : 'Evening')
}, ${pushname}!* 🌟_
*╭───────────────┈⊷*
*┊• 🖼️ ɢʀᴇᴇᴛ :-* ${pushwish}
*┊• ⏰ ᴛɪᴍᴇ :-* *${xtime}*
*┊• 📅 ᴅᴀᴛᴇ :-* *${xdate}*
*┊• 🎭 ʙᴏᴛ ᴘᴏᴡᴇʀᴇᴅ :-* *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ ᴢᴏɴᴇ*
*┊• 📍 ᴀᴄᴛɪᴠᴇ ꜱᴇꜱꜱɪᴏɴꜱ :-* *${Matrix.user.id}*
*╰───────────────┈⊷*

*ʜᴇʟʟᴏ ʙʀᴏ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴍɪɴɪ ʙᴏᴛ ☃️ , ᴀ ᴍᴜʟᴛɪ ᴅᴇᴠɪᴄᴇ ᴘᴏᴡᴇʀꜰᴜʟ ꜰʀᴇᴇ ʙᴏᴛ. ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ ᴢᴏɴᴇ ᴛᴇᴀᴍ*📬

*🌐 CASEYRHODES MINI BOT Website :*
> 

*© ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴛʜᴇ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ ᴢᴏɴᴇ*`;

    // Function to get menu image
    const getMenuImage = async () => {
      if (config.MENU_IMAGE && config.MENU_IMAGE.trim() !== '') {
        try {
          const response = await axios.get(config.MENU_IMAGE, { responseType: 'arraybuffer' });
          return Buffer.from(response.data, 'binary');
        } catch (error) {
          console.error('Error fetching menu image from URL, falling back to local image:', error);
          try {
            return fs.readFileSync('./media/Casey.jpg');
          } catch (err) {
            console.error('Error reading local image file:', err);
            return null;
          }
        }
      } else {
        try {
          return fs.readFileSync('./media/Casey.jpg');
        } catch (err) {
          console.error('Error reading local image file:', err);
          return null;
        }
      }
    };

    const menuImage = await getMenuImage();
    
    // Create buttons for menu selection in 3x3 grid like the image
    const buttons = [
      {
        buttonId: `${prefix}menu 1`, 
        buttonText: {displayText: '📥 DOWNLOAD'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 2`, 
        buttonText: {displayText: '🔄 CONVERTER'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 3`, 
        buttonText: {displayText: '🤖 AI MENU'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 4`, 
        buttonText: {displayText: '🛠️ TOOLS'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 5`, 
        buttonText: {displayText: '👥 GROUP'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 6`, 
        buttonText: {displayText: '🔍 SEARCH'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 7`, 
        buttonText: {displayText: '🏠 MAIN'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 8`, 
        buttonText: {displayText: '👑 OWNER'}, 
        type: 1
      },
      {
        buttonId: `${prefix}menu 9`, 
        buttonText: {displayText: '👀 STALK'}, 
        type: 1
      }
    ];

    const buttonMessage = {
      image: menuImage,
      caption: mainMenu,
      footer: `CHOOSE MENU TAB`,
      buttons: buttons,
      headerType: 4,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363302677217436@newsletter',
          newsletterName: "CASEYRHODES-XMD 👻",
          serverMessageId: 143
        }
      }
    };

    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });

    // Send audio after sending the menu
    try {
      await Matrix.sendMessage(m.from, {
        audio: { url: 'https://files.catbox.moe/m0xfku.mp3' },
        mimetype: 'audio/mp4',
        ptt: true
      }, { quoted: m });
    } catch (error) {
      console.error('Error sending audio:', error);
    }
  }
};

// Handle button responses
const handleMenuButton = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const body = m.body.trim();
  
  if (body.startsWith(`${prefix}menu`)) {
    const parts = body.split(' ');
    if (parts.length < 2) return;
    
    const menuNumber = parts[1];
    let menuResponse;
    let menuTitle;
    
    switch (menuNumber) {
      case "1":
        menuTitle = "Download Menu";
        menuResponse = `
╭━━〔 *Download Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• apk
┃◈┃• facebook
┃◈┃• mediafire
┃◈┃• pinterestdl
┃◈┃• gitclone
┃◈┃• gdrive
┃◈┃• insta
┃◈┃• ytmp3
┃◈┃• ytmp4
┃◈┃• play
┃◈┃• song
┃◈┃• video
┃◈┃• ytmp3doc
┃◈┃• ytmp4doc
┃◈┃• tiktok
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "2":
        menuTitle = "Converter Menu";
        menuResponse = `
╭━━〔 *Converter Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• attp
┃◈┃• attp2
┃◈┃• attp3
┃◈┃• ebinary
┃◈┃• dbinary
┃◈┃• emojimix
┃◈┃• mp3
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "3":
        menuTitle = "AI Menu";
        menuResponse = `
╭━━〔 *AI Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• ai
┃◈┃• bug
┃◈┃• report
┃◈┃• gpt
┃◈┃• dalle
┃◈┃• remini
┃◈┃• gemini
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "4":
        menuTitle = "Tools Menu";
        menuResponse = `
╭━━〔 *Tools Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• calculator
┃◈┃• tempmail
┃◈┃• checkmail
┃◈┃• trt
┃◈┃• tts
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "5":
        menuTitle = "Group Menu";
        menuResponse = `
╭━━〔 *Group Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• linkgroup
┃◈┃• setppgc
┃◈┃• setname
┃◈┃• setdesc
┃◈┃• group
┃◈┃• gcsetting
┃◈┃• welcome
┃◈┃• add
┃◈┃• kick
┃◈┃• hidetag
┃◈┃• tagall
┃◈┃• antilink
┃◈┃• antitoxic
┃◈┃• promote
┃◈┃• demote
┃◈┃• getbio
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "6":
        menuTitle = "Search Menu";
        menuResponse = `
╭━━〔 *Search Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• play
┃◈┃• yts
┃◈┃• imdb
┃◈┃• google
┃◈┃• gimage
┃◈┃• pinterest
┃◈┃• wallpaper
┃◈┃• wikimedia
┃◈┃• ytsearch
┃◈┃• ringtone
┃◈┃• lyrics
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "7":
        menuTitle = "Main Menu";
        menuResponse = `
╭━━〔 *Main Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• ping
┃◈┃• alive
┃◈┃• owner
┃◈┃• menu
┃◈┃• infobot
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "8":
        menuTitle = "Owner Menu";
        menuResponse = `
╭━━〔 *Owner Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• join
┃◈┃• leave
┃◈┃• block
┃◈┃• unblock
┃◈┃• setppbot
┃◈┃• anticall
┃◈┃• setstatus
┃◈┃• setnamebot
┃◈┃• autotyping
┃◈┃• alwaysonline
┃◈┃• autoread
┃◈┃• autosview
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      case "9":
        menuTitle = "Stalk Menu";
        menuResponse = `
╭━━〔 *Stalk Menu* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• truecaller
┃◈┃• instastalk
┃◈┃• githubstalk
┃◈└───────────┈⊷
╰──────────────┈⊷`;
        break;
        
      default:
        menuTitle = "Invalid Choice";
        menuResponse = "*Invalid menu selection. Please use the buttons provided.*";
    }

    // Format the full response with title and description
    const fullResponse = `
╭━━━〔 *${config.BOT_NAME || 'CASEYRHODES BOT'} - ${menuTitle}* 〕━━━┈⊷
┃★╭──────────────
┃★│• Owner : *${config.OWNER_NAME || 'CaseyRhodes'}*
┃★│• User : *${m.pushName || 'User'}*
┃★│• Prefix : [${prefix}]
┃★│• Version : *3.1.0*
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷

${menuResponse}

> *${config.DESCRIPTION || 'Powered by CaseyRhodes Tech Zone'}*`;

    // Function to get menu image
    const getMenuImage = async () => {
      if (config.MENU_IMAGE && config.MENU_IMAGE.trim() !== '') {
        try {
          const response = await axios.get(config.MENU_IMAGE, { responseType: 'arraybuffer' });
          return Buffer.from(response.data, 'binary');
        } catch (error) {
          console.error('Error fetching menu image from URL, falling back to local image:', error);
          try {
            return fs.readFileSync('./media/Casey.jpg');
          } catch (err) {
            console.error('Error reading local image file:', err);
            return null;
          }
        }
      } else {
        try {
          return fs.readFileSync('./media/Casey.jpg');
        } catch (err) {
          console.error('Error reading local image file:', err);
          return null;
        }
      }
    };

    const menuImage = await getMenuImage();

    // Create back button
    const backButton = [
      {buttonId: `${prefix}menu`, buttonText: {displayText: '🔙 BACK TO MAIN MENU'}, type: 1}
    ];

    const buttonMessage = {
      image: menuImage,
      caption: fullResponse,
      footer: `CHOOSE MENU TAB`,
      buttons: backButton,
      headerType: 4,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363302677217436@newsletter',
          newsletterName: "CASEYRHODES-XMD 👻",
          serverMessageId: 143
        }
      }
    };

    // Send the response with image and context info
    await Matrix.sendMessage(m.from, buttonMessage, {
      quoted: m
    });
  }
};

export { menu, handleMenuButton };
