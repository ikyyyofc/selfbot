import db from "../lib/Database.js";

export default {
    rules: {
        group: true
    },
    async execute({ chat, reply }) {
        try {
            const groupData = await db.getGroup(chat);
            
            if (!groupData?.approved) {
                return reply("❌ Grup ini belum terdaftar!");
            }
            
            let message = `📋 *INFO SEWA GRUP*\n\n`;
            message += `📱 Grup: ${groupData.subject}\n`;
            message += `🆔 ID: ${chat.split("@")[0]}\n\n`;
            
            if (groupData.expiresAt) {
                const now = Date.now();
                const timeLeft = groupData.expiresAt - now;
                
                if (timeLeft > 0) {
                    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                    const hoursLeft = Math.ceil((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    
                    const expireDate = new Date(groupData.expiresAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                    
                    message += `⏰ Status: Aktif\n`;
                    message += `📅 Expired: ${expireDate}\n`;
                    message += `⏳ Sisa waktu: ${daysLeft} hari ${hoursLeft} jam\n`;
                    
                    if (daysLeft <= 3) {
                        message += `\n⚠️ *PERINGATAN*\nSewa akan segera habis!`;
                    }
                } else {
                    message += `⏰ Status: Expired\n`;
                    message += `❌ Bot akan segera keluar dari grup`;
                }
            } else {
                message += `⏰ Status: Permanent\n`;
                message += `✅ Tidak ada batas waktu`;
            }
            
            await reply(message);
        } catch (error) {
            await reply(`❌ Error: ${error.message}`);
        }
    }
};