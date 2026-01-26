import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { promisify } from "util";

const getDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
};

const splitChunk = (inputPath, start, duration, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration)
            .outputOptions(["-c copy", "-map 0"])
            .save(outputPath)
            .on("end", () => resolve(outputPath))
            .on("error", (err) => reject(err));
    });
};

export default {
    name: "splitvideo",
    aliases: ["potongvideo", "split"],
    description: "Potong video jadi per 60 detik otomatis",
    execute: async ({ m, sock, getFile, reply }) => {
        const quoted = m.quoted ? m.quoted : m;
        if (!quoted.isMedia || !quoted.type.includes("video")) {
            return reply("❌ Kirim atau reply video yang mau dipotong cuy.");
        }

        await reply("⏳ Chill, lagi diproses nih...");

        const buffer = await getFile();
        if (!buffer) return reply("❌ Gagal download videonya.");

        const tempDir = "./temp_split";
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
        fs.writeFileSync(inputPath, buffer);

        try {
            const totalDuration = await getDuration(inputPath);
            const chunkDuration = 60; 
            const totalChunks = Math.ceil(totalDuration / chunkDuration);

            if (totalChunks <= 1) {
                fs.unlinkSync(inputPath);
                return reply("⚠️ Videonya kurang dari 60 detik, ngapain dipotong kocak.");
            }

            for (let i = 0; i < totalChunks; i++) {
                const startTime = i * chunkDuration;
                const outputPath = path.join(tempDir, `chunk_${Date.now()}_${i}.mp4`);

                await splitChunk(inputPath, startTime, chunkDuration, outputPath);

                await sock.sendMessage(m.chat, {
                    video: fs.readFileSync(outputPath),
                    caption: `✂️ Part ${i + 1}/${totalChunks}`,
                    mimetype: "video/mp4"
                }, { quoted: m });

                fs.unlinkSync(outputPath);
            }

            fs.unlinkSync(inputPath);
            
        } catch (e) {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            console.error(e);
            reply(`❌ Error pas motong video: ${e.message}`);
        }
    }
};