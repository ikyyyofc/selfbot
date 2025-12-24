import { spawn } from "child_process";
import sharp from "sharp";
import { unlink, mkdir, rm, readFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

/**
 * Menjalankan FFmpeg dengan argumen yang diberikan.
 * @param {string[]} args - Argumen untuk FFmpeg.
 * @param {Buffer} [stdinBuffer] - Buffer untuk di-pipe ke stdin FFmpeg.
 * @returns {Promise<void>}
 */
function runFFmpeg(args, stdinBuffer) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", args);
        let stderr = "";

        ffmpeg.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        ffmpeg.on("close", (code) => {
            if (code !== 0) {
                return reject(
                    new Error(`ffmpeg exited with code ${code}\n${stderr}`)
                );
            }
            resolve();
        });

        ffmpeg.on("error", (err) => {
            reject(err);
        });

        if (stdinBuffer) {
            try {
                ffmpeg.stdin.write(stdinBuffer);
            } catch (e) {
                // abaikan error kalo stdin udah ditutup
            } finally {
                ffmpeg.stdin.end();
            }
        }
    });
}

export default {
    command: ["tovideo", "tovidio", "tovid"],
    description: "convert sticker atau audio jadi video",
    rules: {
        limit: true,
    },
    execute: async ({ sock, m }) => {
        if (!m.quoted) {
            return m.reply(
                "❌ bales stiker atau audio yang mau dijadiin video"
            );
        }

        await m.react("⏳");

        const mime = m.quoted.msg?.mimetype || "";
        if (!/webp|audio/.test(mime)) {
            await m.react("❌");
            return m.reply("❌ bales stiker atau audio aja");
        }

        const tmpDir = "./tmp";
        await mkdir(tmpDir, { recursive: true });

        const media = await m.quoted.download();
        let out = Buffer.alloc(0);
        const randomName = randomBytes(8).toString("hex");

        try {
            if (/webp/.test(mime)) {
                const metadata = await sharp(media, { animated: true }).metadata();
                const isAnimated = (metadata.pages || 1) > 1;

                if (isAnimated) {
                    const frameDir = path.join(tmpDir, `frames-${randomName}`);
                    await mkdir(frameDir, { recursive: true });
                    const outputFile = path.join(tmpDir, `${randomName}.mp4`);

                    const frameCount = metadata.pages || 1;
                    const delay = metadata.delay || [];
                    const avgDelay =
                        delay.length > 0
                            ? delay.reduce((a, b) => a + b, 0) / delay.length
                            : 40;
                    const fps = Math.min(Math.round(1000 / avgDelay), 25);

                    for (let i = 0; i < frameCount; i++) {
                        const framePath = path.join(
                            frameDir,
                            `frame_${i.toString().padStart(4, "0")}.png`
                        );
                        await sharp(media, { page: i })
                            .resize(512, 512, {
                                fit: "contain",
                                background: { r: 255, g: 255, b: 255, alpha: 1 },
                            })
                            .png()
                            .toFile(framePath);
                    }

                    const ffmpegArgs = [
                        "-framerate", fps.toString(),
                        "-i", path.join(frameDir, "frame_%04d.png"),
                        "-f", "lavfi",
                        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                        "-c:v", "libx264",
                        "-preset", "ultrafast",
                        "-c:a", "aac",
                        "-b:a", "128k",
                        "-pix_fmt", "yuv420p",
                        "-shortest",
                        "-movflags", "+faststart",
                        "-y", outputFile,
                    ];

                    await runFFmpeg(ffmpegArgs);
                    out = await readFile(outputFile);

                    await rm(frameDir, { recursive: true, force: true });
                    await unlink(outputFile);
                } else {
                    const outputFile = path.join(tmpDir, `${randomName}.mp4`);
                    const pngBuffer = await sharp(media)
                        .resize(512, 512, {
                            fit: "contain",
                            background: { r: 255, g: 255, b: 255, alpha: 1 },
                        })
                        .png()
                        .toBuffer();

                    const ffmpegArgs = [
                        "-loop", "1",
                        "-framerate", "1",
                        "-i", "pipe:0",
                        "-f", "lavfi",
                        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                        "-c:v", "libx264",
                        "-c:a", "aac",
                        "-b:a", "128k",
                        "-pix_fmt", "yuv420p",
                        "-t", "5",
                        "-shortest",
                        "-movflags", "+faststart",
                        "-y", outputFile,
                    ];

                    await runFFmpeg(ffmpegArgs, pngBuffer);
                    out = await readFile(outputFile);
                    await unlink(outputFile);
                }
            } else if (/audio/.test(mime)) {
                const outputFile = path.join(tmpDir, `${randomName}.mp4`);
                const ffmpegArgs = [
                    "-f", "lavfi",
                    "-i", "color=c=black:s=640x480:r=25",
                    "-i", "pipe:0",
                    "-c:v", "libx264",
                    "-tune", "stillimage",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-pix_fmt", "yuv420p",
                    "-shortest",
                    "-movflags", "+faststart",
                    "-y", outputFile,
                ];

                await runFFmpeg(ffmpegArgs, media);
                out = await readFile(outputFile);
                await unlink(outputFile);
            }

            if (out.length === 0) {
                throw new Error("gagal buat video, hasilnya kosong");
            }

            await sock.sendMessage(
                m.chat,
                {
                    video: out,
                    mimetype: "video/mp4",
                    caption: "nih udah jadi",
                },
                { quoted: m }
            );

            await m.react("✅");
        } catch (e) {
            console.error(e);
            await m.react("❌");
            await m.reply(`gagal konversi: ${e.message}`);
        }
    },
};