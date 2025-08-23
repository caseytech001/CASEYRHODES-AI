import cron from 'node-cron';
import moment from 'moment-timezone';
import config from '../config.cjs';

let scheduledTasks = {};

const groupSetting = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.message?.conversation?.startsWith(prefix) 
      ? m.message.conversation.slice(prefix.length).split(' ')[0].toLowerCase() 
      : '';
    const text = m.message?.conversation?.slice(prefix.length + cmd.length).trim() || '';

    const validCommands = ['group'];
    if (!validCommands.includes(cmd)) return;

    if (!m.isGroup) {
      const buttons = [
        {buttonId: `${prefix}group`, buttonText: {displayText: 'GROUP COMMANDS'}, type: 1}
      ];
      const buttonMessage = {
        text: "*📛 THIS COMMAND CAN ONLY BE USED IN GROUPS*",
        footer: "Use in a group to manage settings",
        buttons: buttons,
        headerType: 1
      };
      return await gss.sendMessage(m.chat, buttonMessage);
    }
    
    const groupMetadata = await gss.groupMetadata(m.chat);
    const participants = groupMetadata.participants;
    const botNumber = gss.user.id;
    const botAdmin = participants.find(p => p.id === botNumber)?.admin;
    const senderAdmin = participants.find(p => p.id === m.sender)?.admin;

    if (!botAdmin) {
      const buttons = [
        {buttonId: '!promote', buttonText: {displayText: 'MAKE BOT ADMIN'}, type: 1}
      ];
      const buttonMessage = {
        text: "*📛 BOT MUST BE AN ADMIN TO USE THIS COMMAND*",
        footer: "Please promote the bot to admin first",
        buttons: buttons,
        headerType: 1
      };
      return await gss.sendMessage(m.chat, buttonMessage);
    }
    
    if (!senderAdmin) {
      const buttons = [
        {buttonId: '!admin', buttonText: {displayText: 'REQUEST ADMIN'}, type: 1}
      ];
      const buttonMessage = {
        text: "*📛 YOU MUST BE AN ADMIN TO USE THIS COMMAND*",
        footer: "Only group admins can change settings",
        buttons: buttons,
        headerType: 1
      };
      return await gss.sendMessage(m.chat, buttonMessage);
    }

    const args = text.split(/\s+/);
    
    // Show main menu if no arguments
    if (args.length < 1 || args[0] === 'menu') {
      const buttons = [
        {buttonId: `${prefix}group open`, buttonText: {displayText: 'OPEN GROUP'}, type: 1},
        {buttonId: `${prefix}group close`, buttonText: {displayText: 'CLOSE GROUP'}, type: 1},
        {buttonId: `${prefix}group schedule`, buttonText: {displayText: 'SCHEDULE'}, type: 1}
      ];
      const buttonMessage = {
        text: "┌──「 *GROUP SETTINGS* 」\n" +
              "│\n" +
              "├─ 📛 *Group Name:* " + groupMetadata.subject + "\n" +
              "├─ 🔒 *Current Setting:* " + (groupMetadata.announce ? "CLOSED" : "OPEN") + "\n" +
              "│\n" +
              "├─ 💡 *Commands:*\n" +
              "├─ • " + prefix + "group open\n" +
              "├─ • " + prefix + "group close\n" +
              "├─ • " + prefix + "group open 04:00 PM\n" +
              "├─ • " + prefix + "group close 11:00 PM\n" +
              "│\n" +
              "└──「 *BAILEYS BOT* 」",
        footer: "Select an option or type a command",
        buttons: buttons,
        headerType: 1
      };
      return await gss.sendMessage(m.chat, buttonMessage);
    }

    const groupSetting = args[0].toLowerCase();
    const time = args.slice(1).join(' ');

    // Handle immediate setting if no time is provided
    if (!time) {
      if (groupSetting === 'close') {
        await gss.groupSettingUpdate(m.chat, 'announcement');
        
        const buttons = [
          {buttonId: `${prefix}group open`, buttonText: {displayText: 'OPEN GROUP'}, type: 1},
          {buttonId: `${prefix}group menu`, buttonText: {displayText: 'MENU'}, type: 1}
        ];
        const buttonMessage = {
          text: "✅ *Group successfully closed.*\n\nOnly admins can send messages now.",
          footer: config.BOT_NAME,
          buttons: buttons,
          headerType: 1
        };
        return await gss.sendMessage(m.chat, buttonMessage);
      } else if (groupSetting === 'open') {
        await gss.groupSettingUpdate(m.chat, 'not_announcement');
        
        const buttons = [
          {buttonId: `${prefix}group close`, buttonText: {displayText: 'CLOSE GROUP'}, type: 1},
          {buttonId: `${prefix}group menu`, buttonText: {displayText: 'MENU'}, type: 1}
        ];
        const buttonMessage = {
          text: "✅ *Group successfully opened.*\n\nAll participants can send messages now.",
          footer: config.BOT_NAME,
          buttons: buttons,
          headerType: 1
        };
        return await gss.sendMessage(m.chat, buttonMessage);
      } else if (groupSetting === 'schedule') {
        const buttons = [
          {buttonId: `${prefix}group open 06:00 AM`, buttonText: {displayText: 'OPEN AT 6AM'}, type: 1},
          {buttonId: `${prefix}group close 11:00 PM`, buttonText: {displayText: 'CLOSE AT 11PM'}, type: 1},
          {buttonId: `${prefix}group menu`, buttonText: {displayText: 'BACK TO MENU'}, type: 1}
        ];
        const buttonMessage = {
          text: "⏰ *Group Schedule Settings*\n\n" +
                "Select a preset or type your own schedule:\n\n" +
                "• `" + prefix + "group open 06:00 AM`\n" +
                "• `" + prefix + "group close 11:00 PM`\n" +
                "• `" + prefix + "group open 04:00 PM`\n" +
                "• `" + prefix + "group close 10:00 PM`",
          footer: "All times are in IST",
          buttons: buttons,
          headerType: 1
        };
        return await gss.sendMessage(m.chat, buttonMessage);
      } else {
        const buttons = [
          {buttonId: `${prefix}group open`, buttonText: {displayText: 'OPEN'}, type: 1},
          {buttonId: `${prefix}group close`, buttonText: {displayText: 'CLOSE'}, type: 1}
        ];
        const buttonMessage = {
          text: `❌ Invalid setting. Use "open" to open the group and "close" to close the group.\n\nExample:\n*${prefix + cmd} open* or *${prefix + cmd} close*`,
          footer: "Try again with a valid option",
          buttons: buttons,
          headerType: 1
        };
        return await gss.sendMessage(m.chat, buttonMessage);
      }
    }

    // Check if the provided time is valid
    if (!/^\d{1,2}:\d{2}\s*(?:AM|PM)$/i.test(time)) {
      const buttons = [
        {buttonId: `${prefix}group open 04:00 PM`, buttonText: {displayText: 'EXAMPLE TIME'}, type: 1},
        {buttonId: `${prefix}group menu`, buttonText: {displayText: 'BACK TO MENU'}, type: 1}
      ];
      const buttonMessage = {
        text: `❌ Invalid time format. Use HH:mm AM/PM format.\n\nExample:\n*${prefix + cmd} open 04:00 PM*`,
        footer: "All times are in IST",
        buttons: buttons,
        headerType: 1
      };
      return await gss.sendMessage(m.chat, buttonMessage);
    }

    // Convert time to 24-hour format
    const [hour, minute] = moment(time, ['h:mm A', 'hh:mm A']).format('HH:mm').split(':').map(Number);
    const cronTime = `${minute} ${hour} * * *`;

    console.log(`Scheduling ${groupSetting} at ${cronTime} IST`);

    // Clear any existing scheduled task for this group
    if (scheduledTasks[m.chat]) {
      scheduledTasks[m.chat].stop();
      delete scheduledTasks[m.chat];
    }

    scheduledTasks[m.chat] = cron.schedule(cronTime, async () => {
      try {
        console.log(`Executing scheduled task for ${groupSetting} at ${moment().format('HH:mm')} IST`);
        if (groupSetting === 'close') {
          await gss.groupSettingUpdate(m.chat, 'announcement');
          
          const buttons = [
            {buttonId: `${prefix}group open`, buttonText: {displayText: 'OPEN GROUP'}, type: 1}
          ];
          const buttonMessage = {
            text: "⏰ *Scheduled Action Completed:*\nGroup successfully closed.\n\nOnly admins can send messages now.",
            footer: config.BOT_NAME,
            buttons: buttons,
            headerType: 1
          };
          await gss.sendMessage(m.chat, buttonMessage);
        } else if (groupSetting === 'open') {
          await gss.groupSettingUpdate(m.chat, 'not_announcement');
          
          const buttons = [
            {buttonId: `${prefix}group close`, buttonText: {displayText: 'CLOSE GROUP'}, type: 1}
          ];
          const buttonMessage = {
            text: "⏰ *Scheduled Action Completed:*\nGroup successfully opened.\n\nAll participants can send messages now.",
            footer: config.BOT_NAME,
            buttons: buttons,
            headerType: 1
          };
          await gss.sendMessage(m.chat, buttonMessage);
        }
      } catch (err) {
        console.error('Error during scheduled task execution:', err);
        await gss.sendMessage(m.chat, { text: '❌ An error occurred while updating the group setting.' });
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    const action = groupSetting === 'close' ? 'closed' : 'opened';
    const buttons = [
      {buttonId: `${prefix}group ${groupSetting === 'close' ? 'open' : 'close'}`, buttonText: {displayText: groupSetting === 'close' ? 'OPEN NOW' : 'CLOSE NOW'}, type: 1},
      {buttonId: `${prefix}group menu`, buttonText: {displayText: 'SETTINGS MENU'}, type: 1}
    ];
    const buttonMessage = {
      text: `✅ *Schedule Set Successfully!*\n\nGroup will be ${action} at ${time} IST.`,
      footer: "You can cancel by scheduling a different time",
      buttons: buttons,
      headerType: 1
    };
    await gss.sendMessage(m.chat, buttonMessage);
  } catch (error) {
    console.error('Error:', error);
    
    const buttons = [
      {buttonId: `${prefix}group menu`, buttonText: {displayText: 'BACK TO MENU'}, type: 1}
    ];
    const buttonMessage = {
      text: '❌ An error occurred while processing the command.',
      footer: "Please try again later",
      buttons: buttons,
      headerType: 1
    };
    await gss.sendMessage(m.chat, buttonMessage);
  }
};

export default groupSetting;
