import upload from "../lib/upload.js";

export default {
    desc: "Upload media ke server",
    execute: async ({ m, reply, getFile }) => {
        const fileBuffer = await getFile();
        
        if (!fileBuffer) {
            return await reply("❌ Reply atau kirim media (gambar/video/audio/dokumen)");
        }

        await m.react("⏳");

        const url = await upload(fileBuffer);
        
        if (!url) {
            await m.react("❌");
            return await reply("❌ Upload gagal, coba lagi");
        }

        await m.react("✅");
        await reply(`✅ *Upload Berhasil*\n\n🔗 URL:\n${url}`);
    },
    rules: {
        limit: 1
    }
};