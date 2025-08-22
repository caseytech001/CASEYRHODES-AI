import config from '../config.cjs';

const Callupdate = async (json, sock) => {
   for (const id of json) {
      if (id.status === 'offer' && config.REJECT_CALL) {
         let msg = await sock.sendMessage(id.from, {
            text: `*ICall Manager*\n\n📵 *Auto Call Rejection Enabled*\n\nType .list to see all commands\n\n© GURU-AI | ${new Date().getFullYear()}`,
            footer: 'Commands  Ping  GitHub  YouTube  Telegram',
            templateButtons: [
               { index: 1, urlButton: { displayText: '⭐ GitHub', url: 'https://github.com/caseyweb' } },
               { index: 2, urlButton: { displayText: '📺 YouTube', url: 'https://youtube.com/caseyrhodes01' } },
               { index: 3, urlButton: { displayText: '📱 Telegram', url: 'https://t.me/caseyrhodes001' } },
               { index: 4, quickReplyButton: { displayText: '.list', id: 'list_command' } }
            ]
         });
         await sock.rejectCall(id.id, id.from);
      }
   }
};

export default Callupdate;
