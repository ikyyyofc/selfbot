import axios from "axios";

export default async ({ m, text, reply }) => {
    if (!text) {
        return await reply("Masukkin prompt dulu buat bikin video!\n\nContoh: .txt2vid gadis cantik berlari ke lapangan");
    }

    try {
        await reply("⏳ Lagi proses bikin video... tunggu bentar ya");

        const { data: initData } = await axios.get(
            `https://api-faa.my.id/faa/sora?prompt=${encodeURIComponent(text)}`
        );

        if (!initData.status || !initData.check_url) {
            return await reply("❌ Gagal inisiasi request ke API");
        }

        const checkUrl = initData.check_url;
        let processing = true;
        let attempts = 0;
        const maxAttempts = 120;

        while (processing && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 20000));

            const { data: statusData } = await axios.get(checkUrl);

            if (statusData.status && statusData.processing === false) {
                if (statusData.result?.download_url) {
                    const videoUrl = statusData.result.download_url;
                    
                    await m.reply({
                        video: { url: videoUrl },
                        caption: `✅ Video berhasil dibuat!\n\n📝 Prompt: ${text}\n🎬 Quality: ${statusData.result.quality || "HD"}\n📦 Format: ${statusData.result.format || "mp4"}`
                    });
                    
                    processing = false;
                    return;
                } else {
                    return await reply("❌ Video berhasil diproses tapi ga ada download link");
                }
            }

            attempts++;

            if (attempts % 12 === 0) {
                await reply(`⏳ Masih diproses... (${attempts * 20}s)`);
            }
        }

        if (attempts >= maxAttempts) {
            return await reply("❌ Timeout! Proses video kelamaan, coba lagi nanti");
        }

    } catch (error) {
        console.error("txt2vid error:", error);
        await reply(`❌ Error: ${error.message}`);
    }
};