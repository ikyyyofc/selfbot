import axios from "axios";

export default async ({ sock, m, fileBuffer, reply }) => {
    try {
        if (!m.quoted?.isMedia && !fileBuffer) {
            return await reply("❌ Reply audio/video yang ingin dicari judulnya!");
        }

        const buffer = fileBuffer || (await m.quoted.download());
        if (!buffer) {
            return await reply("❌ Gagal mengunduh media!");
        }

        await reply("🔍 Mencari judul lagu...");

        const upload = (await import("../lib/upload.js")).default;
        const audioUrl = await upload(buffer);
        
        if (!audioUrl) {
            return await reply("❌ Gagal mengupload audio!");
        }

        const { data } = await axios.get("https://api.deline.my.id/tools/whatmusic", {
            params: { url: audioUrl }
        });

        if (!data.status || !data.result) {
            return await reply("❌ Lagu tidak ditemukan!");
        }

        const { title, artists } = data.result;
        const response = `🎵 *MUSIC FINDER*\n\n` +
                        `📝 Judul: ${title}\n` +
                        `🎤 Artist: ${artists}`;

        await reply(response);
    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
};