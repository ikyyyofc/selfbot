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

    async getUser(userId) {
        if (this.mode === "cloud") {
            return await this.db.collection("users").findOne({ userId });
        } else {
            return this.localData.users[userId] || null;
        }
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
    }

    async getOrCreateUser(userId) {
        let user = await this.getUser(userId);
        if (!user) {
            user = await this.createUser(userId);
        }
        return user;
    }

    async useLimit(userId, amount = 1) {
        const user = await this.getOrCreateUser(userId);

        if (user.premium) return { success: true, remaining: "∞" };

        if (user.limit < amount) {
            return {
                success: false,
                remaining: user.limit,
                message: "Limit tidak cukup"
            };
        }

        const newLimit = user.limit - amount;
        await this.updateUser(userId, { limit: newLimit });

        return { success: true, remaining: newLimit };
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
        if (this.mode === "cloud") {
            return await this.db.collection("groups").findOne({ groupId });
        } else {
            return this.localData.groups[groupId] || null;
        }
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

    async close() {
        if (this.mode === "cloud" && this.client) {
            await this.client.close();
            console.log(colors.yellow("🔌 MongoDB connection closed"));
        }
    }
}

export default new Database();