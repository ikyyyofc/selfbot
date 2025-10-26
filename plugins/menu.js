// plugins/menu.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config.js";

// Helper buat dapetin __dirname di ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async ({ reply, m }) => {
    try {
        const pluginsDir = __dirname;
        const commandFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));

        const prefix = config.PREFIX[0] || ".";
        const botName = config.BOT_NAME || "IKYY";
        const ownerName = config.OWNER_NAME || "IKYYOFC";

        let menuText = `Hai *${m.pushName}*! 👋\n\nNih daftar command yang ada di *${botName}*:\n\n╭─「 *MENU* 」\n`;

        const commands = commandFiles.map(file => {
            const command = path.basename(file, '.js');
            return `│ › ${prefix}${command}`;
        });

        menuText += commands.join('\n');
        menuText += `\n╰───「 *${ownerName}* 」`;
        
        // Fungsi reply dari bot lu udah otomatis ada thumbnail dll, jadi tinggal kirim teksnya aja
        await reply(menuText);

    } catch (error) {
        console.error("Error di plugin menu:", error);
        await reply("Duh, menunya lagi ngambek nih. Coba lagi ntar ya.");
    }
};