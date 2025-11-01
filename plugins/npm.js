import axios from "axios";

export default {
    rules: {
        limit: 1, // Biar ga dispam, pake limit 1
    },
    desc: "Mencari dependensi di NPM.",
    execute: async (context) => {
        const { text, reply } = context;

        if (!text) {
            return await reply("Kasih nama package-nya dong.");
        }

        try {
            await context.m.react("🔍");
            const { data } = await axios.get(
                `https://registry.npmjs.org/${encodeURIComponent(text)}`
            );

            const latest = data["dist-tags"].latest;
            const info = data.versions[latest];

            const response = [
                `📦 *${info.name}*`,
                `*Versi:* ${latest}`,
                `*Lisensi:* ${info.license || "N/A"}`,
                `*Author:* ${data.author?.name || "N/A"}`,
                `*Homepage:* ${data.homepage || "N/A"}`,
                `\n*Deskripsi:*\n_${info.description || "Tidak ada deskripsi."}_`
            ].join("\n");

            await reply(response);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                await reply(
                    `Gak nemu package '${text}', coba cek lagi namanya.`
                );
            } else {
                await reply("Duh, error pas nyari datanya, coba lagi nanti.");
                console.error("NPM Plugin Error:", error);
            }
        }
    },
};