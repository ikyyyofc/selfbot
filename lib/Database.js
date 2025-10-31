import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";

const config = await import("../config.js").then(m => m.default);

class Database {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.mode = config.DB_MODE || "local";
        this.localPath = path.join(config.SESSION, "database.json");
        this.localData = { users: {}, groups: {}, premium: [] };
        
        this.userCache = new Map();
        this.groupCache = new Map();
        this.cacheExpiry = 60000;
    }

    async connect() {
        if (this.mode === "cloud") {
            return await this.connectMongoDB();
        } else {
            return this.connectLocal();
        }
    }

    async connectMongoDB() {
        try {
            if (!config.MONGODB_URI) {
                console.log(
                    colors.yellow(
                        "⚠️  MongoDB URI not set, falling back to local mode"
                    )
                );
                this.mode = "local";
                return this.connectLocal();
            }

            this.client = new MongoClient(config.MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(config.DB_NAME || "whatsapp_bot");
            this.isConnected = true;

            console.log(colors.green("✅ Connected to MongoDB"));
            return true;
        } catch (error) {
            console.error(
                colors.red("❌ MongoDB connection failed:"),
                error.message
            );
            console.log(colors.yellow("⚠️  Falling back to local mode"));
            this.mode = "local";
            return this.connectLocal();
        }
    }

    connectLocal() {
        try {
            if (fs.existsSync(this.localPath)) {
                const data = fs.readFileSync(this.localPath, "utf8");
                this.localData = JSON.parse(data);
            } else {
                this.saveLocal();
            }
            this.isConnected = true;
            console.log(colors.green("✅ Connected to local database"));
            return true;
        } catch (error) {
            console.error(
                colors.red("❌ Local database error:"),
                error.message
            );
            return false;
        }
    }

    saveLocal() {
        try {
            fs.writeFileSync(
                this.localPath,
                JSON.stringify(this.localData, null, 2)
            );
        } catch (error) {
            console.error(colors.red("❌ Save local error:"), error.message);
        }
    }

    getCachedUser(userId) {
        const cached = this.userCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCachedUser(userId, data) {
        this.userCache.set(userId, {
            data,
            timestamp: Date.now()
        });
    }

    getCachedGroup(groupId) {
        const cached = this.groupCache.get(groupId);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCachedGroup(groupId, data) {
        this.groupCache.set(groupId, {
            data,
            timestamp: Date.now()
        });
    }

    async getUser(userId) {
        const cached = this.getCachedUser(userId);
        if (cached) return cached;

        let user;
        if (this.mode === "cloud") {
            user = await this.db.collection("users").findOne({ userId });
        } else {
            user = this.localData.users[userId] || null;
        }

        if (user) this.setCachedUser(userId, user);
        return user;
    }

    async createUser(userId, data = {}) {
        const defaultData = {
            userId,
            limit: config.DEFAULT_LIMIT || 20,
            premium: false,
            registered: Date.now(),
            ...data
        };

        if (this.mode === "cloud") {
            await this.db.collection("users").insertOne(defaultData);
        } else {
            this.localData.users[userId] = defaultData;
            this.saveLocal();
        }

        this.setCachedUser(userId, defaultData);
        return defaultData;
    }

    async updateUser(userId, data) {
        if (this.mode === "cloud") {
            await this.db
                .collection("users")
                .updateOne({ userId }, { $set: data });
        } else {
            if (!this.localData.users[userId]) {
                this.localData.users[userId] = { userId };
            }
            this.localData.users[userId] = {
                ...this.localData.users[userId],
                ...data
            };
            this.saveLocal();
        }

        const user = await this.getUser(userId);
        if (user) {
            this.setCachedUser(userId, { ...user, ...data });
        }
    }

    async getOrCreateUser(userId) {
        let user = await this.getUser(userId);
        if (!user) {
            user = await this.createUser(userId);
        }
        return user;
    }

    async checkAndUseLimit(userId, amount = 1) {
        const user = await this.getOrCreateUser(userId);

        if (user.premium) {
            return { success: true, remaining: "∞", user };
        }

        if (user.limit < amount) {
            return {
                success: false,
                remaining: user.limit,
                message: "Limit tidak cukup",
                user
            };
        }

        const newLimit = user.limit - amount;
        await this.updateUser(userId, { limit: newLimit });
        user.limit = newLimit;

        return { success: true, remaining: newLimit, user };
    }

    async useLimit(userId, amount = 1) {
        const result = await this.checkAndUseLimit(userId, amount);
        return {
            success: result.success,
            remaining: result.remaining,
            message: result.message
        };
    }

    async addLimit(userId, amount) {
        const user = await this.getOrCreateUser(userId);
        const newLimit = user.limit + amount;
        await this.updateUser(userId, { limit: newLimit });
        return newLimit;
    }

    async isPremium(userId) {
        const user = await this.getUser(userId);
        return user?.premium || false;
    }

    async setPremium(userId, status = true) {
        await this.updateUser(userId, { premium: status });

        if (this.mode === "cloud") {
            if (status) {
                await this.db
                    .collection("premium")
                    .insertOne({ userId, since: Date.now() });
            } else {
                await this.db.collection("premium").deleteOne({ userId });
            }
        } else {
            if (status) {
                if (!this.localData.premium.includes(userId)) {
                    this.localData.premium.push(userId);
                }
            } else {
                this.localData.premium = this.localData.premium.filter(
                    id => id !== userId
                );
            }
            this.saveLocal();
        }
    }

    async getGroup(groupId) {
        const cached = this.getCachedGroup(groupId);
        if (cached) return cached;

        let group;
        if (this.mode === "cloud") {
            group = await this.db.collection("groups").findOne({ groupId });
        } else {
            group = this.localData.groups[groupId] || null;
        }

        if (group) this.setCachedGroup(groupId, group);
        return group;
    }

    async getOrCreateGroup(groupId) {
        let group = await this.getGroup(groupId);
        if (!group) {
            const defaultSettings = {
                groupId,
                approved: false,
                antilink: false,
                antitoxic: false,
                welcome: false,
                autodownload: false,
                autosticker: false,
                createdAt: Date.now()
            };
            
            if (this.mode === "cloud") {
                await this.db.collection("groups").insertOne(defaultSettings);
            } else {
                this.localData.groups[groupId] = defaultSettings;
                this.saveLocal();
            }
            
            group = defaultSettings;
            this.setCachedGroup(groupId, group);
        }
        return group;
    }

    async updateGroup(groupId, data) {
        if (this.mode === "cloud") {
            await this.db
                .collection("groups")
                .updateOne({ groupId }, { $set: data }, { upsert: true });
        } else {
            if (!this.localData.groups[groupId]) {
                this.localData.groups[groupId] = { groupId };
            }
            this.localData.groups[groupId] = {
                ...this.localData.groups[groupId],
                ...data
            };
            this.saveLocal();
        }

        const group = await this.getGroup(groupId);
        if (group) {
            this.setCachedGroup(groupId, { ...group, ...data });
        }
    }

    async getGroupSettings(groupId) {
        const group = await this.getOrCreateGroup(groupId);
        return {
            antilink: group.antilink || false,
            antitoxic: group.antitoxic || false,
            welcome: group.welcome || false,
            autodownload: group.autodownload || false,
            autosticker: group.autosticker || false
        };
    }

    async updateGroupSettings(groupId, settings) {
        await this.updateGroup(groupId, settings);
    }

    async resetLimits() {
        const resetLimit = config.DEFAULT_LIMIT || 20;

        if (this.mode === "cloud") {
            await this.db
                .collection("users")
                .updateMany({ premium: false }, { $set: { limit: resetLimit } });
        } else {
            Object.keys(this.localData.users).forEach(userId => {
                const user = this.localData.users[userId];
                if (!user.premium) {
                    user.limit = resetLimit;
                }
            });
            this.saveLocal();
        }

        this.userCache.clear();
        console.log(colors.green("✅ All user limits reset"));
    }

    async getAllUsers() {
        if (this.mode === "cloud") {
            return await this.db.collection("users").find({}).toArray();
        } else {
            return Object.values(this.localData.users);
        }
    }

    async getAllGroups() {
        if (this.mode === "cloud") {
            return await this.db.collection("groups").find({}).toArray();
        } else {
            return Object.values(this.localData.groups);
        }
    }

    clearCache() {
        this.userCache.clear();
        this.groupCache.clear();
        console.log(colors.green("✨ Database cache cleared"));
    }

    async close() {
        if (this.mode === "cloud" && this.client) {
            await this.client.close();
            console.log(colors.yellow("🔌 MongoDB connection closed"));
        }
        this.clearCache();
    }
}

export default new Database();