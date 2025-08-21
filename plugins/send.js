import fs from 'fs';
import path from 'path';

const handleGreeting = async (m, gss) => {
  try {
    const textLower = m.body?.toLowerCase() || '';

    const triggerWords = [
      'send', 'statusdown', 'take', 'sent', 'giv', 'gib', 'upload',
      'send me', 'sent me', 'znt', 'snt', 'ayak', 'do', 'mee'
    ];

    // Check if message contains any trigger word
    const isTriggered = triggerWords.some(word => textLower.includes(word));
    
    if (!isTriggered) return;

    if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo) {
      const quotedMessage = m.message.extendedTextMessage.contextInfo.quotedMessage;

      if (!quotedMessage) return;

      let mediaUrl = null;
      
      try {
        // Check if it's an image
        if (quotedMessage.imageMessage) {
          const imageCaption = quotedMessage.imageMessage.caption || '';
          mediaUrl = await gss.downloadAndSaveMediaMessage(quotedMessage.imageMessage);
          
          if (!mediaUrl || !fs.existsSync(mediaUrl)) {
            throw new Error('Failed to download image');
          }
          
          await gss.sendMessage(m.from, {
            image: { url: mediaUrl },
            caption: imageCaption,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 9999,
              isForwarded: true,
            },
          });
        }
        // Check if it's a video
        else if (quotedMessage.videoMessage) {
          const videoCaption = quotedMessage.videoMessage.caption || '';
          mediaUrl = await gss.downloadAndSaveMediaMessage(quotedMessage.videoMessage);
          
          if (!mediaUrl || !fs.existsSync(mediaUrl)) {
            throw new Error('Failed to download video');
          }
          
          await gss.sendMessage(m.from, {
            video: { url: mediaUrl },
            caption: videoCaption,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 9999,
              isForwarded: true,
            },
          });
        }
        // Check if it's a document
        else if (quotedMessage.documentMessage) {
          const documentCaption = quotedMessage.documentMessage.caption || '';
          const fileName = quotedMessage.documentMessage.fileName || 'document';
          mediaUrl = await gss.downloadAndSaveMediaMessage(quotedMessage.documentMessage);
          
          if (!mediaUrl || !fs.existsSync(mediaUrl)) {
            throw new Error('Failed to download document');
          }
          
          await gss.sendMessage(m.from, {
            document: { url: mediaUrl },
            fileName: fileName,
            caption: documentCaption,
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 9999,
              isForwarded: true,
            },
          });
        }
        // Check if it's an audio
        else if (quotedMessage.audioMessage) {
          mediaUrl = await gss.downloadAndSaveMediaMessage(quotedMessage.audioMessage);
          
          if (!mediaUrl || !fs.existsSync(mediaUrl)) {
            throw new Error('Failed to download audio');
          }
          
          await gss.sendMessage(m.from, {
            audio: { url: mediaUrl },
            mimetype: 'audio/mpeg',
            contextInfo: {
              mentionedJid: [m.sender],
              forwardingScore: 9999,
              isForwarded: true,
            },
          });
        }
        else {
          await gss.sendMessage(m.from, { 
            text: 'Unsupported media type. I can only send images, videos, documents, and audio files.' 
          });
          return;
        }
      } catch (mediaError) {
        console.error('Error processing media:', mediaError);
        await gss.sendMessage(m.from, { 
          text: 'Sorry, I encountered an error while processing the media.' 
        });
      } finally {
        // Clean up temporary file
        if (mediaUrl && fs.existsSync(mediaUrl)) {
          try {
            fs.unlinkSync(mediaUrl);
          } catch (unlinkError) {
            console.error('Error deleting temporary file:', unlinkError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in handleGreeting:', error);
  }
};

export default handleGreeting;
