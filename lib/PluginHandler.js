import colors from "@colors/colors/safe.js";

const config = await import("../config.js").then(m => m.default);

class PluginHandler {
    static async checkPermission(context, rules) {
        const { m, isGroup, sender } = context;

        if (config.BOT_MODE === "self") {
            if (!m.fromMe) {
                return {
                    allowed: false,
                    message: "❌ Bot dalam mode self"
                };
            }
            return { allowed: true };
        }

        if (rules.owner) {
            const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
            const senderNumber = sender.replace(/[^0-9]/g, "");
            if (senderNumber !== ownerNumber) {
                return {
                    allowed: false,
                    message: "❌ Perintah khusus owner"
                };
            }
        }

        if (rules.group) {
            if (!isGroup) {
                return {
                    allowed: false,
                    message: "❌ Perintah hanya untuk grup"
                };
            }
        }

        if (rules.private) {
            if (isGroup) {
                return {
                    allowed: false,
                    message: "❌ Perintah hanya untuk private chat"
                };
            }
        }

        if (rules.admin) {
            if (!isGroup) {
                return {
                    allowed: false,
                    message: "❌ Perintah hanya untuk grup"
                };
            }

            const groupAdmins = await context.groupCache.getAdmins(context.chat);
            const senderNumber = sender.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            const isAdmin = groupAdmins.includes(senderNumber);

            const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
            const isOwner = sender.replace(/[^0-9]/g, "") === ownerNumber;

            if (!isAdmin && !isOwner) {
                return {
                    allowed: false,
                    message: "❌ Perintah khusus admin grup"
                };
            }
        }

        return { allowed: true };
    }

    static async execute(plugin, context) {
        try {
            const rules = plugin.rules || {};

            const permission = await this.checkPermission(context, rules);

            if (!permission.allowed) {
                if (!permission.silent) {
                    await context.reply(permission.message);
                }
                return false;
            }

            await plugin.execute(context);

            return true;
        } catch (error) {
            console.error(colors.red("❌ Plugin error:"), error);
            await context.m.reply(`❌ Error: ${error.message}`);
            return false;
        }
    }
}

export default PluginHandler;