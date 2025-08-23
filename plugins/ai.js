import { promises as fs } from 'fs';
import path from 'path';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import config from '../config.cjs';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const chatHistoryFile = path.resolve(__dirname, '../mistral_history.json');

const mistralSystemPrompt = "you are a good assistant.";

// Local AI response generator - no external APIs!
function generateLocalAIResponse(prompt, chatHistory = []) {
    const responses = {
        greeting: [
            "Hello! How can I help you today?",
            "Hi there! What can I do for you?",
            "Hey! Nice to hear from you. How can I assist?",
            "Greetings! I'm here to help. What do you need?"
        ],
        help: [
            "I'm here to assist you with various tasks. You can ask me questions, get information, or just chat!",
            "I can help answer questions, provide information, and have conversations. What would you like to know?",
            "Feel free to ask me anything! I'll do my best to help you."
        ],
        time: `The current time is: ${new Date().toLocaleTimeString()}`,
        date: `Today's date is: ${new Date().toLocaleDateString()}`,
        joke: [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "What do you call a fake noodle? An impasta!",
            "Why don't eggs tell jokes? They'd crack each other up!"
        ],
        weather: "I'm a local AI, so I can't access real-time weather data. But I hope it's nice where you are!",
        default: [
            "That's an interesting question!",
            "I understand what you're asking.",
            "Let me think about that...",
            "That's a good point you raised.",
            "I appreciate your question!"
        ]
    };

    // Convert prompt to lowercase for easier matching
    const lowerPrompt = prompt.toLowerCase();

    // Simple pattern matching
    if (/(hello|hi|hey|greetings|good morning|good afternoon|good evening)/i.test(lowerPrompt)) {
        return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    }
    else if (/(help|support|assist|what can you do)/i.test(lowerPrompt)) {
        return responses.help[Math.floor(Math.random() * responses.help.length)];
    }
    else if (/(time|what time|current time)/i.test(lowerPrompt)) {
        return responses.time;
    }
    else if (/(date|today|what date|current date)/i.test(lowerPrompt)) {
        return responses.date;
    }
    else if (/(joke|funny|make me laugh)/i.test(lowerPrompt)) {
        return responses.joke[Math.floor(Math.random() * responses.joke.length)];
    }
    else if (/(weather|temperature|forecast)/i.test(lowerPrompt)) {
        return responses.weather;
    }
    else if (/(who are you|what are you|your name)/i.test(lowerPrompt)) {
        return "I'm a local AI assistant running directly on this server! No external APIs needed!";
    }
    else if (/(thank|thanks|appreciate)/i.test(lowerPrompt)) {
        return "You're welcome! I'm happy to help!";
    }
    else {
        // For other queries, generate a contextual response
        const defaultResponse = responses.default[Math.floor(Math.random() * responses.default.length)];
        return `${defaultResponse} You asked: "${prompt}". This is a local response without any external APIs!`;
    }
}

async function readChatHistoryFromFile() {
    try {
        const data = await fs.readFile(chatHistoryFile, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

async function writeChatHistoryToFile(chatHistory) {
    try {
        await fs.writeFile(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (err) {
        console.error('Error writing chat history to file:', err);
    }
}

async function updateChatHistory(chatHistory, sender, message) {
    if (!chatHistory[sender]) {
        chatHistory[sender] = [];
    }
    chatHistory[sender].push(message);
    if (chatHistory[sender].length > 10) { // Reduced history size
        chatHistory[sender].shift();
    }
    await writeChatHistoryToFile(chatHistory);
}

async function deleteChatHistory(chatHistory, userId) {
    delete chatHistory[userId];
    await writeChatHistoryToFile(chatHistory);
}

// Function to send interactive buttons
async function sendInteractiveButtons(Matrix, from, text, buttons, quoted = null) {
    const buttonMessages = [];
    
    buttons.forEach((button) => {
        buttonMessages.push({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: button.text,
                id: button.id
            })
        });
    });
    
    const msg = generateWAMessageFromContent(from, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({
                        text: text
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.create({
                        text: "> 🔥 100% Local - No External APIs!"
                    }),
                    header: proto.Message.InteractiveMessage.Header.create({
                        title: "",
                        subtitle: "",
                        hasMediaAttachment: false
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: buttonMessages
                    })
                })
            }
        }
    }, {});
    
    await Matrix.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id
    });
}

const mistral = async (m, Matrix) => {
    const chatHistory = await readChatHistoryFromFile();
    const text = m.body.toLowerCase();

    if (text === "/forget") {
        await deleteChatHistory(chatHistory, m.sender);
        await Matrix.sendMessage(m.from, { text: 'Conversation history deleted successfully! 🗑️' }, { quoted: m });
        return;
    }

    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const prompt = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['ai', 'gpt', 'mistral', 'bot'];

    if (validCommands.includes(cmd)) {
        if (!prompt) {
            // Send interactive buttons when no prompt is provided
            const buttons = [
                { id: 'time_button', text: '⏰ Current Time' },
                { id: 'date_button', text: '📅 Today\'s Date' },
                { id: 'joke_button', text: '😂 Tell a Joke' },
                { id: 'help_button', text: '❓ What can you do?' }
            ];
            
            await sendInteractiveButtons(
                Matrix, 
                m.from, 
                "Hello! I'm your local AI assistant. What would you like to know?",
                buttons,
                m
            );
            return;
        }

        try {
            const senderChatHistory = chatHistory[m.sender] || [];
            
            // Show typing indicator
            await Matrix.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

            // Generate response locally - NO EXTERNAL API!
            const answer = generateLocalAIResponse(prompt, senderChatHistory);

            // Update chat history
            await updateChatHistory(chatHistory, m.sender, { role: "user", content: prompt });
            await updateChatHistory(chatHistory, m.sender, { role: "assistant", content: answer });

            // Check if response contains code blocks
            const codeMatch = answer.match(/```([\s\S]*?)```/);

            if (codeMatch) {
                const code = codeMatch[1];
                
                let msg = generateWAMessageFromContent(m.from, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({
                                    text: answer
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({
                                    text: "> 🔥 100% Local - No External APIs!"
                                }),
                                header: proto.Message.InteractiveMessage.Header.create({
                                    title: "",
                                    subtitle: "",
                                    hasMediaAttachment: false
                                }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [
                                        {
                                            name: "cta_copy",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "Copy Text",
                                                id: "copy_text",
                                                copy_code: answer.substring(0, 1000) // Limit copy length
                                            })
                                        }
                                    ]
                                })
                            })
                        }
                    }
                }, {});

                await Matrix.relayMessage(msg.key.remoteJid, msg.message, {
                    messageId: msg.key.id
                });
            } else {
                // Add interactive buttons to regular responses
                const buttons = [
                    { id: 'time_button', text: '⏰ Time' },
                    { id: 'date_button', text: '📅 Date' },
                    { id: 'joke_button', text: '😂 Joke' },
                    { id: 'help_button', text: '❓ Help' }
                ];
                
                await sendInteractiveButtons(Matrix, m.from, answer, buttons, m);
            }

            // Success reaction
            await Matrix.sendMessage(m.from, { react: { text: '✅', key: m.key } });

        } catch (err) {
            await Matrix.sendMessage(m.from, { text: "Something went wrong. Error: " + err.message }, { quoted: m });
            console.error('Error: ', err);
            await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        }
    }
    
    // Handle button responses
    if (m.message?.interactiveMessage?.nativeFlowResponseMessage) {
        const buttonId = m.message.interactiveMessage.nativeFlowResponseMessage.params?.id;
        
        let response = "";
        switch(buttonId) {
            case 'time_button':
                response = `The current time is: ${new Date().toLocaleTimeString()}`;
                break;
            case 'date_button':
                response = `Today's date is: ${new Date().toLocaleDateString()}`;
                break;
            case 'joke_button':
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "Why did the scarecrow win an award? He was outstanding in his field!",
                    "What do you call a fake noodle? An impasta!",
                    "Why don't eggs tell jokes? They'd crack each other up!"
                ];
                response = jokes[Math.floor(Math.random() * jokes.length)];
                break;
            case 'help_button':
                response = "I can help you with various tasks like telling time, date, jokes, and answering questions. I'm a local AI running directly on this server!";
                break;
            default:
                response = "I'm not sure what you're asking. How can I help you?";
        }
        
        // Update chat history
        await updateChatHistory(chatHistory, m.sender, { role: "user", content: `Button: ${buttonId}` });
        await updateChatHistory(chatHistory, m.sender, { role: "assistant", content: response });
        
        // Send response with buttons again
        const buttons = [
            { id: 'time_button', text: '⏰ Time' },
            { id: 'date_button', text: '📅 Date' },
            { id: 'joke_button', text: '😂 Joke' },
            { id: 'help_button', text: '❓ Help' }
        ];
        
        await sendInteractiveButtons(Matrix, m.from, response, buttons, m);
    }
};

export default mistral;
