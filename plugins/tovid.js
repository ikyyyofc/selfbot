import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

export default async function({ m, reply, fileBuffer }) {
    let inputPath, outputPath;
    
    try {
        if (!m.quoted?.message?.stickerMessage && !m.message?.stickerMessage) {
            return await reply("❌ Reply atau kirim sticker animasi dulu dong");
        }
        
        let stickerBuffer;
        if (m.quoted?.message?.stickerMessage) {
            stickerBuffer = await m.quoted.download();
        } else {
            stickerBuffer = await m.download();
        }
        
        if (!stickerBuffer) {
            return await reply("❌ Gagal download sticker");
        }
        
        // Deteksi magic bytes untuk format file
        const header = stickerBuffer.slice(0, 12);
        let extension = '.webp';
        
        // Check magic bytes
        if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
            extension = '.webm'; // WebM/MKV
        } else if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') {
            extension = '.webp'; // WebP
        }
        
        const timestamp = Date.now();
        inputPath = path.join("temp", `sticker_${timestamp}${extension}`);
        outputPath = path.join("temp", `video_${timestamp}.mp4`);
        
        if (!fs.existsSync("temp")) {
            fs.mkdirSync("temp", { recursive: true });
        }
        
        fs.writeFileSync(inputPath, stickerBuffer);
        
        await reply("⏳ Converting sticker to video...");
        
        await new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
                .outputOptions([
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-preset', 'ultrafast',
                    '-t', '10',  // Max 10 detik
                    '-r', '30'   // 30 fps
                ])
                .format('mp4')
                .output(outputPath)
                .on('start', (cmd) => {
                    console.log('FFmpeg command:', cmd);
                })
                .on('progress', (progress) => {
                    console.log('Processing:', progress.percent + '% done');
                })
                .on('end', () => {
                    console.log('Conversion finished');
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    console.error('FFmpeg Error:', err.message);
                    console.error('stderr:', stderr);
                    reject(err);
                });
            
            command.run();
        });
        
        // Check if output file exists and has content
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            throw new Error('Output file not created or is empty');
        }
        
        const videoBuffer = fs.readFileSync(outputPath);
        
        await m.reply({
            video: videoBuffer,
            caption: "✅ Sticker berhasil diubah jadi video!",
            mimetype: 'video/mp4'
        });
        
    } catch (error) {
        console.error('Main error:', error);
        await reply(`❌ Error: ${error.message}\n\nPastikan ini sticker animasi ya!`);
    } finally {
        // Cleanup files
        try {
            if (inputPath && fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }
            if (outputPath && fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }
    }
}