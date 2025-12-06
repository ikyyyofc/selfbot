import axios from "axios";
import upload from "../lib/upload.js";

export default {
    execute: async ({ m, args, getFile, reply }) => {
        const prompt = args.join(" ");
        if (!prompt) return reply("masukkin prompt dulu dong, mau diedit gimana?");

        let imageUrl;

        if (m.quoted?.isMedia || m.isMedia) {
            const buffer = await getFile();
            if (!buffer) return reply("gagal download gambarnya nih");
            
            const uploaded = await upload(buffer);
            if (!uploaded) return reply("gagal upload gambar ke server");
            
            imageUrl = uploaded;
        } else {
            return reply("reply/kirim gambar yang mau diedit + tulis promptnya");
        }

        await m.react("⏳");

        try {
            const { data } = await axios.get("https://api.nekolabs.web.id/image-generation/nano-banana/v6", {
                params: {
                    prompt,
                    imageUrl
                },
                timeout: 120000
            });

            if (!data.success || !data.result) {
                await m.react("❌");
                return reply("gagal edit gambar, coba lagi ntar");
            }

            await m.react("✅");
            await m.reply({
                image: { url: data.result },
                caption: `done~ (${data.responseTime})`
            });
        } catch (e) {
            await m.react("❌");
            reply("error: " + e.message);
        }
    }
};