export default {
  desc: "masukin member",
    rules: {
        admin: true
    },
    async execute({ sock, from, args, reply }) {
        try {
            // cek apakah digunakan di grup
            const metadata = await sock.groupMetadata(from).catch(() => null);
            if (!metadata)
                return reply("❌ Perintah ini hanya bisa digunakan di grup.");

            // pastikan bot admin
            const botNumber =
                (await sock.user.id).split(":")[0] + "@s.whatsapp.net";
            const isBotAdmin = metadata.participants.find(
                p => p.jid === botNumber && p.admin
            );
            if (!isBotAdmin)
                return reply(
                    "❌ Bot harus jadi admin untuk menambahkan anggota."
                );

            // ambil nomor dari argumen
            if (!args[0])
                return reply(
                    "⚠️ Masukkan nomor yang ingin ditambahkan.\nContoh: *.add 6281234567890*"
                );

            let number = args[0].replace(/[^0-9]/g, "");
            if (!number.startsWith("62")) number = "62" + number;
            const userJid = number + "@s.whatsapp.net";

            // coba tambah langsung
            const res = await sock.groupParticipantsUpdate(
                from,
                [userJid],
                "add"
            );

            if (res[0]?.status === 200) {
                return reply(`✅ Berhasil menambahkan @${number}`, {
                    mentions: [userJid]
                });
            }

            // kalau gagal karena privasi (403), kirim link ke orangnya via chat pribadi
            if (res[0]?.status === 403) {
                const inviteCode = await sock.groupInviteCode(from);
                const groupName = metadata.subject;
                const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

                await sock.sendMessage(userJid, {
                    text: `👋 Hai! Kamu diundang untuk bergabung ke grup *${groupName}*.\n\nKlik link di bawah untuk bergabung:\n${inviteLink}`
                });

                return reply(
                    `⚠️ Tidak bisa menambahkan langsung, link undangan sudah dikirim ke @${number}.`,
                    {
                        mentions: [userJid]
                    }
                );
            }
        } catch (err) {
            console.error(err);
            reply("❌ Terjadi kesalahan: " + err.message);
        }
    }
};
