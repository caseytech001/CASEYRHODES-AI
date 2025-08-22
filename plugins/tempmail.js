import config from "../config.cjs";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

const tempMailCommand = async (m, Matrix) => {
    const prefixMatch = m.body.match(/^[\\/!#.]/);
    const prefix = prefixMatch ? prefixMatch[0] : '/';
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

    let selectedListId;
    const selectedButtonId = m?.message?.templateButtonReplyMessage?.selectedId;
    const interactiveResponseMessage = m?.message?.interactiveResponseMessage;

    if (interactiveResponseMessage) {
        const paramsJson = interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
        if (paramsJson) {
            try {
                const params = JSON.parse(paramsJson);
                selectedListId = params.id;
            } catch (error) {
                console.error("Error parsing paramsJson:", error);
            }
        }
    }

    const selectedId = selectedListId || selectedButtonId;

    if (cmd === 'tempmail') {
        try {
            await m.React("🕘");

            // Generate temporary email
            const genResponse = await fetch('https://tempmail.apinepdev.workers.dev/api/gen');
            if (!genResponse.ok) {
                throw new Error(`HTTP error! status: ${genResponse.status}`);
            }
            
            const genData = await genResponse.json();

            if (!genData.email) {
                m.reply('Failed to generate temporary email.');
                await m.React("❌");
                return;
            }

            const tempEmail = genData.email;

            const buttons = [
                {
                    "name": "cta_copy",
                    "buttonParamsJson": JSON.stringify({
                        "display_text": "Copy Email",
                        "id": "copy_email",
                        "copy_code": tempEmail
                    })
                },
                {
                    "name": "quick_reply",
                    "buttonParamsJson": JSON.stringify({
                        "display_text": "Check Inbox",
                        "id": `check_inbox_${tempEmail}`
                    })
                }
            ];

            const msg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: `Generated Temporary Email: ${tempEmail}`
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: "© Powered By 𝞢𝙏𝞖𝞘𝞦-𝞛𝘿"
                            }),
                            header: proto.Message.InteractiveMessage.Header.create({
                                title: "Temporary Email",
                                subtitle: "",
                                hasMediaAttachment: false
                            }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons
                            }),
                            contextInfo: {
                                mentionedJid: [m.sender],
                                forwardingScore: 9999,
                                isForwarded: true,
                            }
                        }),
                    },
                },
            }, {});

            await Matrix.relayMessage(msg.key.remoteJid, msg.message, {
                messageId: msg.key.id
            });
            await m.React("✅");

        } catch (error) {
            console.error("Error processing tempmail request:", error);
            m.reply('Error processing your request: ' + error.message);
            await m.React("❌");
        }
    } else if (selectedId && selectedId.startsWith('check_inbox_')) {
        // Extract email from the selectedId
        const email = selectedId.slice('check_inbox_'.length);

        try {
            await m.React("🕘");

            // Check inbox for the provided email
            const inboxResponse = await fetch(`https://tempmail.apinepdev.workers.dev/api/getmessage?email=${encodeURIComponent(email)}`);
            if (!inboxResponse.ok) {
                throw new Error(`HTTP error! status: ${inboxResponse.status}`);
            }
            
            const inboxData = await inboxResponse.json();

            let inboxMessages = '';
            let buttons = [];

            if (inboxData.messages && inboxData.messages.length > 0) {
                inboxMessages = 'Inbox Messages:\n\n';
                inboxData.messages.forEach((msg, index) => {
                    try {
                        const message = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                        inboxMessages += `${index + 1}. From: ${msg.sender}\nSubject: ${msg.subject}\nDate: ${new Date(message.date || msg.date).toLocaleString()}\nMessage: ${message.body || message.textBody || 'No content'}\n\n`;

                        const emailBody = message.textBody || message.body || '';
                        const otpMatch = emailBody.match(/\b\d{4,6}\b/);
                        if (otpMatch) {
                            buttons.push({
                                "name": "cta_copy",
                                "buttonParamsJson": JSON.stringify({
                                    "display_text": "Copy OTP",
                                    "id": "copy_otp",
                                    "copy_code": otpMatch[0]
                                })
                            });
                        }
                    } catch (parseError) {
                        console.error("Error parsing message:", parseError);
                        inboxMessages += `${index + 1}. From: ${msg.sender}\nSubject: ${msg.subject}\nDate: Unknown\nMessage: [Unable to parse message content]\n\n`;
                    }
                });
            } else {
                inboxMessages = 'No messages found in the inbox.';
            }

            buttons.push({
                "name": "quick_reply",
                "buttonParamsJson": JSON.stringify({
                    "display_text": "Check Inbox Again",
                    "id": `check_inbox_${email}`
                })
            });

            const updatedMsg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: inboxMessages
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: "© Powered By 🇸​​🇮​​🇱​​🇻​​🇦​ ​🇪​​🇹​​🇭​​🇮​​🇽​-𝞛𝘿"
                            }),
                            header: proto.Message.InteractiveMessage.Header.create({
                                title: "Inbox Results",
                                subtitle: `For: ${email}`,
                                hasMediaAttachment: false
                            }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons
                            }),
                            contextInfo: {
                                mentionedJid: [m.sender],
                                forwardingScore: 9999,
                                isForwarded: true,
                            }
                        }),
                    },
                },
            }, {});

            await Matrix.relayMessage(updatedMsg.key.remoteJid, updatedMsg.message, {
                messageId: updatedMsg.key.id
            });
            await m.React("✅");

        } catch (error) {
            console.error("Error checking inbox:", error);
            m.reply('Error checking inbox: ' + error.message);
            await m.React("❌");
        }
    }
};

export default tempMailCommand;
