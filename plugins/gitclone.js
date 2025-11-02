import axios from "axios";

export default {
    rules: {
        limit: 2
    },
    desc: "Download repository GitHub",
    
    async execute({ m, args, reply }) {
        if (!args[0]) {
            return reply("Contoh: .gitdl https://github.com/username/repo");
        }

        const url = args[0];
        const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
        
        if (!repoMatch) {
            return reply("❌ URL GitHub tidak valid!");
        }

        const [, owner, repo] = repoMatch;
        const cleanRepo = repo.replace(/\.git$/, "");
        
        await m.react("🔄");

        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
            const { data: repoData } = await axios.get(apiUrl);
            
            const branch = repoData.default_branch || "main";
            const zipUrl = `https://github.com/${owner}/${cleanRepo}/archive/refs/heads/${branch}.zip`;
            
            const sizeInMB = (repoData.size / 1024).toFixed(2);
            
            let info = `📦 *GitHub Repository*\n\n`;
            info += `📝 Nama: ${repoData.name}\n`;
            info += `👤 Owner: ${repoData.owner.login}\n`;
            info += `⭐ Stars: ${repoData.stargazers_count}\n`;
            info += `🍴 Forks: ${repoData.forks_count}\n`;
            info += `📊 Size: ~${sizeInMB} MB\n`;
            info += `🌿 Branch: ${branch}\n`;
            
            if (repoData.description) {
                info += `\n📄 ${repoData.description}\n`;
            }
            
            info += `\n⏳ Downloading...`;
            
            await reply(info);

            const { data: zipBuffer } = await axios.get(zipUrl, {
                responseType: "arraybuffer",
                maxContentLength: 100 * 1024 * 1024,
                timeout: 120000
            });

            const fileName = `${cleanRepo}-${branch}.zip`;

            await m.reply({
                document: Buffer.from(zipBuffer),
                fileName: fileName,
                mimetype: "application/zip",
                caption: `✅ Repository berhasil didownload!\n\n📦 ${repoData.full_name}`
            });

            await m.react("✅");
            
        } catch (error) {
            await m.react("❌");
            
            if (error.response?.status === 404) {
                return reply("❌ Repository tidak ditemukan!");
            }
            
            if (error.code === "ECONNABORTED") {
                return reply("❌ Timeout! Repository terlalu besar.");
            }
            
            if (error.response?.status === 403) {
                return reply("❌ Rate limit GitHub terlampaui, coba lagi nanti.");
            }
            
            return reply(`❌ Error: ${error.message}`);
        }
    }
};