export default async ({ sock, m, reply }) => {
    const { plugins } = await import("../lib/BotState.js").then(mod => {
        const state = new mod.default();
        return { plugins: state.plugins };
    });

    const config = await import("../config.js").then(m => m.default);
    
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const { dirname } = await import("path");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const PLUGIN_DIR = path.join(__dirname, "..", "plugins");

    const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js"));
    const pluginList = files.map(f => path.basename(f, ".js")).sort();

    const prefix = config.PREFIX[0];
    const totalPlugins = pluginList.length;

    let menuText = `╭━━━『 ${config.BOT_NAME} 』━━━╮\n`;
    menuText += `│ 👤 Owner: ${config.OWNER_NAME}\n`;
    menuText += `│ 📦 Total Plugins: ${totalPlugins}\n`;
    menuText += `│ 🔑 Prefix: ${prefix}\n`;
    menuText += `╰━━━━━━━━━━━━━━━╯\n\n`;

    menuText += `╭━━━『 COMMAND LIST 』━━━╮\n`;
    
    pluginList.forEach((cmd, index) => {
        menuText += `│ ${index + 1}. ${prefix}${cmd}\n`;
    });
    
    menuText += `╰━━━━━━━━━━━━━━━╯\n\n`;
    menuText += `💡 cara pake: ${prefix}namacommand\n`;
    menuText += `📝 contoh: ${prefix}${pluginList[0] || "command"}`;

    await reply(menuText);
};