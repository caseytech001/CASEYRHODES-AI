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
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import config from './config.cjs';
import pkg from './lib/autoreact.cjs';
const { emojis, doReact } = pkg;

const prefix = process.env.PREFIX || config.PREFIX;
const app = express();
let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;

// Global variables for the connection message
global.botname = '𝗝𝗜𝗡𝗫-𝗫𝗠𝗗';
global.themeemoji = '•';
const owner = '254112192119';

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Optimized logging - completely silent
const MAIN_LOGGER = pino({ level: 'silent', enabled: false });
const logger = MAIN_LOGGER.child({});
logger.level = "silent";

// Optimized cache with shorter TTL
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// Predefined welcome message for faster access
const startMess = {
    image: { url: "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg" }, 
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

// Predefined reactions for faster access
const reactions = [
    '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
    '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', 
    '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', 
    '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', 
    '💍', '👝', '💼', '🎒', '🥽', '🐻', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', 
    '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', 
    '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
    '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
    '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', 
    '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', 
    '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', 
    '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', 
    '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', 
    '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', 
    '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰'
];

// Predefined status emojis
const statusEmojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👻', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '♻️', '🎉', '💜', '💙', '✨', '🖤', '💚'];

// Predefined newsletter channels
const newsletterChannels = [
    "120363299029326322@newsletter",
    "120363402973786789@newsletter",
    "120363339980514201@newsletter",
];

async function downloadSessionData() {
    try {
        if (!config.SESSION_ID) return false;

        const sessdata = config.SESSION_ID.split("Caseyrhodes~")[1];
        if (!sessdata || !sessdata.includes("#")) return false;

        const [fileID, decryptKey] = sessdata.split("#");
        const file = File.fromURL(`https://mega.nz/file/${fileID}#${decryptKey}`);

        const data = await new Promise((resolve, reject) => {
            file.download((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        await fs.promises.writeFile(credsPath, data);
        return true;
    } catch (error) {
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent', enabled: false }),
            printQRInTerminal: useQR,
            browser: ["JINX-MD", "safari", "3.3"],
            auth: state,
            msgRetryCounterCache,
            getMessage: async () => ({}),
            // Optimize connection settings for faster response
            connectTimeoutMs: 20000,
            keepAliveIntervalMs: 15000,
            maxIdleTimeMs: 30000,
            // Reduce retry attempts for faster failover
            maxRetries: 3,
            // Enable faster message processing
            transactionOpts: {
                maxCommitRetries: 2,
                delayBetweenTriesMs: 1000
            }
        });

        // Connection update handler - optimized for speed
        Matrix.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(start, 2000); // Reduced restart delay
                }
            } else if (connection === 'open') {
                if (initialConnection) {
                    // Display connection success message
                    await delay(1999);
                    console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || '𝗕𝗘𝗡 10 𝗠𝗗'} ]`)}\n\n`));
                    console.log(chalk.cyan(`< ================================================== >`));
                    console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: CASEYRHODES AI`));
                    console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: Caseyweb`));
                    console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`));
                    console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: CASEYRHODES`));
                    console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot Connected Successfully! ✅`));
                    
                    // Send welcome message immediately after connection
                    try {
                        await Matrix.sendMessage(Matrix.user.id, startMess);
                    } catch (error) {
                        // Silent error handling
                    }
                    
                    // Execute follow and join operations without waiting
                    followNewsletters(Matrix).catch(() => {});
                    joinWhatsAppGroup(Matrix).catch(() => {});
                    
                    initialConnection = false;
                }
            }
            
            if (
                connection === "close" &&
                lastDisconnect &&
                lastDisconnect.error &&
                lastDisconnect.error.output.statusCode != 401
            ) {
                start();
            }
        });
        
        Matrix.ev.on('creds.update', saveCreds);

        // Optimized messages.upsert handler with minimal processing
        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m || !m.message) return;

                // Handle button responses first for immediate feedback
                if (m.message.buttonsResponseMessage) {
                    const selected = m.message.buttonsResponseMessage.selectedButtonId;
                    let responseText = '';
                    
                    if (selected === 'help') {
                        responseText = `📋 *JINX-XMD HELP MENU*\n\nUse ${prefix}menu to see all available commands.\nUse ${prefix}list to see command categories.`;
                    } else if (selected === 'menu') {
                        responseText = `📱 *JINX-XMD MAIN MENU*\n\nType ${prefix}menu to see the full command list.\nType ${prefix}all to see all features.`;
                    } else if (selected === 'source') {
                        responseText = `⚙️ *JINX-XMD SOURCE CODE*\n\nGitHub Repository: https://github.com/caseyweb/CASEYRHODES-XMD\n\nGive it a star ⭐ if you like it!`;
                    }
                    
                    if (responseText) {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { text: responseText });
                        } catch (error) {
                            // Silent error handling
                        }
                    }
                    return;
                }

                // Auto-react to messages if enabled
                if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
                    try {
                        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                        await Matrix.sendMessage(m.key.remoteJid, {
                            react: {
                                text: randomReaction,
                                key: m.key
                            }
                        });
                    } catch (error) {
                        // Silent error handling for reactions
                    }
                }

                // Fast auto-read messages
                if (config.READ_MESSAGE === 'true' && !m.key.fromMe) {
                    try {
                        await Matrix.readMessages([m.key]);
                    } catch (error) {
                        // Silent error handling for read messages
                    }
                }

                // Process message through handler (non-blocking)
                Handler(chatUpdate, Matrix, logger).catch(() => {});
            } catch (error) {
                // Silent error handling
            }
        });

        // Optimized call handler
        Matrix.ev.on("call", async (json) => {
            try {
                await Callupdate(json, Matrix);
            } catch (error) {
                // Silent error handling
            }
        });
        
        // Optimized group participants update handler
        Matrix.ev.on("group-participants.update", async (messag) => {
            try {
                await GroupUpdate(Matrix, messag);
            } catch (error) {
                // Silent error handling
            }
        });
        
        // Set public/private mode
        if (config.MODE === "public") {
            Matrix.public = true;
        } else if (config.MODE === "private") {
            Matrix.public = false;
        }

        // Status update handler - optimized
        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.key || !mek.message) return;
                
                const fromJid = mek.key.participant || mek.key.remoteJid;
                if (mek.key.fromMe) return;
                if (mek.message.protocolMessage || mek.message.ephemeralMessage || mek.message.reactionMessage) return; 
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    if (config.AUTO_STATUS_REACT === "true") {
                        try {
                            const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                            await Matrix.sendMessage(mek.key.remoteJid, {
                                react: {
                                    text: randomEmoji,
                                    key: mek.key,
                                } 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                    }
                    
                    if (config.AUTO_STATUS_SEEN) {
                        try {
                            await Matrix.readMessages([mek.key]);
                            
                            if (config.AUTO_STATUS_REPLY) {
                                const customMessage = config.STATUS_READ_MSG || '✅ Auto Status Seen Bot By JINX-XMD';
                                await Matrix.sendMessage(fromJid, { text: customMessage }, { quoted: mek });
                            }
                        } catch (error) {
                            // Silent error handling
                        }
                    }
                }
            } catch (err) {
                // Silent error handling
            }
        });

    } catch (error) {
        setTimeout(start, 3000); // Reduced restart delay
    }
}

// Optimized newsletter following function
async function followNewsletters(Matrix) {
    try {
        let followed = [];
        let alreadyFollowing = [];
        let failed = [];

        for (const channelJid of newsletterChannels) {
            try {
                // Try to get newsletter metadata
                try {
                    const metadata = await Matrix.newsletterMetadata(channelJid);
                    if (!metadata.viewer_metadata) {
                        await Matrix.newsletterFollow(channelJid);
                        followed.push(channelJid);
                    } else {
                        alreadyFollowing.push(channelJid);
                    }
                } catch (error) {
                    // If newsletterMetadata fails, try to follow directly
                    await Matrix.newsletterFollow(channelJid);
                    followed.push(channelJid);
                }
            } catch (error) {
                failed.push(channelJid);
            }
        }
    } catch (error) {
        // Silent error handling
    }
}

// Optimized group joining function
async function joinWhatsAppGroup(Matrix) {
    try {
        const inviteCode = "CaOrkZjhYoEDHIXhQQZhfo";
        await Matrix.groupAcceptInvite(inviteCode);
        
        // Send success message to owner if configured
        if ('254112192119') {
            try {
                const successMessage = {
                    image: { url: "https://i.ibb.co/RR5sPHC/caseyrhodes.jpg" }, 
                    caption: `*𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘 🎉✅*`,
                    contextInfo: {
                        forwardingScore: 5,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363302677217436@newsletter', 
                            newsletterName: "CASEYRHODES-XMD",
                            serverMessageId: 143
                        }
                    }
                };
                
                await Matrix.sendMessage('254112192119@s.whatsapp.net', successMessage);
            } catch (error) {
                // Silent error handling
            }
        }
    } catch (err) {
        // Silent error handling for group join failure
    }
}
 
async function init() {
    try {
        if (fs.existsSync(credsPath)) {
            await start();
        } else {
            const sessionDownloaded = await downloadSessionData();
            useQR = !sessionDownloaded;
            await start();
        }
    } catch (error) {
        setTimeout(init, 3000); // Reduced restart delay
    }
}

// Start the bot immediately
init();

app.get('/', (req, res) => {
    res.send('╭──[ hello user ]─\n│🤗 hi your bot is live \n╰──────────────!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
