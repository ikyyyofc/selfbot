import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export default {
    command: 'addsong',
    description: 'Menambahkan audio ke gambar dan menjadikannya video.',
    rules: {
        limit: 5, // Perlu 5 limit untuk make command ini
        group: true,
        private: true
    },

    async execute(context) {
        const { m, reply } = context;

        let imageBuffer, audioBuffer;
        const isImageInQuoted = m.quoted?.isMedia && m.quoted.type === 'imageMessage';
        const isAudioInQuoted = m.quoted?.isMedia && m.quoted.type === 'audioMessage';
        const isImageInCurrent = m.isMedia && m.type === 'imageMessage';
        const isAudioInCurrent = m.isMedia && (m.type === 'audioMessage' || m.type === 'documentMessage');

        try {
            if (isImageInQuoted && isAudioInCurrent) {
                await reply('⏳ Siap, lagi diproses...');
                imageBuffer = await m.quoted.download();
                audioBuffer = await m.download();
            } else if (isAudioInQuoted && isImageInCurrent) {
                await reply('⏳ Siap, lagi diproses...');
                audioBuffer = await m.quoted.download();
                imageBuffer = await m.download();
            } else {
                return await reply('❌ Gagal. Reply gambar dengan audio/vn, atau sebaliknya. Pastikan pake caption .addsong');
            }

            if (!imageBuffer || !audioBuffer) {
                return await reply('❌ Media tidak valid atau gagal diunduh.');
            }
        } catch (error) {
            console.error(error);
            return await reply(`❌ Error saat mengunduh media: ${error.message}`);
        }

        const tempDir = './temp';
        await fs.mkdir(tempDir, { recursive: true });

        const uniqueId = crypto.randomBytes(8).toString('hex');
        const imagePath = path.join(tempDir, `${uniqueId}.jpg`);
        const audioPath = path.join(tempDir, `${uniqueId}.mp3`);
        const outputPath = path.join(tempDir, `${uniqueId}.mp4`);

        try {
            await fs.writeFile(imagePath, imageBuffer);
            await fs.writeFile(audioPath, audioBuffer);

            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(imagePath)
                    .loop()
                    .input(audioPath)
                    .audioCodec('aac')
                    .audioBitrate('192k')
                    .videoCodec('libx264')
                    .outputOptions([
                        '-preset veryfast',
                        '-tune stillimage',
                        '-pix_fmt yuv420p',
                        '-shortest'
                    ])
                    .on('end', resolve)
                    .on('error', reject)
                    .save(outputPath);
            });

            await reply({
                video: { url: outputPath },
                caption: '✅ Dah jadi, nih videonya!'
            });

        } catch (error) {
            console.error('FFmpeg Error:', error);
            await reply(`❌ Gagal bikin video. Pastiin medianya ga rusak.\n\nError: ${error.message}`);
        } finally {
            await fs.unlink(imagePath).catch(() => {});
            await fs.unlink(audioPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
        }
    }
};