import db from "../lib/Database.js";

export default {
    rules: {
        admin: true
    },
    async execute({ chat, text, reply }) {
        try {
            const args = text.trim().toLowerCase().split(" ");
            const action = args[0];
            const feature = args[1];

            const validFeatures = [
                "antilink",
                "antitoxic",
                "welcome",
                "autodownload",
                "autosticker"
            ];

            if (!action || !feature) {
                const settings = await db.getGroupSettings(chat);

                let message = `⚙️ *SETTINGS GRUP*\n\n`;
                message += `📋 Gunakan: .settings [on/off] [fitur]\n\n`;
                message += `*Fitur tersedia:*\n`;
                message += `• antilink - ${settings.antilink ? "✅" : "❌"}\n`;
                message += `• antitoxic - ${settings.antitoxic ? "✅" : "❌"}\n`;
                message += `• welcome - ${settings.welcome ? "✅" : "❌"}\n`;
                message += `• autodownload - ${settings.autodownload ? "✅" : "❌"}\n`;
                message += `• autosticker - ${settings.autosticker ? "✅" : "❌"}\n\n`;
                message += `Contoh: .settings on antilink`;

                return reply(message);
            }

            if (!["on", "off"].includes(action)) {
                return reply("❌ Gunakan: .settings [on/off] [fitur]");
            }

            if (!validFeatures.includes(feature)) {
                return reply(
                    `❌ Fitur tidak valid!\n\nFitur tersedia:\n${validFeatures.join(", ")}`
                );
            }

            const value = action === "on";

            await db.updateGroupSettings(chat, { [feature]: value });

            const status = value ? "✅ Diaktifkan" : "❌ Dinonaktifkan";
            await reply(
                `⚙️ *SETTINGS UPDATE*\n\n${status}: ${feature}\n\nGunakan .settings untuk cek status`
            );
        } catch (error) {
            await reply(`❌ Error: ${error.message}`);
        }
    }
};