import db from "../lib/Database.js";
import time from "../lib/TimeHelper.js";

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
                const now = time.now();
                const timeLeft = groupData.expiresAt - now;
                
                if (timeLeft > 0) {
                    const daysLeft = time.getDaysLeft(groupData.expiresAt);
                    const duration = time.formatDuration(timeLeft);
                    const expireDate = time.getWIBDateTime(groupData.expiresAt);
                    
                    message += `⏰ Status: Aktif\n`;
                    message += `📅 Expired: ${expireDate} WIB\n`;
                    message += `⏳ Sisa waktu: ${duration}\n`;
                    
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