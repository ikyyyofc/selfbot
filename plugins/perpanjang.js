import db from "../lib/Database.js";

export default {
    rules: {
        owner: true,
        group: true
    },
    async execute({ chat, text, reply }) {
        try {
            const groupData = await db.getGroup(chat);
            
            if (!groupData?.approved) {
                return reply("❌ Grup ini belum approved!");
            }
            
            if (!text) {
                return reply("❌ Format salah!\n\nContoh:\n.extendgc 30 (tambah 30 hari)");
            }
            
            const days = parseInt(text);
            if (isNaN(days) || days < 1) {
                return reply("❌ Jumlah hari harus angka positif!");
            }
            
            const addTime = days * 24 * 60 * 60 * 1000;
            let newExpiresAt;
            
            if (groupData.expiresAt) {
                const currentExpiry = groupData.expiresAt > Date.now() 
                    ? groupData.expiresAt 
                    : Date.now();
                newExpiresAt = currentExpiry + addTime;
            } else {
                newExpiresAt = Date.now() + addTime;
            }
            
            const totalDays = (groupData.rentDays || 0) + days;
            
            await db.updateGroup(chat, {
                expiresAt: newExpiresAt,
                rentDays: totalDays
            });
            
            const expireDate = new Date(newExpiresAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            
            const message = `✅ *SEWA DIPERPANJANG*\n\n` +
                `📱 Grup: ${groupData.subject}\n` +
                `➕ Ditambah: ${days} hari\n` +
                `📅 Expired baru: ${expireDate}\n` +
                `⏰ Total hari: ${totalDays} hari`;
            
            await reply(message);
        } catch (error) {
            await reply(`❌ Gagal extend: ${error.message}`);
        }
    }
};