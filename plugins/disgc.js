import db from "../lib/Database.js";

export default {
    rules: {
        owner: true,
        group: true
    },
    async execute({ sock, chat, reply }) {
        try {
            await db.updateGroup(chat, {
                approved: false
            });

            await reply(
                `⚠️ *GRUP DITOLAK*\n\n` +
                `Bot tidak bisa lagi digunakan di grup ini.\n` +
                `Bot akan keluar dalam 3 detik...`
            );

            await new Promise(resolve => setTimeout(resolve, 3000));

            await sock.groupLeave(chat);
        } catch (error) {
            await reply(`❌ Gagal disapprove grup: ${error.message}`);
        }
    }
};