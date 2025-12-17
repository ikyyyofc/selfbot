import Database from "better-sqlite3";
import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

export const useSQLiteAuthState = async (dbPath = "./session.db") => {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS auth (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);

    const readData = key => {
        try {
            const row = db.prepare("SELECT value FROM auth WHERE key = ?").get(key);
            if (!row) return null;
            return JSON.parse(row.value, BufferJSON.reviver);
        } catch {
            return null;
        }
    };

    const writeData = (key, value) => {
        const json = JSON.stringify(value, BufferJSON.replacer);
        db.prepare("INSERT OR REPLACE INTO auth (key, value) VALUES (?, ?)").run(key, json);
    };

    const removeData = key => {
        db.prepare("DELETE FROM auth WHERE key = ?").run(key);
    };

    const creds = readData("creds") || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = readData(`${type}-${id}`);
                        if (value) {
                            if (type === "app-state-sync-key") {
                                value = BufferJSON.reviver(null, value);
                            }
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: data => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                writeData(key, value);
                            } else {
                                removeData(key);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: () => {
            writeData("creds", creds);
        }
    };
};