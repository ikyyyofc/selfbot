import colors from "@colors/colors/safe.js";
import db from "./Database.js";

const config = await import("../config.js").then(m => m.default);

class LimitScheduler {
    constructor() {
        this.interval = null;
        this.resetHour = config.LIMIT_RESET_HOUR || 0;
    }

    start() {
        this.scheduleNextReset();
        console.log(
            colors.cyan(
                `⏰ Limit reset scheduler started (daily at ${this.resetHour}:00)`
            )
        );
    }

    scheduleNextReset() {
        const now = new Date();
        const next = new Date();

        next.setHours(this.resetHour, 0, 0, 0);

        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        const timeUntilReset = next.getTime() - now.getTime();

        this.interval = setTimeout(async () => {
            await this.resetLimits();
            this.scheduleNextReset();
        }, timeUntilReset);

        const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutes = Math.floor(
            (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)
        );

        console.log(
            colors.cyan(
                `⏰ Next limit reset in ${hours}h ${minutes}m (${next.toLocaleString("id-ID")})`
            )
        );
    }

    async resetLimits() {
        console.log(colors.yellow("🔄 Resetting all user limits..."));
        await db.resetLimits();
        console.log(colors.green("✅ All limits have been reset!"));
    }

    stop() {
        if (this.interval) {
            clearTimeout(this.interval);
            this.interval = null;
            console.log(colors.yellow("🛑 Limit scheduler stopped"));
        }
    }
}

export default new LimitScheduler();