import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execPromise = promisify(exec);

export default async function ({ m, fileBuffer, reply }) {
    try {
        if (!fileBuffer) {
            return await reply("Reply stiker yang ingin diubah menjadi media!");
        }

        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg?.stickerMessage) {
            return await reply("Pesan yang di-reply bukan stiker!");
        }

        const isAnimated = quotedMsg.stickerMessage.isAnimated;
        const timestamp = Date.now();
        const tempInput = join(tmpdir(), `sticker_${timestamp}.webp`);

        await writeFile(tempInput, fileBuffer);

        if (isAnimated) {
            // Convert animated webp to gif first, then to mp4
            const tempGif = join(tmpdir(), `temp_${timestamp}.gif`);
            const tempOutput = join(tmpdir(), `converted_${timestamp}.mp4`);

            try {
                // WebP to GIF (more compatible)
                await execPromise(`ffmpeg -i "${tempInput}" "${tempGif}"`);
                
                // GIF to MP4
                await execPromise(`ffmpeg -i "${tempGif}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${tempOutput}"`);
                
                const convertedBuffer = await readFile(tempOutput);
                
                await reply({
                    video: convertedBuffer,
                    caption: "✅ Stiker animasi berhasil diubah menjadi video"
                });

                await unlink(tempGif).catch(() => {});
                await unlink(tempOutput).catch(() => {});
            } catch (err) {
                throw new Error("Gagal convert animated sticker: " + err.message);
            }
        } else {
            const tempOutput = join(tmpdir(), `converted_${timestamp}.png`);
            
            await execPromise(`ffmpeg -i "${tempInput}" "${tempOutput}"`);
            
            const convertedBuffer = await readFile(tempOutput);

            await reply({
                image: convertedBuffer,
                caption: "✅ Stiker berhasil diubah menjadi gambar"
            });

            await unlink(tempOutput).catch(() => {});
        }

        await unlink(tempInput).catch(() => {});

    } catch (error) {
        console.error("Error converting sticker:", error);
        await reply(`❌ Gagal mengubah stiker: ${error.message}`);
    }
}