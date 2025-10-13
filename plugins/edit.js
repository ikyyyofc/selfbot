// plugins/ai-edit-image.js
// Plugin untuk edit gambar dengan AI (endpoint: wudysoft.xyz nano-banana v17)
// Export default function sesuai pola project plugin-bot-wa yang kamu pakai.

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// jika environmentmu memakai require, ganti import upload dengan require:
// const upload = require("../lib/upload.js");
import upload from "../lib/upload.js";

export default async function ({ sock, from, args, text, m, fileBuffer, reply }) {
  try {
    // Ambil prompt: prioritas = text (wrapper menyediakan), lalu args join
    const prompt = (typeof text === "string" && text.trim().length > 0)
      ? text.trim()
      : (Array.isArray(args) && args.length ? args.join(" ").trim() : "");

    // Jika tidak ada prompt, beri contoh/petunjuk penggunaan singkat
    if (!prompt) {
      return await reply(
        "Gunakan perintah ini dengan menyertakan prompt teks dan reply ke gambar.\nContoh: */ai-edit tambahkan topi merah pada orang di foto* (reply ke gambar)."
      );
    }

    // fileBuffer disediakan oleh wrapper ketika ada media (lihat context project).
    // Jika tidak tersedia, beri tahu cara pakai.
    if (!fileBuffer) {
      return await reply(
        "Gagal menemukan gambar. Reply ke gambar yang ingin diedit atau kirim gambar bersama perintah.\nContoh: reply ke gambar lalu ketik perintah dengan prompt."
      );
    }

    // Upload gambar ke host yang tersedia via ../lib/upload.js
    // upload(fileBuffer) => harus mengembalikan URL string (sesuai modulmu).
    let uploadedUrl;
    try {
      uploadedUrl = await upload(fileBuffer);
      if (!uploadedUrl || typeof uploadedUrl !== "string") {
        throw new Error("upload.js tidak mengembalikan URL string yang valid.");
      }
    } catch (errUpload) {
      console.error("Upload error:", errUpload);
      return await reply("Gagal upload gambar ke host. Cek modul ../lib/upload.js dan coba lagi.");
    }

    // Build endpoint (GET dengan query params). Pastikan encodeURIComponent.
    const apiBase = "https://wudysoft.xyz/api/ai/nano-banana/v17";
    const url = `${apiBase}?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(uploadedUrl)}`;

    // Panggil API eksternal
    let apiRes;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        // optional: timeout handling not added (depends runtime)
      });

      if (!res.ok) {
        const textErr = await res.text().catch(()=>"[non-json response]");
        console.error("AI API returned non-OK:", res.status, textErr);
        return await reply(`AI service error: ${res.status}.`);
      }

      apiRes = await res.json();
    } catch (err) {
      console.error("Fetch error:", err);
      return await reply("Gagal menghubungi layanan AI. Coba lagi nanti.");
    }

    // Contoh response yang diharapkan:
    // {
    //  "status": "succeeded",
    //  "result": ["https://.../edited.jpg"],
    //  "prompt": "..."
    // }
    if (!apiRes || (apiRes.status !== "succeeded" && apiRes.status !== "success")) {
      // tampilkan pesan singkat dan debug minimal dari response
      return await reply(`Proses edit gagal. Response: ${JSON.stringify(apiRes)}`);
    }

    // Ambil URL hasil (array result)
    const results = Array.isArray(apiRes.result) ? apiRes.result : [];
    if (results.length === 0) {
      return await reply("Layanan AI tidak mengembalikan URL hasil.");
    }

    // Gunakan hasil pertama
    const resultUrl = results[0];

    // Kirim hasil ke chat: pertama kirim teks URL, lalu kirim gambar (jika WA client mendukung pengiriman via URL)
    try {
      // Kirim gambar secara langsung
      await reply({ image: { url: resultUrl }, caption: `Hasil edit — prompt: ${apiRes.prompt || prompt}` });
    } catch (errSendImage) {
      // jika pengiriman media gagal (beberapa env tidak mendukung url langsung), kirim hanya teks
      console.warn("Gagal kirim gambar langsung, mengirim URL sebagai teks:", errSendImage);
      await reply(`Hasil edit: ${resultUrl}\nPrompt: ${apiRes.prompt || prompt}`);
    }

    // Selesai
    return;
  } catch (errTop) {
    console.error("Unhandled plugin error:", errTop);
    try { await reply("Terjadi kesalahan saat memproses permintaan. Cek log server."); } catch {}
    return;
  }
}