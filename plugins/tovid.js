import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

export default async ({ sock, m, reply }) => {
    if (!m.quoted || !m.quoted.message?.stickerMessage) {
        return reply('Reply stiker gerak yang mau dijadiin video, bro.');
    }
    
    if (!m.quoted.message.stickerMessage.isAnimated) {
        return reply('Stikernya ga gerak, gimana mau dijadiin video? -_-');
    }

    await m.react('🔄');
    
    const stickerBuffer = await m.quoted.download();
    if (!stickerBuffer) {
        return reply('Gagal download stikernya, coba lagi deh.');
    }

    const inputStream = new Readable();
    inputStream.push(stickerBuffer);
    inputStream.push(null);

    const stream = ffmpeg(inputStream)
        .format('mp4')
        .on('error', (err) => {
            console.error('FFmpeg Error:', err);
            reply('Waduh, error pas konversi. Kayaknya ada yg salah.');
        });
        
    await sock.sendMessage(m.chat, { 
        video: stream, 
        caption: 'Nih, stikernya udah jadi video.',
        mimetype: 'video/mp4'
    }, { quoted: m });
    
    await m.react('');
};