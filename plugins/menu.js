import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = path.join(__dirname);

export default async ({ sock, m, reply }) => {
    try {
        const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js") && f !== "menu.js");
        
        const commands = files.map(f => path.basename(f, ".js"));
        
        const chunked = [];
        const chunkSize = 3;
        for (let i = 0; i < commands.length; i += chunkSize) {
            chunked.push(commands.slice(i, i + chunkSize));
        }
        
        let menuText = `╭━━━『 *COMMAND LIST* 』━━━╮\n`;
        menuText += `│\n`;
        menuText += `│ *Total Commands:* ${commands.length}\n`;
        menuText += `│\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        chunked.forEach(chunk => {
            menuText += `┏━━━━━━━━━━━━━━━━━\n`;
            chunk.forEach(cmd => {
                menuText += `┃ ◈ ${cmd}\n`;
            });
            menuText += `┗━━━━━━━━━━━━━━━━━\n\n`;
        });
        
        menuText += `╭━━━『 *INFO* 』━━━╮\n`;
        menuText += `│ Bot aktif & siap dipake\n`;
        menuText += `│ Prefix: . ! /\n`;
        menuText += `╰━━━━━━━━━━━━━━╯`;

        await reply(menuText);
    } catch (error) {
        await reply(`❌ Error: ${error.message}`);
    }
};