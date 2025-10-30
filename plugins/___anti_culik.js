import colors from "@colors/colors/safe.js";
import db from "../lib/Database.js";

const config = await import("../config.js").then(m => m.default);

export default {
    async execute({ sock, m, isGroup, chat }) {
        if (!isGroup) return true;
        if (config.BOT_MODE === "self") return true;

        try {
            const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

            if (m.type === "notification" || m.key.id.includes("NOTIFY")) {
                const groupData = await db.getGroup(chat);

                if (!groupData?.approved) {
                    console.log(
                        colors.yellow(
                            `⚠️  Bot ditambahkan ke grup tidak disetujui: ${chat}`
                        )
                    );

                    await sock.sendMessage(chat, {
                        text: `⚠️ *ANTI CULIK AKTIF*\n\nBot ini tidak bisa digunakan di grup yang tidak terdaftar.\n\nHubungi owner untuk approve grup ini:\nwa.me/${config.OWNER_NUMBER.replace(/[^0-9]/g, "")}`
                    });

                    await new Promise(resolve => setTimeout(resolve, 2000));

                    await sock.groupLeave(chat);

                    console.log(
                        colors.green(`✅ Bot keluar dari grup: ${chat}`)
                    );

                    const ownerJid =
                        config.OWNER_NUMBER.replace(/[^0-9]/g, "") +
                        "@s.whatsapp.net";
                    await sock.sendMessage(ownerJid, {
                        text: `🚨 *ANTI CULIK NOTIFICATION*\n\n❌ Bot diculik masuk grup:\n📱 ID: ${chat}\n\n✅ Bot sudah keluar otomatis.\n\n💡 Gunakan .approvegc di grup tersebut untuk approve.`
                    });

                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error(
                colors.red("❌ Anti culik error:"),
                error.message
            );
            return true;
        }
    }
};