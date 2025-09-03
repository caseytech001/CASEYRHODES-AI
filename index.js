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
const MAX_RETRY_ATTEMPTS = 5;
let retryCount = 0;

// Enhanced logging with levels
const MAIN_LOGGER = pino({ 
    level: process.env.LOG_LEVEL || 'error',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard'
        }
    }
});
const logger = MAIN_LOGGER.child({ module: 'main' });

const msgRetryCounterCache = new NodeCache({
    stdTTL: 300, // 5 minutes
    checkperiod: 60 // 1 minute
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

// Ensure session directory exists
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// Enhanced error handling wrapper
async function withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

async function downloadSessionData() {
    try {
        if (!config.SESSION_ID) {
            logger.debug('No SESSION_ID configured');
            return false;
        }

        const sessdata = config.SESSION_ID.split("Caseyrhodes~")[1];
        if (!sessdata || !sessdata.includes("#")) {
            logger.warn('Invalid SESSION_ID format');
            return false;
        }

        const [fileID, decryptKey] = sessdata.split("#");
        
        return await withRetry(async () => {
            const file = File.fromURL(`https://mega.nz/file/${fileID}#${decryptKey}`);
            
            const data = await new Promise((resolve, reject) => {
                file.download((err, data) => {
                    if (err) {
                        logger.error('Mega download failed', err);
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });

            await fs.promises.writeFile(credsPath, data);
            logger.info('Session data downloaded successfully');
            return true;
        });
    } catch (error) {
        logger.error('Failed to download session data', error);
        return false;
    }
}

async function start() {
    try {
        if (retryCount > MAX_RETRY_ATTEMPTS) {
            logger.error('Maximum retry attempts reached. Please check your configuration.');
            return;
        }

        retryCount++;
        logger.info(`Starting connection attempt ${retryCount}`);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'error' }),
            printQRInTerminal: useQR,
            browser: ["JINX-MD", "safari", "3.3"],
            auth: state,
            msgRetryCounterCache,
            getMessage: async () => ({}),
            markOnlineOnConnect: false, // Save bandwidth
            syncFullHistory: false, // Don't sync old messages
            transactionOpts: {
                maxCommitRetries: 3,
                delayBetweenTriesMs: 1000
            }
        });

        // Connection update handler
        Matrix.ev.on('connection.update', async (update) => {
            try {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr && !useQR) {
                    useQR = true;
                    Matrix.opts.printQRInTerminal = true;
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode !== DisconnectReason.loggedOut) {
                        const delay = Math.min(3000 * retryCount, 30000); // Exponential backoff with cap
                        logger.warn(`Connection closed. Reconnecting in ${delay}ms...`);
                        setTimeout(() => {
                            retryCount = 0; // Reset retry count for new connection attempt
                            start();
                        }, delay);
                    } else {
                        logger.error('Logged out. Please scan QR code again.');
                        useQR = true;
                    }
                } else if (connection === 'open') {
                    retryCount = 0; // Reset retry count on successful connection
                    logger.info('Connected successfully');
                    
                    if (initialConnection) {
                        await sendWelcomeMessage(Matrix);
                        await followNewsletters(Matrix);
                        await joinWhatsAppGroup(Matrix);
                        initialConnection = false;
                    }
                }
            } catch (error) {
                logger.error('Connection update error', error);
            }
        });

        Matrix.ev.on('creds.update', saveCreds);

        // Consolidated messages.upsert handler
        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m?.message) return;

                // Handle button responses
                if (m.message.buttonsResponseMessage) {
                    await handleButtonResponse(m, Matrix);
                    return;
                }

                // Auto-react to messages
                if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
                    await autoReactToMessage(m, Matrix);
                }

                // Auto-read messages
                if (config.READ_MESSAGE === 'true' && !m.key.fromMe) {
                    await Matrix.readMessages([m.key]).catch(() => {});
                }

                // Handle status updates
                if (m.key?.remoteJid === 'status@broadcast') {
                    await handleStatusUpdate(m, Matrix);
                }

                // Process message with handler
                await Handler(chatUpdate, Matrix, logger);

            } catch (error) {
                logger.error('Message processing error', error);
            }
        });

        Matrix.ev.on("call", async (json) => {
            try {
                await Callupdate(json, Matrix);
            } catch (error) {
                logger.error('Call update error', error);
            }
        });
        
        Matrix.ev.on("group-participants.update", async (messag) => {
            try {
                await GroupUpdate(Matrix, messag);
            } catch (error) {
                logger.error('Group update error', error);
            }
        });
        
        // Set public/private mode
        Matrix.public = config.MODE !== "private";

    } catch (error) {
        logger.error('Start function error', error);
        const delay = Math.min(5000 * retryCount, 30000);
        setTimeout(start, delay);
    }
}

async function sendWelcomeMessage(Matrix) {
    try {
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

        await Matrix.sendMessage(Matrix.user.id, startMess);
    } catch (error) {
        logger.warn('Failed to send welcome message', error);
    }
}

async function handleButtonResponse(m, Matrix) {
    const selected = m.message.buttonsResponseMessage.selectedButtonId;
    const responses = {
        'help': `📋 *JINX-XMD HELP MENU*\n\nUse ${prefix}menu to see all available commands.\nUse ${prefix}list to see command categories.`,
        'menu': `📱 *JINX-XMD MAIN MENU*\n\nType ${prefix}menu to see the full command list.\nType ${prefix}all to see all features.`,
        'source': `⚙️ *JINX-XMD SOURCE CODE*\n\nGitHub Repository: https://github.com/caseyweb/CASEYRHODES-XMD\n\nGive it a star ⭐ if you like it!`
    };

    if (responses[selected]) {
        await Matrix.sendMessage(m.key.remoteJid, { text: responses[selected] });
    }
}

async function autoReactToMessage(m, Matrix) {
    try {
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
        
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        await Matrix.sendMessage(m.key.remoteJid, {
            react: {
                text: randomReaction,
                key: m.key
            }
        });
    } catch (error) {
        logger.debug('Auto-react failed', error);
    }
}

async function handleStatusUpdate(m, Matrix) {
    try {
        if (config.AUTO_STATUS_REACT === "true") {
            const statusEmojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👻', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '♻️', '🎉', '💜', '💙', '✨', '🖤', '💚'];
            const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
            
            await Matrix.sendMessage(m.key.remoteJid, {
                react: {
                    text: randomEmoji,
                    key: m.key,
                } 
            });
        }

        if (config.AUTO_STATUS_SEEN === "true") {
            await Matrix.readMessages([m.key]);
            
            if (config.AUTO_STATUS_REPLY === "true") {
                const customMessage = config.STATUS_READ_MSG || '✅ Auto Status Seen Bot By JINX-XMD';
                const fromJid = m.key.participant || m.key.remoteJid;
                await Matrix.sendMessage(fromJid, { text: customMessage });
            }
        }
    } catch (error) {
        logger.debug('Status update handling failed', error);
    }
}

async function followNewsletters(Matrix) {
    try {
        const newsletterChannels = [
            "120363299029326322@newsletter",
            "120363402973786789@newsletter",
            "120363339980514201@newsletter",
        ];
        
        for (const channelJid of newsletterChannels) {
            try {
                await Matrix.newsletterFollow(channelJid);
                logger.info(`Followed newsletter: ${channelJid}`);
            } catch (error) {
                logger.warn(`Failed to follow newsletter: ${channelJid}`, error);
            }
        }
    } catch (error) {
        logger.error('Newsletter following failed', error);
    }
}

async function joinWhatsAppGroup(Matrix) {
    try {
        const inviteCode = "CaOrkZjhYoEDHIXhQQZhfo";
        await Matrix.groupAcceptInvite(inviteCode);
        logger.info('Successfully joined group');
        
        // Send success message to owner
        const ownerJid = '254112192119@s.whatsapp.net';
        try {
            const successMessage = {
                text: `✅ Successfully joined group with invite code: ${inviteCode}`
            };
            await Matrix.sendMessage(ownerJid, successMessage);
        } catch (error) {
            logger.warn('Failed to send group join success message', error);
        }
    } catch (error) {
        logger.error('Failed to join group', error);
        
        // Send error message to owner
        const ownerJid = '254112192119@s.whatsapp.net';
        try {
            await Matrix.sendMessage(ownerJid, {
                text: `❌ Failed to join group with invite code: ${error.message}`
            });
        } catch (err) {
            logger.warn('Failed to send group join error message', err);
        }
    }
}

async function init() {
    try {
        if (fs.existsSync(credsPath)) {
            await start();
        } else {
            const sessionDownloaded = await downloadSessionData();
            if (sessionDownloaded) {
                await start();
            } else {
                useQR = true;
                await start();
            }
        }
    } catch (error) {
        logger.error('Initialization failed', error);
        setTimeout(init, 5000);
    }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Initialize
init();

// Express server
app.get('/', (req, res) => {
    res.send('╭──[ hello user ]─\n│🤗 hi your bot is live \n╰──────────────!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
