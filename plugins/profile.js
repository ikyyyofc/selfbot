import db from "../lib/Database.js";

export default {
  desc: "menampilkan profile",
    async execute({ sender, reply }) {
        const user = await db.getOrCreateUser(sender);

        const limitText = user.premium ? "∞ (Unlimited)" : user.limit;
        const statusText = user.premium ? "⭐ Premium" : "🆓 Free";

        const message = `
╭─「 👤 PROFILE 」
│ 
│ 📱 Nomor: ${sender.split("@")[0]}
│ 🎖️ Status: ${statusText}
│ 📊 Limit: ${limitText}
│ 📅 Terdaftar: ${new Date(user.registered).toLocaleDateString("id-ID")}
│
╰─────────────

${!user.premium ? "💡 Upgrade ke premium untuk limit unlimited!" : ""}
`.trim();

        await reply(message);
    }
};