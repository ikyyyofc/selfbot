// plugins/sticker.js
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export default async function ({ sock, from, m, fileBuffer, reply }) {
    try {
        if (!fileBuffer) {
            return reply('❌ Kirim atau reply ke gambar/video untuk dijadikan stiker!')
        }

        const sticker = new Sticker(fileBuffer, {
            pack: '',
            author: 'ikyyofc',
            type: StickerTypes.FULL, // bisa FULL, CROP, atau CIRCLE
            quality: 90
        })

        const buffer = await sticker.build()
        await sock.sendMessage(from, { sticker: buffer }, { quoted: m })

    } catch (e) {
        console.error(e)
        reply('⚠️ Terjadi kesalahan saat membuat stiker!')
    }
}