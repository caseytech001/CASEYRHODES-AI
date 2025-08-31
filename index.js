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

// Function to format uptime
function runtime(seconds) {
    seconds = Math.floor(seconds);
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result.trim();
}

async function downloadSessionData() {
    try {
        if (!config.SESSION_ID) {
            return false;
        }

        const sessdata = config.SESSION_ID.split("Caseyrhodes~")[1];

        if (!sessdata || !sessdata.includes("#")) {
            return false;
        }

        const [fileID, decryptKey] = sessdata.split("#");

        try {
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
    } catch (error) {
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        
        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: useQR,
            browser: ["JINX-MD", "safari", "3.3"],
            auth: state,
            msgRetryCounterCache,
            getMessage: async (key) => {
                return {};
            }
        });

        // AUTO_BIO functionality
        let bioInterval;
        if (config.AUTO_BIO === 'true') {
            let lastBioUpdate = 0;
            const bioUpdateInterval = 60000; // Update every 1 minute
            
            // Function to update bio
            async function updateBio() {
                try {
                    const currentTime = new Date() * 1;
                    if (currentTime - lastBioUpdate > bioUpdateInterval) {
                        const uptime = runtime(process.uptime());
                        const bioText = config.BIO_TEXT || `𝐈𝐌 𝐋𝐎𝐑𝐃 𝐀𝐍𝐈𝐌𝐄 𝐂𝐋𝐈𝐄𝐍𝐓 | Uptime: ${uptime}`;
                        
                        await Matrix.updateProfileStatus(bioText);
                        lastBioUpdate = currentTime;
                        
                        console.log(chalk.green(`[✅] Bio updated: ${bioText}`));
                    }
                } catch (error) {
                    console.error(chalk.red(`[❌] Error updating bio: ${error.message}`));
                }
            }
            
            // Update bio immediately and then set interval
            updateBio();
            bioInterval = setInterval(updateBio, bioUpdateInterval);
        }

        Matrix.ev.on('connection.update', async (update) => {
            try {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    // Clear bio interval on disconnect
                    if (bioInterval) {
                        clearInterval(bioInterval);
                    }
                    
                    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                        setTimeout(start, 3000);
                    }
                } else if (connection === 'open') {
                    if (initialConnection) {
                        
                        // Send welcome message after successful connection with buttons
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

                        try {
                            await Matrix.sendMessage(Matrix.user.id, startMess);
                        } catch (error) {
                            // Silent error handling
                        }
                        
                        // Follow newsletters after successful connection
                        await followNewsletters(Matrix);
                        
                        // Join WhatsApp group after successful connection
                        await joinWhatsAppGroup(Matrix);
                        
                        initialConnection = false;
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        });
        
        Matrix.ev.on('creds.update', saveCreds);

        // Enhanced messages.upsert handler
        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m || !m.message) return;

                // Handle button responses
                if (m.message.buttonsResponseMessage) {
                    const selected = m.message.buttonsResponseMessage.selectedButtonId;
                    if (selected === 'help') {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { 
                                text: `📋 *JINX-XMD HELP MENU*\n\nUse ${prefix}menu to see all available commands.\nUse ${prefix}list to see command categories.` 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                        return;
                    } else if (selected === 'menu') {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { 
                                text: `📱 *JINX-XMD MAIN MENU*\n\nType ${prefix}menu to see the full command list.\nType ${prefix}all to see all features.` 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                        return;
                    } else if (selected === 'source') {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { 
                                text: `⚙️ *JINX-XMD SOURCE CODE*\n\nGitHub Repository: https://github.com/caseyweb/CASEYRHODES-XMD\n\nGive it a star ⭐ if you like it!` 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                        return;
                    }
                }

                // Auto-react to messages if enabled
                if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
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

                // Existing handlers - silent mode
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

        // Status update handler
        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.key || !mek.message) return;
                
                const fromJid = mek.key.participant || mek.key.remoteJid;
                if (mek.key.fromMe) return;
                if (mek.message.protocolMessage || mek.message.ephemeralMessage || mek.message.reactionMessage) return; 
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true") {
                    try {
                        const ravlike = await Matrix.decodeJid(Matrix.user.id);
                        const statusEmojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👻', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '♻️', '🎉', '💜', '💙', '✨', '🖤', '💚'];
                        const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                        await Matrix.sendMessage(mek.key.remoteJid, {
                            react: {
                                text: randomEmoji,
                                key: mek.key,
                            } 
                        }, { statusJidList: [mek.key.participant, ravlike] });
                    } catch (error) {
                        // Silent error handling
                    }
                }
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
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
            } catch (err) {
                // Silent error handling
            }
        });

    } catch (error) {
        setTimeout(start, 5000); // Restart after error with delay
    }
}

// Newsletter following function
async function followNewsletters(Matrix) {
    try {
        const newsletterChannels = [
            "120363299029326322@newsletter",
            "120363401297349965@newsletter",
            "120363339980514201@newsletter",
        ];
        
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
                
                // Send error message to owner if configured
                if ('254112192119') {
                    try {
                        await Matrix.sendMessage('254112192119@s.whatsapp.net', {
                            text: `Failed to follow ${channelJid}`,
                        });
                    } catch (error) {
                        // Silent error handling
                    }
                }
            }
        }
    } catch (error) {
        // Silent error handling
    }
}

// Group joining function
async function joinWhatsAppGroup(Matrix) {
    try {
        const inviteCode = "CaOrkZjhYoEDHIXhQQZhfo";
        await Matrix.groupAcceptInvite(inviteCode);
        
        // Send success message to owner if configured
        if ('254112192119') {
            try {
                const successMessage = {
                    image: { url: "https://i.ibb.co/RR5sPHC/caseyrhodes.jpg" }, 
                    caption: `*Hello there CASEYRHODES AI User! 👋* 

> Simple, Straightforward, But Loaded With Features 🎊. Meet JINX-XMD WhatsApp Bot.

*Thanks for using CASEYRHODES AI🚩* 
Join WhatsApp Channel: ⤵️  
> https://whatsapp.com/channel/0029VakUEfb4o7qVdkwPk83E

- *YOUR PREFIX:* = ${prefix}
Don't forget to give a star to the repo ⬇️  
https://github.com/caseyweb/JINX-MD

> © Powered BY CASEYRHODES TECH 🍀 🖤`,
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
        // Send error message to owner if configured
        if ('254112192119') {
            try {
                await Matrix.sendMessage('254112192119@s.whatsapp.net', {
                    text: `Failed to join group with invite code`,
                });
            } catch (error) {
                // Silent error handling
            }
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
        setTimeout(init, 5000);
    }
}

init();

app.get('/', (req, res) => {
    res.send('╭──[ hello user ]─\n│🤗 hi your bot is live \n╰──────────────!');
});

app.listen(PORT, () => {
    // Silent server start
});
