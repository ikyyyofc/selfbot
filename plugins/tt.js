async function postData(input) {
  const urlApi = "https://tikwm.com/api/";
  const bodyData = `url=${input}`;

  try {
    const response = await fetch(urlApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gagal melakukan fetch:", error);
    throw error;
  }
}

export default async function ({ sock, from, args, text, reply }) {
  if (!text) return reply("⚠️ Kirim link TikTok yang mau diunduh.");

  try {
    const result = await postData(text);

    if (result.code !== 0 || !result.data) {
      return reply("❌ Gagal mengambil data dari TikTok. Pastikan link valid.");
    }

    const data = result.data;
    const { title, author } = data;
    const username = author?.unique_id ? `@${author.unique_id}` : "Unknown";

    if (data.images && Array.isArray(data.images)) {
      // Konten foto slide
      await reply(`🖼 *Foto Slide TikTok*\n👤 ${username}\n🎬 ${title}\n📸 Jumlah Foto: ${data.images.length}`);
      for (const img of data.images) {
        await sock.sendMessage(from, {
          image: { url: img },
          caption: `${username} - ${title}`
        });
      }
      await sock.sendMessage(from, {
        audio: { url: data.play },
        mimetype: "audio/mpeg",
        ptt: false
      });
    } else if (data.play) {
      // Konten video
      await reply(`🎥 *Video TikTok*\n👤 ${username}\n🎬 ${title}`);
      await sock.sendMessage(from, {
        video: { url: data.play },
        caption: `${username} - ${title}`
      });
    } else {
      reply("❌ Tidak dapat menemukan media dari link tersebut.");
    }

  } catch (error) {
    console.error(error);
    reply("🚨 Terjadi kesalahan saat memproses permintaan.");
  }
}