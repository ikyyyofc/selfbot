import axios from "axios";

export default async ({ sock, m, reply }) => {
    const text = m.text || m.quoted?.text || "";
    
    const igRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv|stories)\/([A-Za-z0-9_-]+)/i;
    const match = text.match(igRegex);
    
    if (!match) return;
    
    const url = match[0];
    
    await m.react("⏳");
    
    try {
        const apiUrl = `https://api.nekolabs.web.id/downloader/instagram?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl);
        
        if (!data.success || !data.result?.url?.length) {
            await reply("❌ Gagal download, link mungkin private atau ga valid");
            await m.react("❌");
            return;
        }
        
        const urls = data.result.url;
        const totalMedia = urls.length;
        
        await reply(`📥 Ngedownload ${totalMedia} media...\n\n⏳ Tunggu ya, lagi diproses`);
        
        for (let i = 0; i < urls.length; i++) {
            try {
                const mediaUrl = urls[i];
                const { data: buffer } = await axios.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                });
                
                const isVideo = mediaUrl.toLowerCase().includes('.mp4') || 
                               mediaUrl.toLowerCase().includes('video');
                
                const caption = totalMedia > 1 
                    ? `📸 Media ${i + 1}/${totalMedia}` 
                    : "📸 Instagram Download";
                
                if (isVideo) {
                    await sock.sendMessage(m.chat, {
                        video: Buffer.from(buffer),
                        caption
                    });
                } else {
                    await sock.sendMessage(m.chat, {
                        image: Buffer.from(buffer),
                        caption
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (err) {
                console.error(`Error sending media ${i + 1}:`, err.message);
            }
        }
        
        await m.react("✅");
        
    } catch (error) {
        console.error("IG Download error:", error.message);
        await reply(`❌ Error: ${error.message}`);
        await m.react("❌");
    }
};