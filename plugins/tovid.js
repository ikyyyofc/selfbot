import axios from "axios"
import * as cheerio from "cheerio"
import fs from "fs"
import { downloadMediaMessage } from "@whiskeysockets/baileys"
import upload from "../lib/upload.js"

async function converter(url) {
  const res = await axios("https://ezgif.com/webp-to-mp4?url=" + url)
  const $ = cheerio.load(res.data)
  const file = $('input[name="file"]').attr("value")
  const data = { file: file, convert: "Convert WebP to MP4!" }
  const res2 = await axios({
    method: "post",
    url: "https://ezgif.com/webp-to-mp4/" + data.file,
    data: new URLSearchParams(Object.entries(data)),
  })
  const $2 = cheerio.load(res2.data)
  const link = $2("div#output > p.outfile > video > source").attr("src")
  return link ? "https:" + link : null
}

export default async function ({ sock, from, m, reply }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const sticker = quoted?.stickerMessage

    if (!sticker) return reply("❌ Reply ke stiker animasi!")
    if (!sticker.isAnimated) return reply("⚠️ Stiker ini bukan animasi!")

    const buffer = await downloadMediaMessage(
      { message: quoted },
      "buffer",
      {},
      { logger: Pino({ level: "silent" }), reuploadRequest: sock.updateMediaMessage }
    )

    const url = await upload(buffer)
    const videoLink = await converter(url)

    if (!videoLink) return reply("❌ Gagal mengonversi stiker ke video.")

    await sock.sendMessage(from, { video: { url: videoLink } })
  } catch (e) {
    console.error(e)
    reply("❌ Terjadi kesalahan saat mengonversi stiker.")
  }
}