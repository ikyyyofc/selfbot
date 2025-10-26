import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async ({ reply }) => {
    try {
        const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
        
        let menuText = "❏  *MENU*\n\n";

        const commands = files.map(file => {
            const commandName = path.basename(file, '.js');
            return `› .${commandName}`;
        });
        
        menuText += commands.join('\n');
        
        await reply(menuText);

    } catch (error) {
        console.error("Error building menu:", error);
        await reply("Duh, sorry. Gagal nampilin menu, ada error nih.");
    }
};