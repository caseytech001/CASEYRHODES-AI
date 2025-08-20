import axios from "axios";
import config from '../config.cjs';
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
    j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
    s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
    A: "ᴀ", B: "ʙ", C: "ᴄ", D: "ᴅ", E: "ᴇ", F: "ғ", G: "ɢ", H: "ʜ", I: "ɪ",
    J: "ᴊ", K: "ᴋ", L: "ʟ", M: "ᴍ", N: "ɴ", O: "ᴏ", P: "ᴘ", Q: "ǫ", R: "ʀ",
    S: "s", T: "ᴛ", U: "ᴜ", V: "ᴠ", W: "ᴡ", X: "x", Y: "ʏ", Z: "ᴢ"
  };
  
  const formattedText = isUpperCase ? text.toUpperCase() : text;
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const gpt = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const body = m.body || "";
    
    // Check if message starts with prefix
    if (!body.startsWith(prefix)) return;
    
    const cmd = body.slice(prefix.length).split(' ')[0].toLowerCase();
    const prompt = body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['ai', 'gpt', 'g'];

    if (validCommands.includes(cmd)) {
      if (!prompt) {
        const buttonMessage = {
          text: `*${toFancyFont("Please provide a prompt after the command")}*`,
          footer: "Powered by Matrix",
          buttons: [
            { 
              buttonId: `${prefix}help`, 
              buttonText: { displayText: `${toFancyFont("Help")}` }, 
              type: 1 
            }
          ],
          headerType: 1,
          viewOnce: true
        };
        
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
        return;
      }

      try {
        // React with waiting emoji
        if (m.React) await m.React("⏳");

        const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(prompt)}`;
        const response = await axios.get(apiUrl, {
          timeout: 30000 // 30 second timeout
        });
        
        const data = response.data;

        if (data.status === 200 && data.success) {
          const answer = data.result;
          
          // If answer is too long, split it into multiple messages
          if (answer.length > 4000) {
            const parts = [];
            for (let i = 0; i < answer.length; i += 4000) {
              parts.push(answer.substring(i, i + 4000));
            }
            
            for (const part of parts) {
              await Matrix.sendMessage(m.from, { text: part }, { quoted: m });
            }
            
            // Send button at the end
            const buttonMessage = {
              text: toFancyFont("Response complete!"),
              footer: "Powered by Matrix",
              buttons: [
                { 
                  buttonId: `${prefix}menu`, 
                  buttonText: { displayText: `${toFancyFont("Menu")}` }, 
                  type: 1 
                }
              ],
              headerType: 1
            };
            
            await Matrix.sendMessage(m.from, buttonMessage);
          } else {
            const buttonMessage = {
              text: answer,
              footer: "Powered by Matrix",
              buttons: [
                { 
                  buttonId: `${prefix}menu`, 
                  buttonText: { displayText: `${toFancyFont("Menu")}` }, 
                  type: 1 
                }
              ],
              headerType: 1
            };
            
            await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
          }
          
          // React with success emoji
          if (m.React) await m.React("✅");
        } else {
          throw new Error('Invalid response from the API.');
        }
      } catch (err) {
        console.error('API Error: ', err);
        
        const errorMessage = {
          text: `*${toFancyFont("Sorry, I encountered an error processing your request")}*\n\nError: ${err.message || 'Unknown error'}`,
          footer: "Powered by Matrix",
          buttons: [
            { 
              buttonId: `${prefix}report`, 
              buttonText: { displayText: `${toFancyFont("Report")}` }, 
              type: 1 
            }
          ],
          headerType: 1
        };
        
        await Matrix.sendMessage(m.from, errorMessage, { quoted: m });
        
        // React with error emoji
        if (m.React) await m.React("❌");
      }
    }
  } catch (error) {
    console.error('Unexpected error in gpt function:', error);
  }
};

export default gpt;
