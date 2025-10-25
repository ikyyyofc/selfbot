import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

export default async ({ sock, m, reply }) => {
    try {
        // Cek kalo user udah reply ke stiker atau belum
        if (!m.quoted) {
            return await reply('Reply ke stiker gerak yang mau dijadiin video, ya.');
        }

        // Pastiin yang di-reply itu stiker gerak
        const isAnimatedSticker = m.quoted.type === 'stickerMessage' && m.quoted.msg.isAnimated;
        if (!isAnimatedSticker) {
            return await reply('Ini bukan stiker gerak, coba yang lain.');
        }

        // Download stikernya
        const stickerBuffer = await m.quoted.download();
        if (!stickerBuffer) {
            throw new Error('Gagal download stikernya, coba lagi nanti.');
        }

        // Bikin stream dari buffer stiker
        const inputStream = new Readable();
        inputStream.push(stickerBuffer);
        inputStream.push(null);

        // Proses konversi pake ffmpeg
        const videoBuffer = await new Promise((resolve, reject) => {
            const stream = ffmpeg(inputStream)
                .inputFormat('webp')
                .outputOptions('-pix_fmt yuv420p') // Biar kompatibel di banyak perangkat
                .toFormat('mp4')
                .on('error', (err) => {
                    console.error('FFmpeg Error:', err.message);
                    reject(new Error('Gagal konversi videonya. Mungkin stikernya corrupt.'));
                })
                .pipe();

            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });

        // Kirim hasilnya
        await sock.sendMessage(m.chat, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: 'Nih, videonya udah jadi! ✨'
        }, {
            quoted: m
        });

    } catch (error) {
        console.error('Error di plugin tovid:', error);
        await reply(`Waduh, error nih: ${error.message}`);
    }
};