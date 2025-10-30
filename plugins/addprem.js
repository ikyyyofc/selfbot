import db from "../lib/Database.js";

export default {
    rules: {
        owner: true
    },
    async execute({ m, text, reply }) {
        if (!text) {
            return reply("❌ Gunakan: .addprem @user atau .addprem 628xxx");
        }

        let targetId;
        if (m.mentions?.length > 0) {
            targetId = m.mentions[0];
        } else {
            const number = text.replace(/[^0-9]/g, "");
            if (!number) {
                return reply("❌ Nomor tidak valid");
            }
            targetId = number + "@s.whatsapp.net";
        }

        await db.setPremium(targetId, true);
        await reply(`✅ User ${targetId.split("@")[0]} sekarang premium!`);
    }
};