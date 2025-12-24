import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";

// helper buat ngejalanin command aneh aneh
const execAsync = (command, args) => {
    return new Promise((resolve, reject) => {
        let output = "";
        const proc = spawn(command, args);

        proc.stdout.on("data", (data) => {
            output += data.toString();
        });

        // uncomment baris dibawah kalo mau liat error dari ffmpeg
        // proc.stderr.on("data", (data) => {
        //     console.error(`[${command} stderr]: ${data}`);
        // });

        proc.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`buset ${command} error, kode: ${code}`));
            }
            resolve(output);
        });

        proc.on("error", (err) => {
            reject(err);
        });
    });
};

export default {
    // metadata plugin, ga wajib tapi bagus buat info
    rules: {
        name: "Video Compressor",
        description: "Kompres video biar sizenya lebih kecil",
        usage: ".kompres <reply video>",
        cooldown: 30, // 30 detik cooldown
    },

    execute: async (context) => {
        const { m, sock, text } = context;

        // cek ada video yg direply apa kaga
        if (!m.quoted || !m.quoted.isMedia)) {
            return m.reply("mana videonya anjg, reply video yg mau lu kompres pake command .kompres");
        }

        await m.react("⏳"); // react biar keliatan lagi proses

        const tempId = Date.now();
        const inputPath = join(tmpdir(), `input_${tempId}.mp4`);
        const outputPath = join(tmpdir(), `output_${tempId}.mp4`);

        try {
            await m.reply("oke sabar, lagi download video...");
            const media = await m.quoted.download();

            if (!media) {
                throw new Error("gagal download video, coba lagi ntar");
            }

            const originalSize = (media.length / 1024 / 1024).toFixed(2);
            await writeFile(inputPath, media);

            await m.reply("ngecek durasi video...");
            const durationOutput = await execAsync("ffprobe", [
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                inputPath
            ]);

            const duration = parseFloat(durationOutput.trim());
            if (isNaN(duration)) {
                throw new Error("kaga bisa dapet durasi video, videonya rusak kali");
            }

            // cek durasi, maksimal 90 detik
            if (duration > 90) {
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                throw new Error(`videonya kelamaan gblk! 😫\n\npanjang video: ${minutes}m ${seconds}s\nmaksimal: 1m 30s`);
            }

            await m.reply(`lagi ngompres video... (${originalSize} MB)`);
            
            // command ffmpeg buat kompres
            await execAsync("ffmpeg", [
                "-i", inputPath,
                "-c:v", "libx264",
                "-crf", "24",       // naikin dikit crf biar makin kecil sizenya
                "-preset", "medium",
                "-c:a", "aac",      // kompres audio juga ke aac
                "-b:a", "128k",
                "-y",
                outputPath
            ]);

            const compressedVideo = await readFile(outputPath);
            if (!compressedVideo.length) {
                throw new Error("hasil kompresnya kosong, aneh");
            }

            const newSize = (compressedVideo.length / 1024 / 1024).toFixed(2);
            
            await m.react("✅");

            const caption = text || `nih videonya udah enteng\nsize: ${originalSize} MB -> ${newSize} MB`;

            // kirim video hasil kompres
            await sock.sendMessage(m.chat, {
                video: compressedVideo,
                caption: caption,
                mimetype: "video/mp4"
            }, { quoted: m });

        } catch (e) {
            await m.react("❌");
            await m.reply(`gagal cok: ${e.message}`);
        } finally {
            // hapus file sementara biar ga numpuk
            await unlink(inputPath).catch(() => {});
            await unlink(outputPath).catch(() => {});
        }
    }
};