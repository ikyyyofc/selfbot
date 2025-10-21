import NodeCache from "node-cache";
import colors from "@colors/colors/safe.js";

class GroupCache {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 600,
            checkperiod: 120,
            useClones: false
        });

        this.pendingRequests = new Map();

        this.cache.on("set", (key, value) => {
            console.log(colors.cyan(`📦 Cached group metadata: ${key}`));
        });

        this.cache.on("expired", (key, value) => {
            console.log(colors.yellow(`⏰ Cache expired: ${key}`));
        });

        this.cache.on("del", (key, value) => {
            console.log(colors.magenta(`🗑️ Cache deleted: ${key}`));
        });
    }

    get(jid) {
        return this.cache.get(jid);
    }

    set(jid, metadata, ttl) {
        this.cache.set(jid, metadata, ttl);
    }

    delete(jid) {
        this.cache.del(jid);
    }

    clear() {
        this.cache.flushAll();
        console.log(colors.green("✨ Group cache cleared"));
    }

    keys() {
        return this.cache.keys();
    }

    getStats() {
        const stats = this.cache.getStats();
        return {
            keys: stats.keys,
            hits: stats.hits,
            misses: stats.misses,
            hitRate: stats.hits / (stats.hits + stats.misses) || 0
        };
    }

    has(jid) {
        return this.cache.has(jid);
    }

    async fetch(sock, jid, forceRefresh = false) {
        if (this.pendingRequests.has(jid)) {
            console.log(
                colors.yellow(`⏳ Waiting for pending request: ${jid}`)
            );
            return await this.pendingRequests.get(jid);
        }

        if (!forceRefresh) {
            const cached = this.get(jid);
            if (cached) {
                console.log(colors.green(`✅ Using cached metadata: ${jid}`));
                return cached;
            }
        }

        console.log(colors.cyan(`🔄 Fetching group metadata: ${jid}`));

        const fetchPromise = (async () => {
            try {
                const metadata = await sock.groupMetadata(jid);
                this.set(jid, metadata);
                return metadata;
            } catch (error) {
                console.error(
                    colors.red(`❌ Failed to fetch metadata for ${jid}:`),
                    error.message
                );
                throw error;
            } finally {
                this.pendingRequests.delete(jid);
            }
        })();

        this.pendingRequests.set(jid, fetchPromise);
        return await fetchPromise;
    }

    getParticipants(jid) {
        const metadata = this.get(jid);
        return metadata?.participants || [];
    }

    getAdmins(jid) {
        const metadata = this.get(jid);
        if (!metadata) return [];

        return metadata.participants
            .filter(p => p.admin === "admin" || p.admin === "superadmin")
            .map(p => p.phoneNumber);
    }

    isAdmin(jid, userJid) {
        const admins = this.getAdmins(jid);
        return admins.includes(userJid);
    }

    getSubject(jid) {
        const metadata = this.get(jid);
        return metadata?.subject || "";
    }

    getDesc(jid) {
        const metadata = this.get(jid);
        return metadata?.desc || "";
    }

    updateParticipant(jid, participantJid, updates) {
        const metadata = this.get(jid);
        if (!metadata) return;

        const participantIndex = metadata.participants.findIndex(
            p => p.id === participantJid
        );

        if (participantIndex !== -1) {
            metadata.participants[participantIndex] = {
                ...metadata.participants[participantIndex],
                ...updates
            };
            this.set(jid, metadata);
            console.log(
                colors.cyan(`📝 Updated participant cache: ${participantJid}`)
            );
        }
    }

    addParticipants(jid, participantJids) {
        const metadata = this.get(jid);
        if (!metadata) return;

        participantJids.forEach(participantJid => {
            const exists = metadata.participants.some(
                p => p.id === participantJid
            );
            if (!exists) {
                metadata.participants.push({
                    id: participantJid,
                    admin: null
                });
            }
        });

        this.set(jid, metadata);
        console.log(
            colors.cyan(
                `➕ Added participants to cache: ${participantJids.join(", ")}`
            )
        );
    }

    removeParticipants(jid, participantJids) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.participants = metadata.participants.filter(
            p => !participantJids.includes(p.id)
        );

        this.set(jid, metadata);
        console.log(
            colors.cyan(
                `➖ Removed participants from cache: ${participantJids.join(
                    ", "
                )}`
            )
        );
    }

    updateSubject(jid, subject) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.subject = subject;
        this.set(jid, metadata);
        console.log(colors.cyan(`📝 Updated group subject in cache: ${jid}`));
    }

    logStats() {
        const stats = this.getStats();
        console.log(colors.cyan("\n📊 Cache Statistics:"));
        console.log(colors.white(`   Keys: ${stats.keys}`));
        console.log(colors.white(`   Hits: ${stats.hits}`));
        console.log(colors.white(`   Misses: ${stats.misses}`));
        console.log(
            colors.white(`   Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%\n`)
        );
    }
}

export default new GroupCache();
