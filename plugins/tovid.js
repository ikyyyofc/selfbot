import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";

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

        if (isAnimated) {
            // Upload ke service converter online
            const formData = new (await import("form-data")).default();
            formData.append("file", fileBuffer, { filename: "sticker.webp" });

            const response = await fetch("https://api.ezgif.com/webp-to-mp4", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error("Gagal upload ke converter");
            }

            const result = await response.json();
            
            if (!result.file) {
                throw new Error("Format stiker tidak didukung");
            }

            // Convert menggunakan API
            const convertResponse = await fetch("https://api.ezgif.com/webp-to-mp4/" + result.file, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const convertResult = await convertResponse.json();
            
            if (!convertResult.url) {
                throw new Error("Gagal konversi stiker");
            }

            // Download hasil
            const videoResponse = await fetch(convertResult.url);
            const videoBuffer = await videoResponse.buffer();

            await reply({
                video: videoBuffer,
                caption: "✅ Stiker animasi berhasil diubah menjadi video"
            });

        } else {
            // Stiker statis langsung convert dengan ffmpeg
            const tempInput = join(tmpdir(), `sticker_${timestamp}.webp`);
            const tempOutput = join(tmpdir(), `converted_${timestamp}.png`);
            
            await writeFile(tempInput, fileBuffer);
            await execPromise(`ffmpeg -i "${tempInput}" "${tempOutput}"`);
            
            const convertedBuffer = await readFile(tempOutput);

            await reply({
                image: convertedBuffer,
                caption: "✅ Stiker berhasil diubah menjadi gambar"
            });

            await unlink(tempInput).catch(() => {});
            await unlink(tempOutput).catch(() => {});
        }

    } catch (error) {
        console.error("Error converting sticker:", error);
        await reply(`❌ Gagal mengubah stiker: ${error.message}`);
    }
}