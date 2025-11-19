import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    rules: {
        owner: true, // Biar cuma owner yang bisa pake, demi keamanan
        limit: false,
    },
    desc: 'Ambil kode sumber plugin',
    usage: '.gp <nama_plugin_1> <nama_plugin_2> ...',
    execute: async ({ sock, m, args, reply }) => {
        if (args.length === 0) {
            return await reply("Sebutin nama plugin yang mau diambil kodenya, bro.\nContoh: `.gp menu`");
        }

        const pluginsDir = path.join(path.dirname(__dirname), 'plugins');
        const buttons = [];
        const notFoundPlugins = [];

        for (const pluginName of args) {
            const filePath = path.join(pluginsDir, `${pluginName}.js`);

            if (fs.existsSync(filePath)) {
                const code = fs.readFileSync(filePath, 'utf-8');
                buttons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: `Salin Kode: ${pluginName}.js`,
                        copy_code: code
                    })
                });
            } else {
                notFoundPlugins.push(pluginName);
            }
        }

        if (buttons.length === 0) {
            return await reply(`Gak nemu semua plugin yang lu cari: ${notFoundPlugins.join(', ')}`);
        }

        let responseText = `Nih, kode buat plugin yang lu minta. Klik buat nyalin.`;
        if (notFoundPlugins.length > 0) {
            responseText += `\n\nBTW, plugin ini gak ketemu: ${notFoundPlugins.join(', ')}`;
        }
        
        try {
            await sock.sendInteractiveMessage(m.chat, {
                text: responseText,
                footer: 'Dibuat oleh Ikyy.',
                interactiveButtons: buttons
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            await reply("Waduh, gagal kirim tombol interaktif. Mungkin ada error di library atau kodenya.");
        }
    }
};