export default async ({ sock, m, reply }) => {
    const config = (await import("../config.js")).default;
    const state = (await import("../lib/BotState.js")).default;
    
    const commands = Array.from(state.plugins.keys()).sort();
    const prefix = config.PREFIX[0];
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const menu = `╭━━━━『 *${config.BOT_NAME}* 』━━━━╮

*👤 Owner:* ${config.OWNER_NAME}
*⏱️ Runtime:* ${hours}h ${minutes}m ${seconds}s
*📦 Plugins:* ${commands.length} loaded

╰━━━━━━━━━━━━━━━━━━━╯

┏━━━『 *COMMANDS* 』━━━┓
${commands.map(cmd => `┃ ${prefix}${cmd}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━┛

┏━━━『 *SPECIAL CMDS* 』━━━┓
┃ > code (eval)
┃ => code (eval return)  
┃ $ command (exec)
┗━━━━━━━━━━━━━━━━━━━┛

*Usage:* ${prefix}<command> [args]
*Example:* ${prefix}sticker (reply media)`;

    await reply(menu);
};