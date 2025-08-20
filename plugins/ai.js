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
    const text = m.body ? m.body.toLowerCase() : '';

    if (text === "/forget") {
        await deleteChatHistory(chatHistory, m.sender);
        await Matrix.sendMessage(m.from, { text: 'Conversation deleted successfully' }, { quoted: m });
        return;
    }

    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const prompt = body.slice(prefix.length + cmd.length).trim();

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

            if (m.React) await m.React("⏳");

            // Fixed API endpoint and request format
            const response = await fetch('https://api.giftedtech.co.ke/api/ai/groq-beta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': 'gifted'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: "llama3-70b-8192" // Specify a valid model
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            
            // Handle different response structures
            let answer;
            if (responseData.result && responseData.result.response) {
                answer = responseData.result.response;
            } else if (responseData.response) {
                answer = responseData.response;
            } else if (responseData.choices && responseData.choices.length > 0) {
                answer = responseData.choices[0].message.content;
            } else {
                throw new Error("Unexpected API response format");
            }

            await updateChatHistory(chatHistory, m.sender, { role: "user", content: prompt });
            await updateChatHistory(chatHistory, m.sender, { role: "assistant", content: answer });

            const codeMatch = answer.match(/```([\s\S]*?)```/);

            if (codeMatch) {
                const code = codeMatch[1];
                const codeLanguage = code.split('\n')[0].trim() || 'text';
                const codeContent = code.includes('\n') ? code.slice(code.indexOf('\n') + 1) : code;
                
                // For WhatsApp, we need to format code properly
                const formattedAnswer = answer.replace(/```[\s\S]*?```/g, '```[code]```');
                
                // Send the message with code indicator
                await Matrix.sendMessage(m.from, { 
                    text: formattedAnswer + `\n\n*Code detected. Check your console for the full code.*`
                }, { quoted: m });
                
                // Send the actual code in a separate message
                await Matrix.sendMessage(m.from, { 
                    text: `*Code:*\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\``
                }, { quoted: m });
            } else {
                // Add copy button to regular responses
                const messageOptions = {
                    text: answer,
                    footer: "Click the button below to copy this text",
                    buttons: [
                        { buttonId: `${prefix}copy`, buttonText: { displayText: "📋 Copy Text" }, type: 1 }
                    ],
                    headerType: 1
                };
                
                await Matrix.sendMessage(m.from, messageOptions, { quoted: m });
            }

            if (m.React) await m.React("✅");
        } catch (err) {
            await Matrix.sendMessage(m.from, { text: "Something went wrong: " + err.message }, { quoted: m });
            console.error('Error: ', err);
            if (m.React) await m.React("❌");
        }
    }
    
    // Handle copy button interaction
    if (m.body && m.body.startsWith(`${prefix}copy`)) {
        try {
            // Get the quoted message to copy
            const quotedMsg = m.quoted ? m.quoted : m;
            const textToCopy = quotedMsg.text;
            
            // Create a message with the text that can be easily copied
            await Matrix.sendMessage(m.from, { 
                text: `📋 *Text to copy:*\n\n${textToCopy}\n\n_You can now select and copy this text_`
            }, { quoted: m });
            
            // Send a confirmation message
            await Matrix.sendMessage(m.from, { 
                text: "✅ Text ready for copying!"
            });
        } catch (err) {
            console.error('Error handling copy request:', err);
            await Matrix.sendMessage(m.from, { 
                text: "❌ Failed to prepare text for copying"
            }, { quoted: m });
        }
    }
};

export default mistral;
