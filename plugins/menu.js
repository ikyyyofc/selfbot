import config from "../config.js";

export default {
    async execute({ reply, state }) {
        // Ambil semua nama command dari state.plugins
        const commands = [...state.plugins.keys()].sort();
        const prefix = config.PREFIX[0] || ".";

        let menuText = `🤖 *${config.BOT_NAME || "BOT"} MENU* 🤖\n\n`;
        menuText += "Ini daftar command yang bisa lu pake:\n\n";

        // Filter 'menu' dari daftar dan format outputnya
        const commandList = commands
            .filter(cmd => cmd !== "menu")
            .map(cmd => `› ${prefix}${cmd}`)
            .join("\n");

        menuText += commandList;
        menuText += `\n\nTotal ada *${commands.length - 1}* command yang tersedia.`;
        menuText += `\n\n_Ketik ${prefix}<command> buat jalanin perintah._`;

        await reply(menuText);
    }
};