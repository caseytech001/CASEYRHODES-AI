import moment from 'moment-timezone';
import config from '../config.cjs';

export default async function GroupParticipants(sock, { id, participants, action }) {
   try {
      const metadata = await sock.groupMetadata(id);

      for (const jid of participants) {
         // Get profile picture user
         let profile;
         try {
            profile = await sock.profilePictureUrl(jid, "image");
         } catch {
            profile = "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu";
         }

         // Get user's profile name
         let userName;
         try {
            const contact = await sock.getContact(jid);
            userName = contact.name || contact.notify || jid.split("@")[0];
         } catch {
            userName = jid.split("@")[0];
         }

         // Action handling
         if (action === "add" && config.WELCOME) {
            const joinTime = moment.tz('Asia/Kolkata').format('HH:mm:ss');
            const joinDate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY');
            const membersCount = metadata.participants.length;
            
            await sock.sendMessage(id, {
               text: `> Hello @${userName}! Welcome to *${metadata.subject}*.\n> You are the ${membersCount}th member.\n> Joined at: ${joinTime} on ${joinDate}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ 👻`,
               mentions: [jid],
               contextInfo: {
                  forwardingScore: 999,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                     newsletterJid: '120363302677217436@newsletter',
                     newsletterName: 'CASEYRHODES TECH 👻',
                     serverMessageId: 143
                  }
               }
            });
            
         } else if (action === "remove" && config.WELCOME) {
            const leaveTime = moment.tz('Asia/Kolkata').format('HH:mm:ss');
            const leaveDate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY');
            const membersCount = metadata.participants.length;
            
            await sock.sendMessage(id, {
               text: `> Goodbye @${userName} from ${metadata.subject}.\n> We are now ${membersCount} members in the group.\n> Left at: ${leaveTime} on ${leaveDate}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ 👻`,
               mentions: [jid],
               contextInfo: {
                  forwardingScore: 999,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                     newsletterJid: '120363302677217436@newsletter',
                     newsletterName: 'CASEYRHODES TECH 👻',
                     serverMessageId: 143
                  }
               }
            });
         }
      }
   } catch (e) {
      console.error('Error in GroupParticipants:', e);
      throw e;
   }
}
