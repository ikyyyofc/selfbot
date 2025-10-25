import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

export default async function({ m, reply, fileBuffer }) {
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
        
        // Gunakan extension .webm untuk animated sticker
        const inputPath = path.join("temp", `sticker_${Date.now()}.webm`);
        const outputPath = path.join("temp", `video_${Date.now()}.mp4`);
        
        if (!fs.existsSync("temp")) {
            fs.mkdirSync("temp", { recursive: true });
        }
        
        fs.writeFileSync(inputPath, stickerBuffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .inputFormat('webm')  // Specify input format
                .videoCodec('libx264')
                .outputOptions([
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
                    '-pix_fmt', 'yuv420p',
                    '-preset', 'fast',
                    '-crf', '23',
                    '-movflags', '+faststart'
                ])
                .fps(30)
                .duration(10)
                .output(outputPath)
                .on('start', (cmd) => {
                    console.log('FFmpeg command:', cmd);
                })
                .on('end', resolve)
                .on('error', (err, stdout, stderr) => {
                    console.error('FFmpeg Error:', err.message);
                    console.error('FFmpeg stderr:', stderr);
                    reject(err);
                })
                .run();
        });
        
        const videoBuffer = fs.readFileSync(outputPath);
        
        await m.reply({
            video: videoBuffer,
            caption: "✅ Sticker berhasil diubah jadi video!"
        });
        
        // Cleanup
        try {
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }
        
    } catch (error) {
        console.error('Main error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
}