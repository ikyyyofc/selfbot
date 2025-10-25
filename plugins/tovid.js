import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";

const execAsync = promisify(exec);

export default async ({ m, reply, fileBuffer }) => {
    try {
        if (!m.quoted || !m.quoted.isMedia) {
            return await reply("❌ Reply sticker animasi yang mau diubah jadi video!");
        }

        const quotedType = Object.keys(m.quoted.message)[0];
        if (quotedType !== "stickerMessage") {
            return await reply("❌ Yang di-reply harus sticker!");
        }

        await reply("🔄 Converting animated sticker to video...");

        const buffer = await m.quoted.download();
        if (!buffer) {
            return await reply("❌ Gagal download sticker!");
        }

        const type = await fileTypeFromBuffer(buffer);
        if (!type || type.mime !== "image/webp") {
            return await reply("❌ Format sticker ga valid!");
        }

        const tempDir = "./temp";
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const inputFile = path.join(tempDir, `sticker_${Date.now()}.webp`);
        const outputFile = path.join(tempDir, `video_${Date.now()}.mp4`);

        fs.writeFileSync(inputFile, buffer);

        try {
            await execAsync(`ffmpeg -i "${inputFile}" -vcodec libx264 -pix_fmt yuv420p -movflags +faststart "${outputFile}"`);
        } catch (ffmpegError) {
            fs.unlinkSync(inputFile);
            return await reply("❌ Sticker ini ga bisa diconvert! Mungkin bukan animated sticker.");
        }

        if (!fs.existsSync(outputFile)) {
            fs.unlinkSync(inputFile);
            return await reply("❌ Gagal convert sticker!");
        }

        const videoBuffer = fs.readFileSync(outputFile);
        
        await m.reply({
            video: videoBuffer,
            caption: "✅ Sticker berhasil diubah jadi video!"
        });

        fs.unlinkSync(inputFile);
        fs.unlinkSync(outputFile);

    } catch (error) {
        console.error("Error in sticker to video:", error);
        await reply(`❌ Error: ${error.message}`);
    }
};