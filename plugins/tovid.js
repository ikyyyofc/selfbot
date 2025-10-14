import fs from "fs"
import { exec } from "child_process"
import { tmpdir } from "os"
import path from "path"

export default async function ({ sock, from, m, fileBuffer, reply }) {
  try {
    if (!fileBuffer) return reply("⚠️ Reply stiker bergerak yang mau diubah jadi video!")

    // buat path sementara
    const inputPath = path.join(tmpdir(), `sticker_${Date.now()}.webp`)
    const outputPath = path.join(tmpdir(), `sticker_${Date.now()}.mp4`)

    // simpan buffer ke file
    fs.writeFileSync(inputPath, fileBuffer)

    // cek apakah stiker animasi (ada multiple frame)
    const frameCount = await new Promise((resolve, reject) => {
      exec(`ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "${inputPath}"`, (err, stdout) => {
        if (err) return reject(err)
        resolve(parseInt(stdout.trim() || "0"))
      })
    })

    if (frameCount <= 1) {
      fs.unlinkSync(inputPath)
      return reply("❌ Stiker ini bukan stiker animasi (tidak bergerak).")
    }

    // ubah ke video
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -y -i "${inputPath}" -movflags faststart -pix_fmt yuv420p "${outputPath}"`, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    // kirim hasil video
    const videoBuffer = fs.readFileSync(outputPath)
    await sock.sendMessage(from, { video: videoBuffer }, { quoted: m })

    // hapus file sementara
    fs.unlinkSync(inputPath)
    fs.unlinkSync(outputPath)
  } catch (e) {
    console.error(e)
    reply("❌ Terjadi kesalahan saat mengubah stiker jadi video.")
  }
}