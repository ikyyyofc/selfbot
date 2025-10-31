import db from "../lib/Database.js";
import time from "../lib/TimeHelper.js";

const config = await import("../config.js").then(m => m.default);

export default {
    async execute({ sender, reply }) {
        const user = await db.getOrCreateUser(sender);

        const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
        const senderNumber = sender.replace(/[^0-9]/g, "");
        const isOwner = senderNumber === ownerNumber;

        const limitText = user.premium || isOwner ? "∞ (Unlimited)" : user.limit;
        const statusText = isOwner 
            ? "👑 Owner" 
            : user.premium 
            ? "⭐ Premium" 
            : "🆓 Free";
        const regDate = time.getWIBDateOnly(user.registered);

        const message = `
╭─「 👤 PROFILE 」
│ 
│ 📱 Nomor: ${sender.split("@")[0]}
│ 🎖️ Status: ${statusText}
│ 📊 Limit: ${limitText}
│ 📅 Terdaftar: ${regDate}
│
╰─────────────

${!user.premium && !isOwner ? "💡 Upgrade ke premium untuk limit unlimited!" : ""}
`.trim();

        await reply(message);
    }
};