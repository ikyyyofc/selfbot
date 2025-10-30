export default {
    async execute({ sock, m, reply }) {
        const config = (await import("../config.js")).default;
        const fs = await import("fs");
        const path = await import("path");
        const { fileURLToPath } = await import("url");
        const { dirname } = await import("path");

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const PLUGIN_DIR = path.join(__dirname, "..", "plugins");

        const plugins = new Map();
        const categories = new Map();

        try {
            const files = fs
                .readdirSync(PLUGIN_DIR)
                .filter(
                    f =>
                        f.endsWith(".js") &&
                        !f.startsWith("___") &&
                        f !== "menu.js"
                );

            for (const file of files) {
                const pluginPath = path.join(PLUGIN_DIR, file);
                const pluginUrl = `file://${pluginPath}?cache=${Date.now()}`;

                try {
                    const module = await import(pluginUrl);
                    const command = path.basename(file, ".js");

                    if (typeof module.default === "function") {
                        const category = module.category || "General";

                        plugins.set(command, {
                            category
                        });

                        if (!categories.has(category)) {
                            categories.set(category, []);
                        }
                        categories.get(category).push({
                            command
                        });
                    }
                } catch (e) {
                    console.error(`Failed to load ${file}:`, e.message);
                }
            }

            let menuText = `╭━━━━━━━━━━━━━━━━━╮
┃  📱 ${config.BOT_NAME.toUpperCase()} MENU
┃  👤 Owner: ${config.OWNER_NAME}
┃  🔧 Total: ${plugins.size} commands
╰━━━━━━━━━━━━━━━━━╯

`;

            for (const [category, commands] of categories) {
                menuText += `╭━━『 ${category} 』\n`;
                commands.forEach(({ command }) => {
                    menuText += `┃ ${config.PREFIX[0]}${command}\n`;
                });
                menuText += `╰━━━━━━━━━━━━━━━\n\n`;
            }

            menuText += `Type ${config.PREFIX[0]}<command> to use`;

            await reply(menuText);
        } catch (error) {
            await reply(`Error: ${error.message}`);
        }
    }
};
