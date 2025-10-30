import axios from "axios";

export default {
  desc: "mencari video youtube",
    rules: {
        limit: 3
    },
    async execute({ m, text, reply }) {
        if (!text)
            return await reply(
                "❌ Berikan query pencarian!\n\nContoh: .ytsearch budi epep"
            );

        try {
            await m.react("🔍");

            const { data } = await axios.get(
                `https://wudysoft.xyz/api/search/youtube/v1?query=${encodeURIComponent(
                    text
                )}`
            );

            if (!data.result || data.result.length === 0) {
                await m.react("❌");
                return await reply("❌ Tidak ada hasil ditemukan");
            }

            const results = data.result.slice(0, 10);
            let msg = `🔎 *YOUTUBE SEARCH*\n\n`;
            msg += `📝 Query: ${text}\n`;
            msg += `📊 Hasil: ${results.length} video\n\n`;

            results.forEach((v, i) => {
                msg += `${i + 1}. *${v.title}*\n`;
                msg += `   📺 ${v.channelTitle}\n`;
                msg += `   👁️ ${v.viewCount} views\n`;
                msg += `   ⏱️ ${v.duration}\n`;
                msg += `   🔗 https://youtu.be/${v.id}\n\n`;
            });

            await m.react("✅");
            await reply(msg);
        } catch (e) {
            await m.react("❌");
            await reply(`❌ Error: ${e.message}`);
        }
    }
};
