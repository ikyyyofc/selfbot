export default {
    rules: {
        group: true,
        admin: true,
    },
    async execute({ sock, m }) {
        if (!m.quoted || !m.quoted.isMedia) {
            return m.reply("❌ Reply ke gambar atau video yang mau dijadiin status grup.");
        }

        try {
            const mediaMessage = m.quoted.message;

            await sock.relayMessage(m.chat, {
                groupStatusMessageV2: {
                    message: mediaMessage
                }
            }, {});

            await m.reply("✅ Berhasil upload ke status grup.");

        } catch (error) {
            console.error("❌ Error setting group status:", error);
            await m.reply("⚠️ Gagal update status grup, coba lagi nanti.");
        }
    }
};