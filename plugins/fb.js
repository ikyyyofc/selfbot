import axios from "axios";

export default {
    desc: "Download video dari Facebook",
    rules: {
        limit: 1
    },
    
    async execute({ args, reply, m }) {
        const url = args[0];
        
        if (!url) {
            return await reply("❌ Masukkan URL Facebook!\n\nContoh: .fb https://www.facebook.com/...");
        }
        
        if (!url.includes("facebook.com") && !url.includes("fb.watch")) {
            return await reply("❌ URL tidak valid! Harus dari Facebook.");
        }
        
        await m.react("🔄");
        
        try {
            const apiUrl = `https://wudysoft.xyz/api/download/facebook/v3?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl);
            
            if (!data.hdLink && !data.sdLink) {
                await m.react("❌");
                return await reply("❌ Gagal mengambil video. Pastikan URL valid dan video bisa diakses publik.");
            }
            
            const videoUrl = data.hdLink || data.sdLink;
            const quality = data.hdLink ? "HD" : "SD";
            const title = data.title || "Facebook Video";
            const desc = data.description || "";
            
            const caption = `✅ *${title}*\n\n${desc}\n\n📹 Kualitas: ${quality}`;
            
            await sock.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption,
                mimetype: "video/mp4"
            }, { quoted: m });
            
            await m.react("✅");
            
        } catch (error) {
            await m.react("❌");
            
            if (error.response?.status === 404) {
                return await reply("❌ Video tidak ditemukan. Pastikan URL valid.");
            }
            
            return await reply(`❌ Error: ${error.message}`);
        }
    }
};