import Tesseract from 'tesseract.js';
import translate from 'translate-google-api';
import { writeFile } from 'fs/promises';
import config from '../config.cjs';

const translateCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body?.slice(prefix.length + cmd.length).trim() || '';

  const validCommands = ['translate', 'trt'];

  if (validCommands.includes(cmd)) {
    const targetLang = args.split(' ')[0];
    const text = args.slice(targetLang.length).trim();

    try {
      if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
        
        // Handle quoted image message
        if (quotedMsg.imageMessage) {
          try {
            const stream = await sock.downloadMediaMessage(quotedMsg);
            if (!stream) throw new Error('Failed to download media.');

            const filePath = `./${Date.now()}.png`;
            await writeFile(filePath, stream);
            
            const { data: { text: extractedText } } = await Tesseract.recognize(filePath, 'eng', {
              logger: m => console.log(m)
            });

            const result = await translate(extractedText, { to: targetLang });
            const translatedText = result[0];

            const responseMessage = `${targetLang}:\n\n${translatedText}`;
            await sock.sendMessage(m.key.remoteJid, { text: responseMessage }, { quoted: m });
          } catch (error) {
            console.error("Error extracting and translating text from image:", error);
            await sock.sendMessage(m.key.remoteJid, { text: 'Error extracting and translating text from image.' }, { quoted: m });
          }
        } 
        // Handle quoted text message
        else if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
          try {
            const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
            const result = await translate(quotedText, { to: targetLang });
            const translatedText = result[0];

            const responseMessage = `${targetLang}:\n\n${translatedText}`;
            await sock.sendMessage(m.key.remoteJid, { text: responseMessage }, { quoted: m });
          } catch (error) {
            console.error("Error translating quoted text:", error);
            await sock.sendMessage(m.key.remoteJid, { text: 'Error translating quoted text.' }, { quoted: m });
          }
        }
      } else if (text && targetLang) {
        // Handle direct text translation
        const result = await translate(text, { to: targetLang });
        const translatedText = result[0];

        const responseMessage = `${targetLang}:\n\n${translatedText}`;
        await sock.sendMessage(m.key.remoteJid, { text: responseMessage }, { quoted: m });
      } else {
        // Show usage instructions
        const responseMessage = "Usage: /translate <target_lang> <text>\nExample: /translate en कैसे हो भाई\nOr reply to an image/text message with /translate <target_lang>";
        await sock.sendMessage(m.key.remoteJid, { text: responseMessage }, { quoted: m });
      }
    } catch (error) {
      console.error("Error in translate command:", error);
      await sock.sendMessage(m.key.remoteJid, { text: 'An error occurred while processing your request.' }, { quoted: m });
    }
  }
};

export default translateCommand;
