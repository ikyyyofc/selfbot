import db from "../lib/Database.js";
import time from "../lib/TimeHelper.js";

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
                    const date = time.getWIBDateOnly(g.approvedAt || 0);
                    
                    message += `${i + 1}. ${name}\n`;
                    message += `   ID: ${g.groupId.split("@")[0]}\n`;
                    message += `   Date: ${date}\n`;
                    
                    if (g.expiresAt) {
                        const now = time.now();
                        const timeLeft = g.expiresAt - now;
                        
                        if (timeLeft > 0) {
                            const daysLeft = time.getDaysLeft(g.expiresAt);
                            message += `   ⏰ Sisa: ${daysLeft} hari\n`;
                        } else {
                            message += `   ⏰ Status: EXPIRED\n`;
                        }
                    } else {
                        message += `   ⏰ Permanent\n`;
                    }
                    
                    message += `\n`;
                });
            }

            if (unapproved.length > 0) {
                message += `\n❌ *NOT APPROVED (${unapproved.length})*\n`;
                unapproved.forEach((g, i) => {
                    const name = g.subject || "Unknown";
                    message += `${i + 1}. ${name}\n`;
                    message += `   ID: ${g.groupId.split("@")[0]}\n\n`;
                });
            }

            await reply(message.trim());
        } catch (error) {
            await reply(`❌ Error: ${error.message}`);
        }
    }
};