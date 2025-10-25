import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

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
        
        const timestamp = Date.now();
        inputPath = path.join("temp", `sticker_${timestamp}`);
        outputPath = path.join("temp", `video_${timestamp}.mp4`);
        
        if (!fs.existsSync("temp")) {
            fs.mkdirSync("temp", { recursive: true });
        }
        
        fs.writeFileSync(inputPath, stickerBuffer);
        
        await reply("⏳ Converting sticker...");
        
        // Method 1: Direct ffmpeg command (lebih reliable)
        const ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p -t 10 -r 30 -y "${outputPath}"`;
        
        try {
            await execPromise(ffmpegCmd);
        } catch (cmdError) {
            console.error('Command execution error:', cmdError);
            throw new Error('Failed to convert sticker. Make sure it\'s an animated sticker!');
        }
        
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            throw new Error('Conversion failed - output is empty. Sticker mungkin bukan animasi!');
        }
        
        const videoBuffer = fs.readFileSync(outputPath);
        
        await m.reply({
            video: videoBuffer,
            caption: "✅ Sticker berhasil diubah jadi video!",
            mimetype: 'video/mp4'
        });
        
    } catch (error) {
        console.error('Error:', error);
        await reply(`❌ Error: ${error.message}`);
    } finally {
        try {
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (e) {}
    }
}