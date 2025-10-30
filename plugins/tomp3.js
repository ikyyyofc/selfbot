import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import ffmpeg from "fluent-ffmpeg";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  desc: "mengubah video ke audio",
    rules: {
        limit: 1
    },
    async execute({ m, sock, fileBuffer, reply }) {
        if (!fileBuffer) {
            await reply(
                "Kirim/reply video yang mau dikonversi ke audio (MP3)!"
            );
            return;
        }

        const type = await fileTypeFromBuffer(fileBuffer);
        if (!type || !type.mime.startsWith("video/")) {
            await reply("File bukan video.");
            return;
        }

        const tmpDir = path.join(__dirname, "../tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

        const inPath = path.join(tmpDir, `${Date.now()}_in.${type.ext}`);
        const outPath = path.join(tmpDir, `${Date.now()}_out.mp3`);
        fs.writeFileSync(inPath, fileBuffer);

        await new Promise((res, rej) => {
            ffmpeg(inPath)
                .output(outPath)
                .audioCodec("libmp3lame")
                .format("mp3")
                .on("end", res)
                .on("error", rej)
                .run();
        }).catch(async e => {
            await reply("Gagal konversi: " + e.message);
        });

        const outBuffer = fs.readFileSync(outPath);

        await sock.sendMessage(
            m.chat,
            { audio: outBuffer, mimetype: "audio/mp4" },
            { quoted: m }
        );

        fs.unlinkSync(inPath);
        fs.unlinkSync(outPath);
        await m.react("✅");
    }
};
