import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export default {
    rules: {
        owner: true, // cuma owner yg bisa pake
        cooldown: 10 // cooldown 10 detik
    },
    async execute(context) {
        const { reply } = context;
        const pluginsDir = path.join(process.cwd(), "plugins");
        
        await reply("ngecek semua plugin bentar...");

        let results = [];
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));

        for (const file of files) {
            const pluginPath = path.join(pluginsDir, file);
            const pluginUrl = `file://${pluginPath}?update=${Date.now()}`;
            
            try {
                // coba import modulnya buat ngetes ada error syntax apa kaga
                await import(pluginUrl);
                results.push(`✅ ${file} -> ok`);
            } catch (e) {
                results.push(`❌ ${file} -> error: ${e.message.split('\n')[0]}`);
            }
        }

        if (results.length === 0) {
            return await reply("folder plugin kosong tolol");
        }

        await reply(`hasil pengecekan:\n\n${results.join("\n")}`);
    }
};