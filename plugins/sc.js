import axios from "axios";

export default async function ({ sock, m, reply }) {
    try {

        const repo = "ikyyyofc/selfbot";
        const apiUrl = `https://api.github.com/repos/${repo}`;

        const [repoData, readmeData] = await Promise.all([
            axios.get(apiUrl),
            axios.get(`${apiUrl}/readme`, {
                headers: { Accept: "application/vnd.github.v3.raw" }
            })
        ]);

        const {
            name,
            description,
            html_url,
            stargazers_count,
            forks_count,
            open_issues_count,
            language,
            created_at,
            updated_at,
            default_branch,
            size
        } = repoData.data;

        const readme = readmeData.data;
        const descriptionPreview = readme.split("\n").slice(0, 10).join("\n");

        let message = `╭━━━━『 *SCRIPT BOT* 』━━━━╮\n\n`;
        message += `📦 *Repository:* ${name}\n`;
        message += `📝 *Description:* ${description || "No description"}\n`;
        message += `🔗 *URL:* ${html_url}\n\n`;
        message += `⭐ *Stars:* ${stargazers_count}\n`;
        message += `🍴 *Forks:* ${forks_count}\n`;
        message += `🐛 *Issues:* ${open_issues_count}\n`;
        message += `💻 *Language:* ${language || "Unknown"}\n`;
        message += `📏 *Size:* ${(size / 1024).toFixed(2)} MB\n`;
        message += `🌿 *Branch:* ${default_branch}\n\n`;
        message += `📅 *Created:* ${new Date(created_at).toLocaleDateString(
            "id-ID"
        )}\n`;
        message += `🔄 *Updated:* ${new Date(updated_at).toLocaleDateString(
            "id-ID"
        )}\n\n`;
        message += `╰━━━━━━━━━━━━━━━━━╯\n\n`;
        message += `📖 *README Preview:*\n\n${descriptionPreview}\n\n`;
        message += `🔗 *Clone:*\n\`\`\`git clone ${html_url}.git\`\`\`\n\n`;
        message += `📥 *Download ZIP:*\n${html_url}/archive/refs/heads/${default_branch}.zip`;

        await reply(message);
    } catch (error) {
        console.error("Error fetching repository:", error);
        await m.react("❌");
        await reply(
            `❌ *Error:* ${error.response?.data?.message || error.message}`
        );
    }
}