import colors from "@colors/colors/safe.js";
import db from "./Database.js";
import cooldown from "./CooldownManager.js";

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

        if (!isGroup) {
            const isPremiumUser = await db.isPremium(sender);
            const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
            const senderNumber = sender.replace(/[^0-9]/g, "");
            const isOwner = senderNumber === ownerNumber;

            if (!isPremiumUser && !isOwner) {
                if (!cooldown.isOnCooldown(sender, "private_blocked")) {
                    cooldown.setCooldown(sender, "private_blocked");
                    
                    return {
                        allowed: false,
                        message: "❌ Bot di private chat hanya untuk user premium!\n\nUpgrade ke premium untuk akses unlimited.\n\n_Pesan ini hanya muncul sekali per 30 menit_"
                    };
                }
                
                return {
                    allowed: false,
                    silent: true
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

            if (!isAdmin) {
                const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
                const senderNum = sender.replace(/[^0-9]/g, "");
                const isOwner = senderNum === ownerNumber;

                if (!isOwner) {
                    return {
                        allowed: false,
                        message: "❌ Perintah khusus admin grup"
                    };
                }
            }
        }

        if (rules.premium) {
            const isPremiumUser = await db.isPremium(sender);

            if (!isGroup) {
                if (!isPremiumUser) {
                    return {
                        allowed: false,
                        message:
                            "❌ Fitur premium!\n\nUntuk akses di private chat, upgrade ke premium dulu."
                    };
                }
            } else {
                const isPremiumGroup = config.PREMIUM_GROUPS.includes(
                    context.chat
                );

                if (!isPremiumGroup && !isPremiumUser) {
                    return {
                        allowed: false,
                        message:
                            "❌ Fitur premium!\n\nGrup ini belum premium atau kamu bukan user premium."
                    };
                }
            }
        }

        if (rules.limit) {
            const isPremiumUser = await db.isPremium(sender);
            if (!isPremiumUser) {
                const limitResult = await db.useLimit(sender, rules.limit);
                if (!limitResult.success) {
                    return {
                        allowed: false,
                        message: `❌ Limit tidak cukup!\n\nLimit tersisa: ${limitResult.remaining}\nDibutuhkan: ${rules.limit}\n\nUpgrade ke premium untuk unlimited!`
                    };
                }

                context.limitUsed = rules.limit;
                context.limitRemaining = limitResult.remaining;
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

            await context.m.react("⏳");

            await plugin.execute(context);

            if (context.limitUsed) {
                console.log(
                    colors.yellow(
                        `📊 Limit used: ${context.limitUsed} | Remaining: ${context.limitRemaining}`
                    )
                );
            }

            return true;
        } catch (error) {
            console.error(colors.red("❌ Plugin error:"), error);
            await context.m.reply(`❌ Error: ${error.message}`);
            return false;
        } finally {
            try {
                await context.m.react("");
            } catch (e) {
                console.error(
                    colors.red("❌ Failed to remove reaction:"),
                    e.message
                );
            }
        }
    }
}

export default PluginHandler;