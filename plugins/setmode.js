// save as plugins/setmode.js
import config from '../config.js';

export default {
    desc: 'Mengatur mode bot menjadi public atau self.',
    rules: {
        owner: true, // Command ini cuma buat owner
    },
    async execute({ reply, args }) {
        const newMode = args[0]?.toLowerCase();

        if (!newMode) {
            return await reply(`Gunakan: .setmode <self|public>\nMode sekarang: ${config.BOT_MODE}`);
        }

        if (newMode !== 'self' && newMode !== 'public') {
            return await reply('Mode ga valid. Pilih "self" atau "public" aja.');
        }

        if (config.BOT_MODE === newMode) {
            return await reply(`Santai, bot emang udah di mode "${newMode}".`);
        }

        // Langsung ubah value di object config yang lagi jalan
        config.BOT_MODE = newMode;

        await reply(`✅ Sip, mode bot udah keganti jadi "${newMode}".`);
    }
};