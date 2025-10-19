import NodeCache from "node-cache";
import colors from "@colors/colors/safe.js";

/**
 * Group Metadata Cache Manager
 * Caches group metadata to reduce API calls
 */
class GroupCache {
    constructor() {
        // Cache for 10 minutes (600 seconds)
        // checkperiod: check for expired keys every 120 seconds
        this.cache = new NodeCache({
            stdTTL: 600,
            checkperiod: 120,
            useClones: false
        });

        this.pendingRequests = new Map();

        // Log cache stats
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

    /**
     * Get group metadata from cache
     * @param {string} jid - Group JID
     * @returns {Object|undefined} Cached metadata or undefined
     */
    get(jid) {
        return this.cache.get(jid);
    }

    /**
     * Set group metadata to cache
     * @param {string} jid - Group JID
     * @param {Object} metadata - Group metadata
     * @param {number} ttl - Time to live in seconds (optional)
     */
    set(jid, metadata, ttl) {
        this.cache.set(jid, metadata, ttl);
    }

    /**
     * Delete group metadata from cache
     * @param {string} jid - Group JID
     */
    delete(jid) {
        this.cache.del(jid);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.flushAll();
        console.log(colors.green("✨ Group cache cleared"));
    }

    /**
     * Get all cached group JIDs
     * @returns {Array} Array of cached group JIDs
     */
    keys() {
        return this.cache.keys();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        const stats = this.cache.getStats();
        return {
            keys: stats.keys,
            hits: stats.hits,
            misses: stats.misses,
            hitRate: stats.hits / (stats.hits + stats.misses) || 0
        };
    }

    /**
     * Check if group is cached
     * @param {string} jid - Group JID
     * @returns {boolean}
     */
    has(jid) {
        return this.cache.has(jid);
    }

    /**
     * Fetch and cache group metadata
     * @param {Object} sock - Socket connection
     * @param {string} jid - Group JID
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Object} Group metadata
     */
    async fetch(sock, jid, forceRefresh = false) {
        // Check if already fetching this group
        if (this.pendingRequests.has(jid)) {
            console.log(colors.yellow(`⏳ Waiting for pending request: ${jid}`));
            return await this.pendingRequests.get(jid);
        }

        // Return cached if available and not forcing refresh
        if (!forceRefresh) {
            const cached = this.get(jid);
            if (cached) {
                console.log(colors.green(`✅ Using cached metadata: ${jid}`));
                return cached;
            }
        }

        // Fetch from server
        console.log(colors.cyan(`🔄 Fetching group metadata: ${jid}`));
        
        const fetchPromise = (async () => {
            try {
                const metadata = await sock.groupMetadata(jid);
                this.set(jid, metadata);
                return metadata;
            } catch (error) {
                console.error(colors.red(`❌ Failed to fetch metadata for ${jid}:`), error.message);
                throw error;
            } finally {
                this.pendingRequests.delete(jid);
            }
        })();

        this.pendingRequests.set(jid, fetchPromise);
        return await fetchPromise;
    }

    /**
     * Get group participants from cache
     * @param {string} jid - Group JID
     * @returns {Array} Array of participants
     */
    getParticipants(jid) {
        const metadata = this.get(jid);
        return metadata?.participants || [];
    }

    /**
     * Get group admins from cache
     * @param {string} jid - Group JID
     * @returns {Array} Array of admin JIDs
     */
    getAdmins(jid) {
        const metadata = this.get(jid);
        if (!metadata) return [];
        
        return metadata.participants
            .filter(p => p.admin === "admin" || p.admin === "superadmin")
            .map(p => p.id);
    }

    /**
     * Check if user is admin
     * @param {string} jid - Group JID
     * @param {string} userJid - User JID
     * @returns {boolean}
     */
    isAdmin(jid, userJid) {
        const admins = this.getAdmins(jid);
        return admins.includes(userJid);
    }

    /**
     * Get group subject/name from cache
     * @param {string} jid - Group JID
     * @returns {string} Group name
     */
    getSubject(jid) {
        const metadata = this.get(jid);
        return metadata?.subject || "";
    }

    /**
     * Get group description from cache
     * @param {string} jid - Group JID
     * @returns {string} Group description
     */
    getDesc(jid) {
        const metadata = this.get(jid);
        return metadata?.desc || "";
    }

    /**
     * Update specific participant in cache
     * @param {string} jid - Group JID
     * @param {string} participantJid - Participant JID
     * @param {Object} updates - Updates to apply
     */
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
            console.log(colors.cyan(`📝 Updated participant cache: ${participantJid}`));
        }
    }

    /**
     * Add participant to cache
     * @param {string} jid - Group JID
     * @param {Array} participantJids - Array of participant JIDs to add
     */
    addParticipants(jid, participantJids) {
        const metadata = this.get(jid);
        if (!metadata) return;

        participantJids.forEach(participantJid => {
            const exists = metadata.participants.some(p => p.id === participantJid);
            if (!exists) {
                metadata.participants.push({
                    id: participantJid,
                    admin: null
                });
            }
        });

        this.set(jid, metadata);
        console.log(colors.cyan(`➕ Added participants to cache: ${participantJids.join(", ")}`));
    }

    /**
     * Remove participant from cache
     * @param {string} jid - Group JID
     * @param {Array} participantJids - Array of participant JIDs to remove
     */
    removeParticipants(jid, participantJids) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.participants = metadata.participants.filter(
            p => !participantJids.includes(p.id)
        );

        this.set(jid, metadata);
        console.log(colors.cyan(`➖ Removed participants from cache: ${participantJids.join(", ")}`));
    }

    /**
     * Update group subject in cache
     * @param {string} jid - Group JID
     * @param {string} subject - New subject
     */
    updateSubject(jid, subject) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.subject = subject;
        this.set(jid, metadata);
        console.log(colors.cyan(`📝 Updated group subject in cache: ${jid}`));
    }

    /**
     * Log cache statistics
     */
    logStats() {
        const stats = this.getStats();
        console.log(colors.cyan("\n📊 Cache Statistics:"));
        console.log(colors.white(`   Keys: ${stats.keys}`));
        console.log(colors.white(`   Hits: ${stats.hits}`));
        console.log(colors.white(`   Misses: ${stats.misses}`));
        console.log(colors.white(`   Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%\n`));
    }
}

export default new GroupCache();