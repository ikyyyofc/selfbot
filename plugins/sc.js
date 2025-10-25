import axios from 'axios';

export default async function({
    m,
    reply
}) {
    const owner = 'ikyyyofc';
    const repo = 'selfbot';

    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const {
            data
        } = await axios.get(apiUrl);

        const repoName = data.name;
        const description = data.description || 'Gaada deskripsi, tapi yang pasti keren.';
        const url = data.html_url;
        const stars = data.stargazers_count;
        const forks = data.forks_count;
        const language = data.language;
        const author = data.owner.login;

        const manualDesc = `
Source code ini dibuat pake cinta dan kopi ☕. Bot ini ringan, efisien, dan gampang di-custom. Dibuat pake Baileys versi terbaru, jadi support fitur-fitur WhatsApp paling update.

*Fitur Keren:*
-  modular (gampang nambahin plugin)
- Anti-Delete & Anti-Edit
- Manajemen Sesi Otomatis
- Support Gemini AI
- Logging Pesan yang Detail

Kalau suka sama project ini, jangan lupa kasih bintang ya di GitHub! Biar ownernya makin semangat ngembangin. Thanks!`;

        let response = `🤖 *Source Code Bot* 🤖

✨ *Repository:*
   - *Nama:* ${repoName}
   - *Author:* @${author}
   - *URL:* ${url}

📊 *Statistik:*
   - ⭐ *Bintang:* ${stars}
   - 🍴 *Forks:* ${forks}
   - 💻 *Bahasa:* ${language}

📝 *Deskripsi:*
${description}
${manualDesc}`;

        await reply(response);

    } catch (error) {
        console.error("Gagal fetch data dari GitHub:", error.message);
        const fallbackResponse = `Yah, gagal ngambil data dari GitHub. Coba lagi nanti ya.

Tapi intinya, source code bot ini ada di:
https://github.com/ikyyyofc/selfbot

Dibuat sama *ikyyofc*, jangan lupa mampir dan kasih bintang! ⭐`;
        await reply(fallbackResponse);
    }
}