import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

/**
 * @param {import('../lib/MessageHandler').Context} context
 */
export default async ({ sock, m, reply }) => {
    const tempDir = 'tmp';
    const randomId = Date.now();
    const webpPath = path.join(tempDir, `${randomId}.webp`);
    const mp4Path = path.join(tempDir, `${randomId}.mp4`);

    try {
        const quotedMessage = m.quoted?.message;
        if (!quotedMessage?.stickerMessage) {
            await reply('Woi, reply stiker geraknya dong.');
            return;
        }

        if (!quotedMessage.stickerMessage.isAnimated) {
            await reply('Ini stiker biasa, bukan yang gerak. Gabisa.');
            return;
        }

        const stickerBuffer = await m.quoted.download();
        if (!stickerBuffer) {
            await reply('Gagal download stikernya, coba lagi ntar.');
            return;
        }

        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(webpPath, stickerBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(webpPath)
                .outputOptions([
                    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                    "-pix_fmt", "yuv420p"
                ])
                .toFormat('mp4')
                .save(mp4Path)
                .on('end', resolve)
                .on('error', reject);
        });

        const videoBuffer = await fs.readFile(mp4Path);

        await sock.sendMessage(m.chat, {
            video: videoBuffer,
            caption: 'Nih, jadi video.'
        }, { quoted: m });

    } catch (error) {
        console.error('Error in tovideo plugin:', error);
        await reply(`Anjir, error: ${error.message}`);
    } finally {
        try {
            await fs.unlink(webpPath);
            await fs.unlink(mp4Path);
        } catch (cleanupError) {
            console.error('Gagal hapus file temporary:', cleanupError.message);
        }
    }
};