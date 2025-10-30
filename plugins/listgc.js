import db from "../lib/Database.js";

export default {
    rules: {
        owner: true
    },
    async execute({ reply }) {
        try {
            const groups = await db.getAllGroups();

            if (groups.length === 0) {
                return reply("📋 Belum ada grup yang terdaftar");
            }

            const approved = groups.filter(g => g.approved);
            const unapproved = groups.filter(g => !g.approved);

            let message = `📋 *LIST GRUP (${groups.length})*\n\n`;

            if (approved.length > 0) {
                message += `✅ *APPROVED (${approved.length})*\n`;
                approved.forEach((g, i) => {
                    const name = g.subject || "Unknown";
                    const date = new Date(g.approvedAt || 0).toLocaleDateString(
                        "id-ID"
                    );
                    message += `${i + 1}. ${name}\n`;
                    message += `   ID: ${g.groupId}\n`;
                    message += `   Date: ${date}\n\n`;
                });
            }

            if (unapproved.length > 0) {
                message += `\n❌ *NOT APPROVED (${unapproved.length})*\n`;
                unapproved.forEach((g, i) => {
                    const name = g.subject || "Unknown";
                    message += `${i + 1}. ${name}\n`;
                    message += `   ID: ${g.groupId}\n\n`;
                });
            }

            await reply(message.trim());
        } catch (error) {
            await reply(`❌ Error: ${error.message}`);
        }
    }
};