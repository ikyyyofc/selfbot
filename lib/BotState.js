import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";

const config = await import("../config.js").then(m => m.default);

const MESSAGE_STORE_LIMIT = config.MESSAGE_STORE_LIMIT || 200;
const MESSAGE_STORE_FILE = path.join(config.SESSION, "message_store.json");
const MESSAGE_SAVE_INTERVAL = config.MESSAGE_SAVE_INTERVAL || 50;

class BotState {
    constructor() {
        this.plugins = new Map();
        this.messageStore = this.loadMessageStore();
        this.messageCounter = 0;
        this.isDirty = false;
        
        this.startAutoSave();
    }

    loadMessageStore() {
        try {
            if (fs.existsSync(MESSAGE_STORE_FILE)) {
                const data = fs.readFileSync(MESSAGE_STORE_FILE, "utf8");
                const parsed = JSON.parse(data);
                const store = new Map(Object.entries(parsed));
                console.log(
                    colors.cyan(`💾 Loaded ${store.size} messages from storage`)
                );
                return store;
            }
        } catch (error) {
            console.error(
                colors.red("❌ Failed to load message store:"),
                error.message
            );
        }
        return new Map();
    }

    saveMessageStore() {
        if (!this.isDirty) return;
        
        try {
            const obj = Object.fromEntries(this.messageStore);
            fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(obj, null, 2));
            this.isDirty = false;
        } catch (error) {
            console.error(
                colors.red("❌ Failed to save message store:"),
                error.message
            );
        }
    }

    addMessage(messageId, data) {
        if (this.messageStore.size >= MESSAGE_STORE_LIMIT) {
            const firstKey = this.messageStore.keys().next().value;
            this.messageStore.delete(firstKey);
        }

        const lightData = {
            message: {
                key: data.message.key,
                messageTimestamp: data.message.messageTimestamp,
                message: data.message.message,
                pushName: data.message.pushName,
                sender: data.message.sender
            },
            from: data.from,
            timestamp: data.timestamp
        };

        this.messageStore.set(messageId, lightData);
        this.messageCounter++;
        this.isDirty = true;

        if (this.messageCounter % MESSAGE_SAVE_INTERVAL === 0) {
            this.saveMessageStore();
        }
    }

    addEditHistory(messageId, newMessage) {
        const storedData = this.messageStore.get(messageId);
        if (!storedData) return;

        if (!storedData.editHistory) {
            storedData.editHistory = [];
        }

        const editCount = storedData.editHistory.length + 1;
        storedData.editHistory.push({
            message: newMessage,
            timestamp: Date.now(),
            editNumber: editCount
        });

        this.messageStore.set(messageId, storedData);
        this.isDirty = true;
    }

    startAutoSave() {
        setInterval(() => {
            if (this.isDirty) {
                this.saveMessageStore();
            }
        }, 60000);
    }

    cleanup() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000;
        let cleaned = 0;

        for (const [key, data] of this.messageStore.entries()) {
            if (now - data.timestamp > maxAge) {
                this.messageStore.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(colors.yellow(`🧹 Cleaned ${cleaned} old messages`));
            this.isDirty = true;
            this.saveMessageStore();
        }
    }
}

export default BotState;