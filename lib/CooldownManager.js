class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
        this.defaultCooldown = 30 * 60 * 1000;
    }

    isOnCooldown(userId, type = "default") {
        const key = `${userId}:${type}`;
        const lastTime = this.cooldowns.get(key);

        if (!lastTime) return false;

        const timePassed = Date.now() - lastTime;
        return timePassed < this.defaultCooldown;
    }

    setCooldown(userId, type = "default") {
        const key = `${userId}:${type}`;
        this.cooldowns.set(key, Date.now());
    }

    getRemainingTime(userId, type = "default") {
        const key = `${userId}:${type}`;
        const lastTime = this.cooldowns.get(key);

        if (!lastTime) return 0;

        const timePassed = Date.now() - lastTime;
        const remaining = this.defaultCooldown - timePassed;

        return remaining > 0 ? remaining : 0;
    }

    clearCooldown(userId, type = "default") {
        const key = `${userId}:${type}`;
        this.cooldowns.delete(key);
    }

    clearAll() {
        this.cooldowns.clear();
    }

    cleanup() {
        const now = Date.now();
        for (const [key, time] of this.cooldowns.entries()) {
            if (now - time > this.defaultCooldown) {
                this.cooldowns.delete(key);
            }
        }
    }
}

export default new CooldownManager();