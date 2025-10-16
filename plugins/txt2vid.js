import axios from "axios";
import crypto from "crypto";

export default async function ({ sock, from, args, text, reply }) {
  try {
    if (!text) return reply("⚠️ Masukkan prompt untuk membuat video.\n\nContoh:\n.txt2vid seorang wanita sedang duduk di pantai");

    const ratio = text.includes("--landscape")
      ? "landscape"
      : "portrait";
    const prompt = text.replace("--landscape", "").trim();

    reply("⏳ Sedang membuat video AI, mohon tunggu sebentar...");

    const api = axios.create({
      baseURL: "https://api.bylo.ai/aimodels/api/v1/ai",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "content-type": "application/json; charset=UTF-8",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        referer: "https://bylo.ai/features/sora-2",
        origin: "https://bylo.ai",
        uniqueId: crypto.randomUUID().replace(/-/g, ""),
      },
    });

    const { data: task } = await api.post("/video/create", {
      prompt,
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

    let videoUrl;
    while (true) {
      const { data } = await api.get(`/${task.data}?channel=SORA2'`);
      if (data?.data?.state > 0) {
        const result = JSON.parse(data.data.completeData);
        videoUrl = result?.data?.result_urls?.[0];
        break;
      }
      await new Promise((res) => setTimeout(res, 2000));
    }

    if (!videoUrl) return reply("❌ Gagal membuat video, coba lagi nanti.");

    await sock.sendMessage(from, {
      video: { url: videoUrl },
      caption: `🎬 *Video AI Berhasil Dibuat!*\n\nPrompt: ${prompt}\nRasio: ${ratio}`,
    });
  } catch (err) {
    console.error(err);
    reply("❌ Terjadi kesalahan saat membuat video: " + err.message);
  }
}