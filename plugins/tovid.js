import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import ffmpeg from "fluent-ffmpeg";

const CACHE = "./.cache"; // Simpel cache directory

export default async ({ m, fileBuffer, reply }) => {
    try {
        let buffer = fileBuffer;
        if (!buffer) return reply("Reply/attach stiker dulu ya 🫨");

        const type = await fileTypeFromBuffer(buffer);
        if (type?.mime !== "image/webp") return reply("Itu bukan stiker/webp 🙄");

        if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE);

        const id = Date.now() + "" + Math.floor(Math.random() * 9999);
        const srcPath = path.join(CACHE, `${id}.webp`);
        const outPath = path.join(CACHE, `${id}.mp4`);
        
        fs.writeFileSync(srcPath, buffer);

        await new Promise((resolve, reject) => {
            ffmpeg(srcPath)
                .inputFormat("webp")
                .outputOptions(["-movflags +faststart", "-pix_fmt yuv420p", "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2"])
                .toFormat("mp4")
                .on("error", err => reject("FFmpeg error: " + err.message))
                .on("end", () => resolve())
                .save(outPath);
        });

        const output = fs.readFileSync(outPath);
        await m.reply({ video: output, mimetype: "video/mp4", caption: "⏩ done!" });

        fs.unlinkSync(srcPath);
        fs.unlinkSync(outPath);
    } catch (e) {
        return reply("Failed convert stiker! " + e);
    }
};