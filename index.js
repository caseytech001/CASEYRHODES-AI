import dotenv from 'dotenv';
dotenv.config();

import {
    makeWASocket,
    fetchLatestBaileysVersion,
    DisconnectReason,
    useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Handler, Callupdate, GroupUpdate } from './data/index.js';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import { File } from 'megajs';
import NodeCache from 'node-cache';
import path from 'path';
import chalk from 'chalk';
import config from './config.cjs';
import pkg from './lib/autoreact.cjs';
const { emojis, doReact } = pkg;

const prefix = process.env.PREFIX || config.PREFIX;
const app = express();
let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;

const MAIN_LOGGER = pino({ level: 'silent' });
const logger = MAIN_LOGGER.child({});
logger.level = "silent";

const msgRetryCounterCache = new NodeCache();

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function downloadSessionData() {
    if (!config.SESSION_ID) {
        console.error('❌ Please add your session to SESSION_ID env !!');
        return false;
    }

    const sessdata = config.SESSION_ID.split("Caseyrhodes~")[1];

    if (!sessdata || !sessdata.includes("#")) {
        console.error('❌ Invalid SESSION_ID format! It must contain both file ID and decryption key.');
        return false;
    }

    const [fileID, decryptKey] = sessdata.split("#");

    try {
        console.log("🔄 Downloading Session...");
        const file = File.fromURL(`https://mega.nz/file/${fileID}#${decryptKey}`);

        const data = await new Promise((resolve, reject) => {
            file.download((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        await fs.promises.writeFile(credsPath, data);
        console.log("🔒 Session Successfully Loaded !!");
        return true;
    } catch (error) {
        console.error('❌ Failed to download session data:', error);
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`🤖 JINX-MD using WA v${version.join('.')}, isLatest: ${isLatest}`);
        
        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: useQR,
            browser: ["JINX-MD", "safari", "3.3"],
            auth: state,
            getMessage: async () => {
                return { conversation: "JINX-MD whatsapp user bot" };
            }
        });

        Matrix.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    start();
                }
            } else if (connection === 'open') {
                if (initialConnection) {
                    console.log(chalk.green("Connected Successfully JINX-XMD 🤍"));
                    
                    // Send welcome message after successful connection with buttons
                    const startMess = {
                        image: { url: "https://files.catbox.moe/y3j3kl.jpg" }, 
                        caption: `*Hello there JINX-XMD User! 👋🏻* 

> Simple, Straightforward, But Loaded With Features 🎊. Meet JINX-XMD WhatsApp Bot.
*Thanks for using JINX-XMD 🚩* 
Join WhatsApp Channel: ⤵️  
> https://whatsapp.com/channel/0029VakUEfb4o7qVdkwPk83E

- *YOUR PREFIX:* = ${prefix}

Don't forget to give a star to the repo ⬇️  
> https://github.com/caseyweb/CASEYRHODES-XMD
> © Powered BY CASEYRHODES TECH 🍀 🖤`,
                        buttons: [
                            {
                                buttonId: 'help',
                                buttonText: { displayText: '📋 HELP' },
                                type: 1
                            },
                            {
                                buttonId: 'menu',
                                buttonText: { displayText: '📱 MENU' },
                                type: 1
                            },
                            {
                                buttonId: 'source',
                                buttonText: { displayText: '⚙️ SOURCE' },
                                type: 1
                            }
                        ],
                        headerType: 1
                    };

                    Matrix.sendMessage(Matrix.user.id, startMess).catch(() => {});
                    initialConnection = false;
                } else {
                    console.log(chalk.blue("♻️ Connection reestablished after restart."));
                }
            }
        });
        
        Matrix.ev.on('creds.update', saveCreds);

        // Enhanced messages.upsert handler
        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            const m = chatUpdate.messages[0];
            if (!m.message) return;

            // Handle button responses
            if (m.message.buttonsResponseMessage) {
                const selected = m.message.buttonsResponseMessage.selectedButtonId;
                if (selected === 'help') {
                    await Matrix.sendMessage(m.key.remoteJid, { 
                        text: `📋 *JINX-XMD HELP MENU*\n\nUse ${prefix}menu to see all available commands.\nUse ${prefix}list to see command categories.` 
                    });
                    return;
                } else if (selected === 'menu') {
                    await Matrix.sendMessage(m.key.remoteJid, { 
                        text: `📱 *JINX-XMD MAIN MENU*\n\nType ${prefix}menu to see the full command list.\nType ${prefix}all to see all features.` 
                    });
                    return;
                } else if (selected === 'source') {
                    await Matrix.sendMessage(m.key.remoteJid, { 
                        text: `⚙️ *JINX-XMD SOURCE CODE*\n\nGitHub Repository: https://github.com/caseyweb/CASEYRHODES-XMD\n\nGive it a star ⭐ if you like it!` 
                    });
                    return;
                }
            }

            // Existing handlers - silent mode
            try {
                await Handler(chatUpdate, Matrix, logger);
            } catch (error) {
                // Silent error handling
            }
        });

        Matrix.ev.on("call", async (json) => {
            try {
                await Callupdate(json, Matrix);
            } catch (error) {
                // Silent error handling
            }
        });
        
        Matrix.ev.on("group-participants.update", async (messag) => {
            try {
                await GroupUpdate(Matrix, messag);
            } catch (error) {
                // Silent error handling
            }
        });
        
        if (config.MODE === "public") {
            Matrix.public = true;
        } else if (config.MODE === "private") {
            Matrix.public = false;
        }

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.key) return;
                
                if (!mek.key.fromMe && config.AUTO_REACT) {
                    if (mek.message) {
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await doReact(randomEmoji, mek, Matrix);
                    }
                }
            } catch (err) {
                // Silent error handling
            }
        });
        
        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.key || !mek.message) return;
                
                const fromJid = mek.key.participant || mek.key.remoteJid;
                if (mek.key.fromMe) return;
                if (mek.message.protocolMessage || mek.message.ephemeralMessage || mek.message.reactionMessage) return; 
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true") {
                    const ravlike = await Matrix.decodeJid(Matrix.user.id);
                    const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👻', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '♻️', '🎉', '💜', '💙', '✨', '🖤', '💚'];
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    await Matrix.sendMessage(mek.key.remoteJid, {
                        react: {
                            text: randomEmoji,
                            key: mek.key,
                        } 
                    }, { statusJidList: [mek.key.participant, ravlike] });
                }                       
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([mek.key]);
                    
                    if (config.AUTO_STATUS_REPLY) {
                        const customMessage = config.STATUS_READ_MSG || '✅ Auto Status Seen Bot By JINX-XMD';
                        await Matrix.sendMessage(fromJid, { text: customMessage }, { quoted: mek });
                    }
                }
            } catch (err) {
                // Silent error handling
            }
        });

    } catch (error) {
        console.error('Critical Error:', error);
        process.exit(1);
    }
}

async function init() {
    if (fs.existsSync(credsPath)) {
        console.log("🔒 Session file found, proceeding without QR code.");
        await start();
    } else {
        const sessionDownloaded = await downloadSessionData();
        if (sessionDownloaded) {
            console.log("🔒 Session downloaded, starting bot.");
            await start();
        } else {
            console.log("No session found or downloaded, QR code will be printed for authentication.");
            useQR = true;
            await start();
        }
    }
}

init();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
