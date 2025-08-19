import fetch from 'node-fetch';
import ytSearch from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg;

function toFancyFont(text) {
  const fonts = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  return text
    .toLowerCase()
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const streamPipeline = promisify(pipeline);
const tmpDir = os.tmpdir();

// Store temporary file paths for users
const userTempFiles = new Map();

const play = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const args = m.body.slice(prefix.length + cmd.length).trim().split(" ");

    // Handle button responses
    if (m.message?.buttonsResponseMessage) {
      const buttonId = m.message.buttonsResponseMessage.selectedButtonId;
      const userId = m.sender;
      
      if (buttonId === 'audio_format' && userTempFiles.has(userId)) {
        const { filePath, songTitle, safeTitle } = userTempFiles.get(userId);
        
        // Send as audio
        const audioMessage = {
          audio: fs.readFileSync(filePath),
          mimetype: 'audio/mpeg',
          ptt: false,
        };
        await Matrix.sendMessage(m.from, audioMessage, { quoted: m });
        
        // Clean up
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted temp file: ${filePath}`);
          }
          userTempFiles.delete(userId);
        }, 5000);
        
        return;
      }
      
      if (buttonId === 'document_format' && userTempFiles.has(userId)) {
        const { filePath, songTitle, safeTitle } = userTempFiles.get(userId);
        
        // Send as document
        const documentMessage = {
          document: fs.readFileSync(filePath),
          mimetype: 'audio/mpeg',
          fileName: `${safeTitle}.mp3`,
        };
        await Matrix.sendMessage(m.from, documentMessage, { quoted: m });
        
        // Clean up
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted temp file: ${filePath}`);
          }
          userTempFiles.delete(userId);
        }, 5000);
        
        return;
      }
    }

    if (cmd === "play") {
      if (args.length === 0 || !args.join(" ")) {
        const buttons = [
          {
            buttonId: `.menu`,
            buttonText: { displayText: `📃${toFancyFont("Menu")}` },
            type: 1,
          },
        ];
        return Matrix.sendMessage(m.from, {
          text: `${toFancyFont("give")} ${toFancyFont("me")} ${toFancyFont("a")} ${toFancyFont("song")} ${toFancyFont("name")} ${toFancyFont("or")} ${toFancyFont("keywords")} ${toFancyFont("to")} ${toFancyFont("search")}`,
        }, { 
          quoted: {
            key: {
              fromMe: false,
              participant: `0@s.whatsapp.net`,
              remoteJid: "status@broadcast"
            },
            message: {
              contactMessage: {
                displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ✅",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ;BOT;;;\nFN:ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ\nitem1.TEL;waid=254700000000:+254 700 000000\nitem1.X-ABLabel:Bot\nEND:VCARD`
              }
            }
          }
        });
      }
      
      const searchQuery = args.join(" ");
      await Matrix.sendMessage(m.from, {
        text: `*ɴᴊᴀʙᴜʟᴏ ᴊʙ* ${toFancyFont("huntin'")} ${toFancyFont("for")} "${searchQuery}"`,
      }, { 
        quoted: {
          key: {
            fromMe: false,
            participant: `0@s.whatsapp.net`,
            remoteJid: "status@broadcast"
          },
          message: {
            contactMessage: {
              displayName: "✆︎NנɐႦυℓσ נႦ verified",
              vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=254700000000:+254 700 000000\nitem1.X-ABLabel:Bot\nEND:VCARD`
            }
          }
        }
      });

      // Search YouTube for song info
      const searchResults = await ytSearch(searchQuery);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        const buttons = [
          {
            buttonId: `.menu`,
            buttonText: { displayText: `📃${toFancyFont("Menu")}` },
            type: 1,
          },
        ];
        return Matrix.sendMessage(m.from, {
          text: `${toFancyFont("no")} ${toFancyFont("tracks")} ${toFancyFont("found")} ${toFancyFont("for")} "${searchQuery}". ${toFancyFont("you")} ${toFancyFont("slippin'")}!`,
        }, { 
          quoted: {
            key: {
              fromMe: false,
              participant: `0@s.whatsapp.net`,
              remoteJid: "status@broadcast"
            },
            message: {
              contactMessage: {
                displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ verified",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=254700000000:+254 700 000000\nitem1.X-ABLabel:Bot\nEND:VCARD`
              }
            }
          }
        });
      }

      const song = searchResults.videos[0];
      const safeTitle = song.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').substring(0, 100);
      const filePath = `${tmpDir}/${safeTitle}.mp3`;

      // Fetch download URL from the new API
      let apiResponse;
      try {
        const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(searchQuery)}`;
        apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
          throw new Error(`API responded with status: ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        if (!data.status || !data.result.download_url) {
          throw new Error('API response missing download URL or failed');
        }

        // Send song info from yt-search and API
        const songInfo = `

${toFancyFont("*Njbulo Jb*")} Song Intel 🔥
${toFancyFont("*Title*")}: ${data.result.title || song.title}
${toFancyFont("*Views*")}: ${song.views.toLocaleString()}
${toFancyFont("*Duration*")}: ${song.timestamp}
${toFancyFont("*Channel*")}: ${song.author.name}
${toFancyFont("*Uploaded*")}: ${song.ago}
${toFancyFont("*URL*")}: ${data.result.video_url || song.url}
`;

        const buttons = [
          {
            buttonId: "audio_format",
            buttonText: { displayText: "🎵 Audio" },
            type: 1,
          },
          {
            buttonId: "document_format",
            buttonText: { displayText: "📁 Document" },
            type: 1,
          }
        ];

        await Matrix.sendMessage(m.from, {
          text: songInfo,
          buttons: buttons,
          headerType: 1
        }, { 
          quoted: {
            key: {
              fromMe: false,
              participant: `0@s.whatsapp.net`,
              remoteJid: "status@broadcast"
            },
            message: {
              contactMessage: {
                displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ verified",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=254700000000:+254 700 000000\nitem1.X-ABLabel:Bot\nEND:VCARD`
              }
            }
          }
        });

        // Download the audio file
        const downloadResponse = await fetch(data.result.download_url);
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download audio: ${downloadResponse.status}`);
        }
        const fileStream = fs.createWriteStream(filePath);
        await streamPipeline(downloadResponse.body, fileStream);
        
        // Store file info for this user
        userTempFiles.set(m.sender, {
          filePath,
          songTitle: song.title,
          safeTitle
        });
        
        // Set timeout to clean up after 5 minutes if not used
        setTimeout(() => {
          if (userTempFiles.has(m.sender)) {
            const { filePath } = userTempFiles.get(m.sender);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Cleaned up unused temp file: ${filePath}`);
            }
            userTempFiles.delete(m.sender);
          }
        }, 5 * 60 * 1000);
        
      } catch (apiError) {
        console.error(`API error:`, apiError.message);
        const buttons = [
          {
            buttonId: `.support`,
            buttonText: { displayText: `⚠︎${toFancyFont("support")}` },
            type: 1,
          },
        ];
        return Matrix.sendMessage(m.from, {
          text: `*Njabulo Jb* ${toFancyFont("couldn't")} ${toFancyFont("hit")} ${toFancyFont("the")} ${toFancyFont("api")} ${toFancyFont("for")} "${song.title}". ${toFancyFont("server's")} ${toFancyFont("actin'")} ${toFancyFont("up")}!`,
        }, { 
          quoted: {
            key: {
              fromMe: false,
              participant: `0@s.whatsapp.net`,
              remoteJid: "status@broadcast"
            },
            message: {
              contactMessage: {
                displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪverified",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ;BOT;;;\nFN:ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ\nitem1.TEL;waid=254700000000:+254 700 000000\nitem1.X-ABLabel:Bot\nEND:VCARD`
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`❌ song error: ${error.message}`);
    const buttons = [
      {
        buttonId: `.support`,
        buttonText: { displayText: `⚠︎${toFancyFont("support")}` },
        type: 1,
      },
    ];
    await Matrix.sendMessage(m.from, {
      text: `*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* ${toFancyFont("hit")} ${toFancyFont("a")} ${toFancyFont("snag")}, ${toFancyFont("fam")}! ${toFancyFont("try")} ${toFancyFont("again")} ${toFancyFont("or")} ${toFancyFont("pick")} ${toFancyFont("a")} ${toFancyFont("better")} ${toFancyFont("track")}! `,
    }, { 
      quoted: {
        key: {
          fromMe: false,
          participant: `0@s.whatsapp.net`,
          remoteJid: "status@broadcast"
        },
        message: {
          contactMessage: {
            displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ verified",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ;BOT;;;\nFN:ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ\nitem1.TEL;waid=254700000000:+254 700 000000\nitem1.X-ABLabel:Bot\nEND:VCARD`
          }
        }
      }
    });
  }
};

export default play;
