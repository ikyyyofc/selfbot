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

        const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
        const senderNumber = sender.replace(/[^0-9]/g, "");
        const isOwner = senderNumber === ownerNumber;

        if (!isGroup) {
            if (!isOwner) {
                const userData = await db.getUser(sender);
                const isPremiumUser = userData?.premium || false;

                if (!isPremiumUser) {
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

            if (!isAdmin && !isOwner) {
                return {
                    allowed: false,
                    message: "❌ Perintah khusus admin grup"
                };
            }
        }

        if (rules.premium || rules.limit) {
            const limitAmount = rules.limit || 0;
            
            const result = await db.checkAndUseLimit(sender, limitAmount);
            
            if (rules.premium) {
                if (!isGroup) {
                    if (!result.user.premium) {
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

                    if (!isPremiumGroup && !result.user.premium) {
                        return {
                            allowed: false,
                            message:
                                "❌ Fitur premium!\n\nGrup ini belum premium atau kamu bukan user premium."
                        };
                    }
                }
            }
            
            if (rules.limit && !result.user.premium && !isOwner) {
                if (!result.success) {
                    return {
                        allowed: false,
                        message: `❌ Limit tidak cukup!\n\nLimit tersisa: ${result.remaining}\nDibutuhkan: ${limitAmount}\n\nUpgrade ke premium untuk unlimited!`
                    };
                }

                context.limitUsed = limitAmount;
                context.limitRemaining = result.remaining;
            }
        }

        return { allowed: true };
    }

    static async execute(plugin, context) {
        try {
            const rules = plugin.rules || {};
            const desc = plugin.desc || "";

            const permission = await this.checkPermission(context, rules);

            if (!permission.allowed) {
                if (!permission.silent) {
                    await context.reply(permission.message);
                }
                return false;
            }

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
        }
    }
}

export default PluginHandler;