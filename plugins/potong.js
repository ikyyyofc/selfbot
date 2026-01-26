import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";

export default {
    name: "cutvideo",
    description: "Potong video panjang jadi part 60 detik",
    cmd: ["cutvideo", "potongvideo", "splitvideo"],
    run: async ({ sock, m, getFile, chat }) => {
        if (!m.quoted && !m.isMedia) return m.reply("Mana videonya kocak? Reply atau kirim video dong.");
        
        const type = m.quoted ? m.quoted.mimetype : m.msg.mimetype;
        if (!type || !type.includes("video")) return m.reply("Itu bukan video, bjir.");

        await m.reply("⏳ Otw potongin videonya, sabar yak...");

        const buffer = await getFile();
        if (!buffer) return m.reply("Gagal download videonya, coba lagi.");

        const tempInput = path.join(tmpdir(), `input_${Date.now()}.mp4`);
        fs.writeFileSync(tempInput, buffer);

        const getDuration = (filePath) => {
            return new Promise((resolve, reject) => {
                ffmpeg.ffprobe(filePath, (err, metadata) => {
                    if (err) reject(err);
                    else resolve(metadata.format.duration);
                });
            });
        };

        try {
            const duration = await getDuration(tempInput);
            const partDuration = 60; 
            const totalParts = Math.ceil(duration / partDuration);

            if (totalParts <= 1) {
                fs.unlinkSync(tempInput);
                return m.reply("Videonya kurang dari 60 detik, ngapain dipotong? 🗿");
            }

            await m.reply(`✂️ Video durasi ${Math.floor(duration)}s bakal dibagi jadi ${totalParts} part.`);

            for (let i = 0; i < totalParts; i++) {
                const tempOutput = path.join(tmpdir(), `output_${Date.now()}_part${i + 1}.mp4`);
                
                await new Promise((resolve, reject) => {
                    ffmpeg(tempInput)
                        .setStartTime(i * partDuration)
                        .setDuration(partDuration)
                        .output(tempOutput)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });

                await sock.sendMessage(chat, { 
                    video: { url: tempOutput }, 
                    caption: `Part ${i + 1}/${totalParts} ✅` 
                }, { quoted: m });

                fs.unlinkSync(tempOutput);
            }

            fs.unlinkSync(tempInput);
            m.reply("Done semua wir! 😎");

        } catch (e) {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            console.error(e);
            m.reply("Yah error pas motong video. Cek console deh.");
        }
    }
};