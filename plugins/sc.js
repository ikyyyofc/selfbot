import axios from "axios";

export default async function ({ reply }) {
    const repoOwner = "ikyyyofc";
    const repoName = "selfbot";
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;
    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;

    try {
        const { data } = await axios.get(apiUrl);

        const manualDesc = `
Source code ini dibuat pake Node.js dengan library utama @whiskeysockets/baileys. Didesain buat jadi self-bot yang ringan, modular, dan gampang di-custom.

*Fitur Keren:*
- Modular (sistem plugin)
- Anti-Delete & Anti-Edit
- Group Metadata Caching (biar bot cepet)
- Session Cleaner (otomatis biar ga bengkak)
- Integrasi Gemini AI
- Modern (ESM, async/await)

Cocok buat yang suka ngoprek atau mau bikin bot pribadi yang gak ribet.
        `;

        const lastUpdate = new Date(data.pushed_at).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short"
        });

        const message = `
🤖 *${data.full_name}* 🤖

${data.description || "Ga ada deskripsi dari sananya."}

⭐ *Stars:* ${data.stargazers_count}
🍴 *Forks:* ${data.forks_count}
👀 *Watchers:* ${data.watchers_count}
⚠️ *Open Issues:* ${data.open_issues_count}
📄 *License:* ${data.license ? data.license.name : "Not specified"}
⏰ *Last Update:* ${lastUpdate} WIB

🔗 *URL:*
${data.html_url}

---
*📝 Catatan Tambahan dari Ikyy:*
${manualDesc.trim()}
        `.trim();

        await reply(message);
    } catch (error) {
        console.error("Gagal fetch info repo:", error.message);
        const fallbackMessage = `
Waduh, sorry, gagal ngambil data dari API GitHub. 😭 Kayaknya lagi ada masalah.

Tapi tenang, ini info manualnya:

*Repository:* ikyyyofc/selfbot
*URL:* ${repoUrl}

Ini adalah source code buat self-bot WhatsApp yang gue pake sekarang. Dibangun pake Node.js dan Baileys, fokusnya biar enteng dan gampang dioprek. Kalo mau liat-liat, langsung aja ke link di atas ya!
        `.trim();

        await reply(fallbackMessage);
    }
}