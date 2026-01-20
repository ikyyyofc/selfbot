import axios from "axios"
import yts from "yt-search"

export default {
    execute: async ({ sock, m, text }) => {
        if (!text) return m.reply("mau denger lagu apa goblok tulis judulnya")
        try {
            let res = await yts(text)
            let vid = res.videos[Math.floor(Math.random() * res.videos.length)]
            if (!vid) return m.reply("kagak ketemu anjing ganti judul lain")
            let { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v5?url=${encodeURIComponent(vid.url)}`)
            if (!data.success) return m.reply("api nya lg ampas kek muka lu")
            let aud = data.result.adaptiveFormats.find(f => f.itag === 140)?.url || data.result.formats[0].url
            await sock.sendMessage(m.chat, {
                audio: { url: aud },
                mimetype: "audio/mp4",
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: data.result.title,
                        body: vid.author.name,
                        thumbnailUrl: vid.thumbnail,
                        sourceUrl: vid.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })
        } catch (e) {
            console.log(e)
            m.reply("error mampus lagian lu banyak gaya")
        }
    }
}