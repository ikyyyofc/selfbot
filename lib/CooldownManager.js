const config = await import("../config.js").then(m => m.default);

class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
        this.defaultCooldown = 30 * 60 * 1000;
        
        this.startAutoCleanup();
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
        let cleaned = 0;
        
        for (const [key, time] of this.cooldowns.entries()) {
            if (now - time > this.defaultCooldown) {
                this.cooldowns.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cooldown: Cleaned ${cleaned} expired entries`);
        }
    }

    startAutoCleanup() {
        const interval = (config.COOLDOWN_CLEANUP_INTERVAL || 60) * 60 * 1000;
        
        setInterval(() => {
            this.cleanup();
        }, interval);
        
        console.log(`⏰ Cooldown auto-cleanup started (every ${config.COOLDOWN_CLEANUP_INTERVAL || 60} minutes)`);
    }

    getStats() {
        return {
            total: this.cooldowns.size,
            active: Array.from(this.cooldowns.values()).filter(
                time => Date.now() - time < this.defaultCooldown
            ).length
        };
    }
}

export default new CooldownManager();