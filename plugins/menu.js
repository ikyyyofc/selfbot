import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function ({ sock, m, args }) {
    try {
        const pluginDir = path.join(__dirname, "../plugins");
        const files = fs
            .readdirSync(pluginDir)
            .filter(f => f.endsWith(".js") && f !== "menu.js");

        const config = await import("../config.js").then(mod => mod.default);
        const prefix = config.PREFIX?.[0] || ".";

        let menu = `╭━━━『 *MENU BOT* 』━━━╮\n`;
        menu += `│ 👤 *User:* ${m.pushName}\n`;
        menu += `│ 📱 *Number:* ${m.sender.split("@")[0]}\n`;
        menu += `│ 🤖 *Total Plugins:* ${files.length}\n`;
        menu += `╰━━━━━━━━━━━━━━━━╯\n\n`;

        menu += `╭━━━『 *COMMAND LIST* 』━━━╮\n`;
        files.forEach((file, index) => {
            const cmd = path.basename(file, ".js");
            menu += `│ ${index + 1}. ${prefix}${cmd}\n`;
        });
        menu += `╰━━━━━━━━━━━━━━━━╯\n\n`;

        menu += `_Gunakan ${prefix}<command> untuk menggunakan fitur_`;

        await m.reply(menu);
    } catch (error) {
        await m.reply(`❌ Error: ${error.message}`);
    }
}