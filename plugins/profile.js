import db from "../lib/Database.js";
import time from "../lib/TimeHelper.js";

export default {
    async execute({ sender, reply }) {
        const user = await db.getOrCreateUser(sender);

        const limitText = user.premium ? "∞ (Unlimited)" : user.limit;
        const statusText = user.premium ? "⭐ Premium" : "🆓 Free";
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

${!user.premium ? "💡 Upgrade ke premium untuk limit unlimited!" : ""}
`.trim();

        await reply(message);
    }
};