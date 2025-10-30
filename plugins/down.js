export default {
    desc: "download media yang di reply",
    async execute({ sock, from, m, reply, fileBuffer }) {
        try {
            // Jika tidak ada media di reply
            if (!fileBuffer) {
                return await reply(
                    "⚠️ Tolong reply pesan yang berisi media (foto, video, audio, atau dokumen)."
                );
            }

            const quoted =
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                return await reply("⚠️ Tidak ada pesan yang di-reply.");
            }

            let type;
            if (quoted.imageMessage) type = "image";
            else if (quoted.videoMessage) type = "video";
            else if (quoted.audioMessage) type = "audio";
            else if (quoted.documentMessage) type = "document";
            else return await reply("❌ Jenis media tidak didukung.");

            // Kirim ulang (forward) media yang sudah di-download
            await sock.sendMessage(from, { [type]: fileBuffer });

            await reply("✅ Media berhasil di-forward.");
        } catch (err) {
            console.error(err);
            await reply("❌ Terjadi kesalahan saat mencoba mem-forward media.");
        }
    }
};
