import fetch from 'node-fetch';
import config from '../config.cjs';

const fetchData = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.message?.conversation?.startsWith(prefix) 
    ? m.message.conversation.slice(prefix.length).split(' ')[0].toLowerCase() 
    : '';
  
  const text = m.message?.conversation?.startsWith(prefix)
    ? m.message.conversation.slice(prefix.length + cmd.length).trim()
    : '';

  const validCommands = ['fetch', 'get', 'api'];

  if (validCommands.includes(cmd)) {
    if (!text || !/^https?:\/\//.test(text)) {
      return Matrix.sendMessage(m.key.remoteJid, { 
        text: 'Start the *URL* with http:// or https://' 
      });
    }

    try {
      const _url = new URL(text);
      const url = `${_url.origin}${_url.pathname}?${_url.searchParams.toString()}`;
      const res = await fetch(url);

      const contentLength = res.headers.get('content-length');
      if (contentLength && contentLength > 100 * 1024 * 1024 * 1024) {
        return Matrix.sendMessage(m.key.remoteJid, {
          text: `Content-Length exceeds the limit: ${contentLength}`
        });
      }

      const contentType = res.headers.get('content-type');
      
      // Handle non-text content types by sending as media
      if (!contentType?.includes('text') && !contentType?.includes('json')) {
        const mediaMessage = {
          [contentType?.includes('image') ? 'image' : 
           contentType?.includes('video') ? 'video' :
           contentType?.includes('audio') ? 'audio' : 'document']: {
            url: url
          },
          caption: '> Api Fetched From Caseyrhodes AI',
          mimetype: contentType
        };
        
        return Matrix.sendMessage(m.key.remoteJid, mediaMessage);
      }

      let content = Buffer.from(await res.arrayBuffer());

      try {
        const parsedJson = JSON.parse(content.toString());
        content = JSON.stringify(parsedJson, null, 2);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        content = content.toString();
      } finally {
        // Split large content into multiple messages if needed
        const maxLength = 4096; // WhatsApp message limit
        for (let i = 0; i < content.length; i += maxLength) {
          await Matrix.sendMessage(m.key.remoteJid, {
            text: content.slice(i, i + maxLength)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error.message);
      Matrix.sendMessage(m.key.remoteJid, {
        text: 'Error fetching data: ' + error.message
      });
    }
  }
};

export default fetchData;
