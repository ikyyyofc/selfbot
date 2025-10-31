import colors from "@colors/colors/safe.js";
import db from "./Database.js";
import time from "./TimeHelper.js";

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
                `⏰ Limit reset scheduler started (daily at ${this.resetHour}:00 WIB)`
            )
        );
    }

    scheduleNextReset() {
        const now = time.now();
        const next = time.getNextResetTime(this.resetHour);
        const timeUntilReset = next - now;

        this.interval = setTimeout(async () => {
            await this.resetLimits();
            this.scheduleNextReset();
        }, timeUntilReset);

        const duration = time.formatDuration(timeUntilReset);
        const nextDate = time.getWIBDateTime(next);

        console.log(
            colors.cyan(
                `⏰ Next limit reset in ${duration} (${nextDate} WIB)`
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