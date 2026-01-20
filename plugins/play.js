import yts from 'yt-search'
import axios from 'axios'

export default {
    rules: {
        group: false,
        admin: false
    },
    execute: async ({ sock, m, text }) => {
        if (!text) return m.reply('masukin judul lagunya apa tolol masa gwa disuruh nebak')
        
        try {
            const search = await yts(text)
            const list = search.videos
            if (!list || list.length === 0) return m.reply('ga ketemu anjir lu ngetik apaan dah bego bgt')
            
            const randomVid = list[Math.floor(Math.random() * list.length)]
            const url = randomVid.url

            const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v2?url=${encodeURIComponent(url)}`)
            
            if (!data.success || !data.result.medias) return m.reply('api nya mati atau error paling gara gara lu yg pake')

            const audio = data.result.medias.find(v => v.extension === 'm4a' || v.extension === 'mp3' || v.itag === 140) || data.result.medias.find(v => v.is_audio)
            
            if (!audio || !audio.url) return m.reply('ga dapet link audionya ampas bgt ni lagu')

            await sock.sendMessage(m.chat, {
                audio: { url: audio.url },
                mimetype: 'audio/mp4',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: data.result.title,
                        body: data.result.author,
                        thumbnailUrl: data.result.thumbnail,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (e) {
            console.log(e)
            m.reply('error tolol gausah spam tar jg bener sendiri')
        }
    }
}