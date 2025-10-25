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
        
        const inputPath = path.join("temp", `sticker_${Date.now()}.webp`);
        const outputPath = path.join("temp", `video_${Date.now()}.mp4`);
        
        if (!fs.existsSync("temp")) {
            fs.mkdirSync("temp", { recursive: true });
        }
        
        fs.writeFileSync(inputPath, stickerBuffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    "-vf", "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-r", "30"
                ])
                .duration(10)
                .output(outputPath)
                .on("end", resolve)
                .on("error", reject)
                .run();
        });
        
        const videoBuffer = fs.readFileSync(outputPath);
        
        await m.reply({
            video: videoBuffer,
            caption: "✅ Sticker berhasil diubah jadi video!"
        });
        
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        
    } catch (error) {
        await reply(`❌ Error: ${error.message}`);
    }
}