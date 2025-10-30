import colors from "@colors/colors/safe.js";
import db from "./Database.js";

const config = await import("../config.js").then(m => m.default);

class RentReminder {
    constructor() {
        this.interval = null;
        this.checkInterval = 6 * 60 * 60 * 1000;
        this.reminderDays = config.RENT_REMINDER_DAYS || 3;
    }

    start(sock) {
        this.sock = sock;
        this.checkExpiring();
        
        this.interval = setInterval(() => {
            this.checkExpiring();
        }, this.checkInterval);

        console.log(
            colors.cyan(
                `⏰ Rent reminder started (check every 6 hours, remind ${this.reminderDays} days before expiry)`
            )
        );
    }

    async checkExpiring() {
        if (!this.sock) return;

        try {
            const groups = await db.getAllGroups();
            const now = Date.now();
            const reminderThreshold = this.reminderDays * 24 * 60 * 60 * 1000;

            for (const group of groups) {
                if (!group.approved || !group.expiresAt) continue;

                const timeLeft = group.expiresAt - now;

                if (timeLeft > 0 && timeLeft <= reminderThreshold) {
                    const lastReminder = group.lastReminder || 0;
                    const timeSinceLastReminder = now - lastReminder;

                    if (timeSinceLastReminder > 24 * 60 * 60 * 1000) {
                        await this.sendReminder(group, timeLeft);
                        await db.updateGroup(group.groupId, {
                            lastReminder: now
                        });
                    }
                }
            }
        } catch (error) {
            console.error(
                colors.red("❌ Rent reminder error:"),
                error.message
            );
        }
    }

    async sendReminder(group, timeLeft) {
        try {
            const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
            
            const message = `⏰ *REMINDER SEWA BOT*\n\n` +
                `📱 Grup: ${group.subject}\n` +
                `⏳ Sisa waktu: ${daysLeft} hari\n` +
                `📅 Expired: ${new Date(group.expiresAt).toLocaleDateString("id-ID")}\n\n` +
                `⚠️ Segera hubungi owner untuk perpanjang:\n` +
                `wa.me/${config.OWNER_NUMBER.replace(/[^0-9]/g, "")}`;

            await this.sock.sendMessage(group.groupId, { text: message });

            const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            await this.sock.sendMessage(ownerJid, {
                text: `⏰ *RENT REMINDER*\n\n` +
                    `📱 Grup: ${group.subject}\n` +
                    `🆔 ID: ${group.groupId}\n` +
                    `⏳ Sisa: ${daysLeft} hari\n\n` +
                    `Reminder sudah dikirim ke grup.`
            });

            console.log(
                colors.yellow(
                    `⏰ Reminder sent to ${group.subject} (${daysLeft} days left)`
                )
            );
        } catch (error) {
            console.error(
                colors.red(`❌ Failed to send reminder to ${group.groupId}:`),
                error.message
            );
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log(colors.yellow("🛑 Rent reminder stopped"));
        }
    }
}

export default new RentReminder();