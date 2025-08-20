import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, proto } = pkg;
import config from '../config.cjs';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const chatHistoryFile = path.resolve(__dirname, '../mistral_history.json');

const mistralSystemPrompt = "you are a good assistant.";

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
    if (chatHistory[sender].length > 20) {
        chatHistory[sender].shift();
    }
    await writeChatHistoryToFile(chatHistory);
}

async function deleteChatHistory(chatHistory, userId) {
    delete chatHistory[userId];
    await writeChatHistoryToFile(chatHistory);
}

const mistral = async (m, Matrix) => {
    const chatHistory = await readChatHistoryFromFile();
    const text = m.body.toLowerCase();

    if (text === "/forget") {
        await deleteChatHistory(chatHistory, m.sender);
        await Matrix.sendMessage(m.from, { text: 'Conversation deleted successfully' }, { quoted: m });
        return;
    }

    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const prompt = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['ai', 'gpt', 'mistral'];

    if (validCommands.includes(cmd)) {
        if (!prompt) {
            await Matrix.sendMessage(m.from, { text: 'Please give me a prompt' }, { quoted: m });
            return;
        }

        try {
            const senderChatHistory = chatHistory[m.sender] || [];
            const messages = [
                { role: "system", content: mistralSystemPrompt },
                ...senderChatHistory,
                { role: "user", content: prompt }
            ];

            await m.React("⏳");

            const response = await fetch('https://matrixcoder.tech/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: "text-generation",
                    model: "hf/meta-llama/meta-llama-3-8b-instruct",
                    messages: messages
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();

            await updateChatHistory(chatHistory, m.sender, { role: "user", content: prompt });
            await updateChatHistory(chatHistory, m.sender, { role: "assistant", content: responseData.result.response });

            const answer = responseData.result.response;

            const codeMatch = answer.match(/```([\s\S]*?)```/);

            if (codeMatch) {
                const code = codeMatch[1];
                const codeLanguage = code.split('\n')[0].trim() || 'text';
                const codeContent = code.includes('\n') ? code.slice(code.indexOf('\n') + 1) : code;
                
                // Create the interactive message with copy button
                const interactiveMsg = {
                    body: {
                        text: answer
                    },
                    footer: {
                        text: "> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ"
                    },
                    header: {
                        title: "AI Response",
                        hasMediaAttachment: false
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Copy Code",
                                    id: "copy_code_" + Date.now(),
                                    copy_code: codeContent
                                })
                            }
                        ]
                    }
                };

                // Send the message with the copy button
                await Matrix.sendMessage(m.from, {
                    interactive: interactiveMsg
                }, { quoted: m });
            } else {
                await Matrix.sendMessage(m.from, { text: answer }, { quoted: m });
            }

            await m.React("✅");
        } catch (err) {
            await Matrix.sendMessage(m.from, { text: "Something went wrong" }, { quoted: m });
            console.error('Error: ', err);
            await m.React("❌");
        }
    }
};

export default mistral;
