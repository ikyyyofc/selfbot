import colors from "@colors/colors/safe.js";

class GroupCache {
    constructor() {
        this.cache = new Map();
        this.initialized = false;
    }

    async initialize(sock) {
        if (this.initialized) return;

        console.log(colors.cyan("📦 Initializing group cache..."));

        try {
            const groups = await sock.groupFetchAllParticipating();
            
            for (const [jid, metadata] of Object.entries(groups)) {
                this.cache.set(jid, metadata);
            }

            this.initialized = true;
            console.log(colors.green(`✅ Cached ${this.cache.size} groups`));
        } catch (error) {
            console.error(colors.red("❌ Failed to initialize cache:"), error.message);
        }
    }

    get(jid) {
        return this.cache.get(jid);
    }

    set(jid, metadata) {
        this.cache.set(jid, metadata);
    }

    has(jid) {
        return this.cache.has(jid);
    }

    delete(jid) {
        this.cache.delete(jid);
    }

    clear() {
        this.cache.clear();
        this.initialized = false;
        console.log(colors.green("✨ Group cache cleared"));
    }

    keys() {
        return Array.from(this.cache.keys());
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
            console.log(colors.cyan(`📝 Updated participant: ${participantJid}`));
        }
    }

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
        console.log(colors.cyan(`➕ Added participants: ${participantJids.join(", ")}`));
    }

    removeParticipants(jid, participantJids) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.participants = metadata.participants.filter(
            p => !participantJids.includes(p.id)
        );

        this.set(jid, metadata);
        console.log(colors.cyan(`➖ Removed participants: ${participantJids.join(", ")}`));
    }

    updateSubject(jid, subject) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.subject = subject;
        this.set(jid, metadata);
        console.log(colors.cyan(`📝 Updated subject: ${jid}`));
    }

    updateDescription(jid, desc) {
        const metadata = this.get(jid);
        if (!metadata) return;

        metadata.desc = desc;
        this.set(jid, metadata);
        console.log(colors.cyan(`📝 Updated description: ${jid}`));
    }

    updateSettings(jid, settings) {
        const metadata = this.get(jid);
        if (!metadata) return;

        Object.assign(metadata, settings);
        this.set(jid, metadata);
        console.log(colors.cyan(`⚙️ Updated settings: ${jid}`));
    }

    async fetch(sock, jid) {
        try {
            console.log(colors.cyan(`🔄 Fetching group: ${jid}`));
            const metadata = await sock.groupMetadata(jid);
            this.set(jid, metadata);
            return metadata;
        } catch (error) {
            console.error(colors.red(`❌ Failed to fetch ${jid}:`), error.message);
            throw error;
        }
    }

    getStats() {
        return {
            total: this.cache.size,
            initialized: this.initialized
        };
    }

    logStats() {
        const stats = this.getStats();
        console.log(colors.cyan("\n📊 Cache Statistics:"));
        console.log(colors.white(`   Total Groups: ${stats.total}`));
        console.log(colors.white(`   Initialized: ${stats.initialized ? "Yes" : "No"}\n`));
    }
}

export default new GroupCache();