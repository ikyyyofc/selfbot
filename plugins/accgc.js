import db from "../lib/Database.js";
import groupCache from "../lib/groupCache.js";

export default {
    rules: {
        owner: true,
        group: true
    },
    async execute({ sock, chat, text, reply }) {
        try {
            const metadata = await groupCache.fetch(sock, chat);
            
            let days = null;
            let expiresAt = null;
            
            if (text) {
                days = parseInt(text);
                if (isNaN(days) || days < 1) {
                    return reply("❌ Format salah!\n\nContoh:\n.approvegc 30 (30 hari)\n.approvegc (permanent)");
                }
                
                expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
            }

            await db.updateGroup(chat, {
                approved: true,
                approvedAt: Date.now(),
                subject: metadata.subject || "Unknown",
                expiresAt,
                rentDays: days
            });

            let message = `✅ *GRUP DISETUJUI*\n\n`;
            message += `📱 Grup: ${metadata.subject}\n`;
            message += `🆔 ID: ${chat}\n`;
            
            if (days) {
                const expireDate = new Date(expiresAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });
                message += `⏰ Durasi: ${days} hari\n`;
                message += `📅 Expired: ${expireDate}\n`;
            } else {
                message += `⏰ Durasi: Permanent\n`;
            }
            
            message += `\nBot sekarang bisa digunakan di grup ini!`;

            await reply(message);
        } catch (error) {
            await reply(`❌ Gagal approve grup: ${error.message}`);
        }
    }
};