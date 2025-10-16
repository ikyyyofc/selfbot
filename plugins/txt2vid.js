import axios from "axios";
import crypto from "crypto";

export default async function ({ sock, from, text, args, reply }) {
  try {
    if (!text)
      return reply(
        "❌ Masukkan prompt untuk membuat video.\n\nContoh:\n.txt2vid wanita sedang berlari di pantai --ratio landscape"
      );

    // ambil rasio jika ada
    const ratioArg = args.find(a => a.includes("--ratio"));
    const ratio = ratioArg
      ? ratioArg.split(" ")[1] || ratioArg.split("=")[1] || "portrait"
      : "portrait";

    if (!["portrait", "landscape"].includes(ratio))
      return reply("❌ Rasio harus `portrait` atau `landscape`");

    const api = axios.create({
      baseURL: "https://api.bylo.ai/aimodels/api/v1/ai",
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "content-type": "application/json; charset=UTF-8",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        origin: "https://bylo.ai",
        referer: "https://bylo.ai/features/sora-2",
        uniqueId: crypto.randomUUID().replace(/-/g, ""),
      },
    });

    await reply("⏳ Membuat video dengan AI, mohon tunggu beberapa saat...");

    const { data: task } = await api.post("/video/create", {
      prompt: text,
      channel: "SORA2",
      pageId: 536,
      source: "bylo.ai",
      watermarkFlag: true,
      privateFlag: true,
      isTemp: true,
      vipFlag: true,
      model: "sora_video2",
      videoType: "text-to-video",
      aspectRatio: ratio,
    });

    const taskId = task?.data;
    if (!taskId) throw new Error("Gagal membuat task video.");

    // polling status
    while (true) {
      const { data } = await api.get(`/${taskId}?channel=SORA2`);
      if (data?.data?.state > 0) {
        const result = JSON.parse(data.data.completeData);
        const videoUrl = result?.data?.videoUrl || result?.videoUrl;
        if (!videoUrl) throw new Error("Video tidak ditemukan di hasil.");

        await sock.sendMessage(from, {
          video: { url: videoUrl },
          caption: "🎬 Video berhasil dibuat oleh AI!",
        });
        break;
      }
      await new Promise(res => setTimeout(res, 3000)); // jeda 3 detik
    }
  } catch (e) {
    console.error(e);
    reply("❌ Terjadi kesalahan: " + e.message);
  }
}