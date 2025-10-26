export default async ({ sock, m, groupCache }) => {
    const config = (await import("../config.js")).default;
    const { readdirSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pluginDir = join(__dirname);

    const plugins = readdirSync(pluginDir)
        .filter(f => f.endsWith(".js") && f !== "menu.js")
        .map(f => f.replace(".js", ""));

    const totalPlugins = plugins.length;
    const prefix = config.PREFIX[0];

    let menuText = `╭━━━━━━━━━━━━━━━━
│ 🤖 *${config.BOT_NAME}*
│ 👤 *Owner:* ${config.OWNER_NAME}
│ 📦 *Plugins:* ${totalPlugins}
│ 🔖 *Prefix:* ${config.PREFIX.join(", ")}
╰━━━━━━━━━━━━━━━━

`;

    if (m.isGroup) {
        const metadata = await groupCache.fetch(sock, m.chat);
        menuText += `╭━━━ *Group Info*
│ 👥 ${metadata.subject}
│ 👤 ${metadata.participants.length} members
╰━━━━━━━━━━━━━━━━

`;
    }

    menuText += `╭━━━ *Commands*\n`;
    plugins.forEach((cmd, i) => {
        menuText += `│ ${i + 1}. ${prefix}${cmd}\n`;
    });
    menuText += `╰━━━━━━━━━━━━━━━━

_ketik ${prefix}namacommand untuk menggunakan_`;

    await m.reply(menuText);
};