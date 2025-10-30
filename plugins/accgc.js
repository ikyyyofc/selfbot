import db from "../lib/Database.js";
import groupCache from "../lib/groupCache.js";

export default {
    rules: {
        owner: true,
        group: true
    },
    async execute({ sock, chat, reply }) {
        try {
            const metadata = await groupCache.fetch(sock, chat);

            await db.updateGroup(chat, {
                approved: true,
                approvedAt: Date.now(),
                subject: metadata.subject || "Unknown"
            });

            await reply(
                `✅ *GRUP DISETUJUI*\n\n` +
                `📱 Grup: ${metadata.subject}\n` +
                `🆔 ID: ${chat}\n\n` +
                `Bot sekarang bisa digunakan di grup ini!`
            );
        } catch (error) {
            await reply(`❌ Gagal approve grup: ${error.message}`);
        }
    }
};