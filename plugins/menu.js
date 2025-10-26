export default async ({ sock, m, reply }) => {
    const config = (await import("../config.js")).default;
    const state = (await import("../lib/BotState.js")).default;
    
    const plugins = Array.from(state.plugins.keys()).filter(cmd => cmd !== 'menu');
    const totalPlugins = plugins.length;
    
    const menuText = `
╭━━━『 *${config.BOT_NAME}* 』━━━╮
│ 
│  👤 *Owner:* ${config.OWNER_NAME}
│  📦 *Total Commands:* ${totalPlugins}
│  🔖 *Prefix:* ${config.PREFIX.join(", ")}
│
╰━━━━━━━━━━━━━━━╯

╭━━━『 *AVAILABLE COMMANDS* 』━━━╮
│
${plugins.map(cmd => `│  ◈ ${cmd}`).join('\n')}
│
╰━━━━━━━━━━━━━━━╯

*Usage:* ${config.PREFIX[0]}<command>
*Example:* ${config.PREFIX[0]}${plugins[0] || 'command'}
    `.trim();

    await reply(menuText);
};