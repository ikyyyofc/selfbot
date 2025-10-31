import axios from "axios";
import upload from "../lib/upload.js";

export default {
    desc: "Menjernihkan foto (HD Enhance)",
    rules: {
        limit: 3
    },
    async execute({ sock, m, reply, getFile }) {
        try {
            await m.react("⏳");

            const fileBuffer = await getFile();
            if (!fileBuffer) {
                await m.react("❌");
                return reply("❌ Kirim/reply gambar yang mau di-HD-in!");
            }

            await reply("🔄 Mengupload gambar...");
            const imageUrl = await upload(fileBuffer);
            
            if (!imageUrl) {
                await m.react("❌");
                return reply("❌ Upload gagal, coba lagi!");
            }

            await reply("⚙️ Memproses gambar...");
            const { data } = await axios.get(
                `https://api.nekolabs.my.id/tools/pxpic/enhance?imageUrl=${encodeURIComponent(imageUrl)}`,
                { timeout: 60000 }
            );

            if (!data?.success || !data?.result) {
                await m.react("❌");
                return reply("❌ API gagal proses gambar!");
            }

            await sock.sendMessage(m.chat, {
                image: { url: data.result },
                caption: "✨ Foto berhasil di-HD-in!"
            }, { quoted: m });

            await m.react("✅");

        } catch (error) {
            await m.react("❌");
            const msg = error.code === "ECONNABORTED" 
                ? "⏱️ Timeout! Gambar terlalu besar/lama"
                : "❌ Error: " + error.message;
            reply(msg);
        }
    }
};