import colors from "@colors/colors/safe.js";
import db from "../lib/Database.js";

const config = await import("../config.js").then(m => m.default);

const checkedGroups = new Set();

export default {
    async execute({ sock, m, isGroup, chat, sender }) {
        if (!isGroup) return true;
        if (config.BOT_MODE === "self") return true;
        if (m.fromMe) return true;

        try {
            if (checkedGroups.has(chat)) return true;

            const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            const botLid = sock.user.lid?.split(":")[0] + "@lid";

            const groupData = await db.getGroup(chat);

            if (!groupData?.approved) {
                checkedGroups.add(chat);

                console.log(
                    colors.yellow(
                        `⚠️  Bot di grup tidak disetujui: ${chat}`
                    )
                );

                const metadata = await sock.groupMetadata(chat);
                const botInGroup = metadata.participants.some(
                    p => p.id === botJid || p.id === botLid
                );

                if (botInGroup) {
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
                        text: `🚨 *ANTI CULIK NOTIFICATION*\n\n❌ Bot diculik masuk grup:\n📱 Nama: ${metadata.subject}\n🆔 ID: ${chat}\n\n✅ Bot sudah keluar otomatis.\n\n💡 Gunakan .approvegc di grup tersebut untuk approve.`
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