import axios from "axios";

export default async function ({ sock, m }) {
    try {
        const owner = "ikyyyofc";
        const repo = "selfbot";

        const { data } = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}`
        );

        const stars = data.stargazers_count || 0;
        const forks = data.forks_count || 0;
        const watchers = data.watchers_count || 0;
        const issues = data.open_issues_count || 0;
        const size = (data.size / 1024).toFixed(2);
        const language = data.language || "Unknown";
        const license = data.license?.name || "No License";
        const created = new Date(data.created_at).toLocaleDateString("id-ID");
        const updated = new Date(data.updated_at).toLocaleDateString("id-ID");
        const description = data.description || "No description available";
        const homepage = data.homepage || "-";
        const topics = data.topics?.join(", ") || "-";
        const defaultBranch = data.default_branch || "main";
        const isPrivate = data.private ? "Yes" : "No";
        const hasWiki = data.has_wiki ? "Yes" : "No";
        const hasPages = data.has_pages ? "Yes" : "No";

        const message = `╭━━━『 *REPO INFO* 』━━━╮
│
│ 📦 *Name:* ${data.name}
│ 👤 *Owner:* ${data.owner.login}
│ 📝 *Description:* ${description}
│
│ ⭐ *Stars:* ${stars}
│ 🍴 *Forks:* ${forks}
│ 👀 *Watchers:* ${watchers}
│ 🐛 *Open Issues:* ${issues}
│
│ 💾 *Size:* ${size} MB
│ 🔤 *Language:* ${language}
│ 📜 *License:* ${license}
│ 🌿 *Default Branch:* ${defaultBranch}
│
│ 🔒 *Private:* ${isPrivate}
│ 📚 *Wiki:* ${hasWiki}
│ 📄 *Pages:* ${hasPages}
│
│ 🏷️ *Topics:* ${topics}
│ 🌐 *Homepage:* ${homepage}
│
│ 📅 *Created:* ${created}
│ 🔄 *Last Updated:* ${updated}
│
│ 🔗 *URL:* ${data.html_url}
│ 📥 *Clone:* ${data.clone_url}
│
╰━━━━━━━━━━━━━━━━━━━━━╯`;

        await m.reply(message);
    } catch (error) {
        await m.reply(`❌ Error: ${error.message}`);
    }
}