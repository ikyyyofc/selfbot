import fs from "fs";
import path from "path";

export default {
  desc: "mendapatkan konten dari url",
    async execute({ sock, from, args, text, reply }) {
        if (!text)
            return reply(
                "⚠️ Masukkan URL yang ingin diambil.\nContoh: .geturl https://example.com"
            );

        const url = text.trim();

        try {
            const res = await fetch(url);
            const contentType = res.headers.get("content-type") || "unknown";

            // Jika berupa file (bukan teks/json)
            if (
                !contentType.includes("text") &&
                !contentType.includes("json")
            ) {
                const buffer = await res.arrayBuffer();
                const fileExt =
                    contentType.split("/")[1]?.split(";")[0] || "bin";
                const fileName = `download_${Date.now()}.${fileExt}`;
                const filePath = path.join("/tmp", fileName);
                fs.writeFileSync(filePath, Buffer.from(buffer));

                // Deteksi jenis media
                if (contentType.startsWith("image/")) {
                    await sock.sendMessage(from, {
                        image: { url: filePath },
                        caption: `📷 Berhasil mengambil gambar\nType: ${contentType}`
                    });
                } else if (contentType.startsWith("video/")) {
                    await sock.sendMessage(from, {
                        video: { url: filePath },
                        caption: `🎥 Berhasil mengambil video\nType: ${contentType}`
                    });
                } else if (contentType.startsWith("audio/")) {
                    await sock.sendMessage(from, {
                        audio: { url: filePath },
                        mimetype: contentType
                    });
                } else {
                    await sock.sendMessage(from, {
                        document: { url: filePath },
                        mimetype: contentType,
                        fileName,
                        caption: `📦 File dari URL (${contentType})`
                    });
                }

                fs.unlinkSync(filePath); // hapus file setelah dikirim
                return;
            }

            // Jika berupa JSON
            if (contentType.includes("json")) {
                const data = await res.json();
                return reply(
                    `✅ JSON Response:\n\n${JSON.stringify(data, null, 2)}`
                );
            }

            // Jika berupa teks (HTML, plain text, XML, dll)
            const textData = await res.text();
            await reply(`✅ Text Response (${contentType}):\n\n${textData}`);
        } catch (err) {
            console.error(err);
            reply(`❌ Gagal mengambil URL: ${err.message}`);
        }
    }
};
