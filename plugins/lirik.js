import axios from "axios";

export default {
    desc: "Mencari lirik lagu.",
    rules: {
        limit: 1,
    },
    execute: async({ text, reply }) => {
        if (!text) {
            return await reply("Gunakan format .lirik <judul lagu>");
        }

        try {
            const { data } = await axios.get(
                `https://chocomilk.amira.us.kg/v1/search/lyrics?query=${encodeURIComponent(text)}`
            );

            if (!data.success || !data.data) {
                return await reply(`Lirik untuk "${text}" ga ketemu, coba judul lain.`);
            }

            const { title, artist, lyrics } = data.data;
            const resultText =
                `*Judul:* ${title}\n` +
                `*Artis:* ${artist}\n\n` +
                `${lyrics.join("\n")}`;

            await reply(resultText);
        } catch (error) {
            console.log("Error di plugin lirik:", error);
            await reply(`Waduh, ada error nih pas nyari lirik. Coba lagi nanti ya.`);
        }
    },
};