import fetch from "node-fetch";

async function postData(input) {
  const urlApi = "https://tikwm.com/api/";
  const bodyData = `url=${input}`;

  try {
    const response = await fetch(urlApi, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: bodyData,
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

export default {
  async execute({ sock, m, reply }) {
    if (!m.link || m.link.length === 0) return;

    const tiktokLink = m.link.find(link => link.includes("tiktok.com"));
    if (!tiktokLink) return;

    try {
      const result = await postData(tiktokLink);

      if (result.code !== 0 || !result.data) {
        // ga usah reply kalo error, ntar nyepam
        return console.error("gagal ngambil data tiktok dari listener.");
      }

      const data = result.data;
      const { title, author } = data;
      const username = author?.unique_id ? `@${author.unique_id}` : "unknown";

      if (data.images && Array.isArray(data.images)) {
        await reply(
          `🖼️ *foto slide tiktok*\n👤 ${username}\n🎬 ${title}\n📸 jumlah: ${data.images.length}`
        );
        let allImg = [];
        for (const img of data.images) {
          allImg.push({ image: { url: img } });
        }
        await sock.sendAlbumMessage(m.chat, allImg, m);
        await sock.sendMessage(m.chat, {
          audio: { url: data.play },
          mimetype: "audio/mpeg",
        });
      } else if (data.play) {
        await reply(`🎥 *video tiktok*\n👤 ${username}\n🎬 ${title}`);
        await sock.sendMessage(m.chat, {
          video: { url: data.play },
          caption: `${username} - ${title}`,
        });
      }
    } catch (error) {
      console.error("error di listener tiktok:", error);
    }
  },
};