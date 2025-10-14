import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

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
        const tempInput = join(tmpdir(), `sticker_${Date.now()}.webp`);
        const tempOutput = join(tmpdir(), `converted_${Date.now()}.${isAnimated ? "mp4" : "png"}`);

        await writeFile(tempInput, fileBuffer);

        if (isAnimated) {
            await execPromise(`ffmpeg -i "${tempInput}" -c:v libx264 -pix_fmt yuv420p "${tempOutput}"`);
        } else {
            await execPromise(`ffmpeg -i "${tempInput}" "${tempOutput}"`);
        }

        const { readFile } = await import("fs/promises");
        const convertedBuffer = await readFile(tempOutput);

        await reply({
            [isAnimated ? "video" : "image"]: convertedBuffer,
            caption: "✅ Stiker berhasil diubah menjadi media"
        });

        await unlink(tempInput).catch(() => {});
        await unlink(tempOutput).catch(() => {});

    } catch (error) {
        await reply("❌ Gagal mengubah stiker. Pastikan reply stiker yang valid!");
    }
}