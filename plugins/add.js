javascript
import { jidNormalizedUser } from "@whiskeysockets/baileys";

export default {
    desc: "Menambahkan seseorang ke dalam grup.",
    rules: {
        group: true,
        admin: true,
        botAdmin: true,
    },
    execute: async context => {
        const { sock, m, args } = context;

        let users;
        if (m.quoted) {
            users = [m.quoted.sender];
        } else if (args.length > 0) {
            users = args.map(v => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
        } else {
            return m.reply(
                "❌ Siapa yang mau di-add?\n\nReply pesannya atau ketik nomornya."
            );
        }

        if (users.length === 0) {
            return m.reply("❌ Nomor tidak valid.");
        }

        try {
            const results = await sock.groupAdd(m.chat, users);
            const success = [];
            const failed = [];
            let mentionedJid = [];

            for (const res of results) {
                const userJid = Object.keys(res)[0];
                const status = res[userJid].code.toString();
                mentionedJid.push(userJid)

                if (status === "200") {
                    success.push(`@${userJid.split("@")[0]}`);
                } else {
                    failed.push(`@${userJid.split("@")[0]}`);
                }
            }

            let responseText = "";
            if (success.length > 0) {
                responseText += `✅ Berhasil menambahkan ${success.join(", ")}.`;
            }
            if (failed.length > 0) {
                responseText += `\n⚠️ Gagal menambahkan ${failed.join(
                    ", "
                )}, mungkin karena nomor tidak valid, private, atau sudah ada di grup.`;
            }

            await m.reply(responseText, mentionedJid);
        } catch (e) {
            console.log(e)
            await m.reply(
                "❌ Gagal menambahkan, pastiin bot udah jadi admin."
            );
        }
    }
};