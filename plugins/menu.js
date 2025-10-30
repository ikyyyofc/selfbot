import db from "../lib/Database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const config = await import("../config.js").then(m => m.default);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGIN_DIR = path.join(__dirname);

export default {
    rules: {
        limit: 0,
        premium: false,
        owner: false,
        group: false,
        private: false,
        admin: false
    },

    async execute({ sock, m, args }) {
        const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js") && !f.startsWith("___"));
        
        const categories = {
            owner: [],
            premium: [],
            group: [],
            admin: [],
            general: []
        };

        for (const file of files) {
            const cmd = path.basename(file, ".js");
            
            try {
                const pluginPath = path.join(PLUGIN_DIR, file);
                const pluginUrl = `file://${pluginPath}?t=${Date.now()}`;
                const module = await import(pluginUrl);
                const plugin = module.default;
                
                if (!plugin || typeof plugin.execute !== "function") continue;
                
                const rules = plugin.rules || {};
                
                if (rules.owner) {
                    categories.owner.push(cmd);
                } else if (rules.premium) {
                    categories.premium.push(cmd);
                } else if (rules.admin) {
                    categories.admin.push(cmd);
                } else if (rules.group) {
                    categories.group.push(cmd);
                } else {
                    categories.general.push(cmd);
                }
            } catch (e) {
                continue;
            }
        }

        const user = await db.getOrCreateUser(m.sender);
        const isPremium = user.premium;
        const limit = user.limit;

        const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
        const senderNumber = m.sender.replace(/[^0-9]/g, "");
        const isOwner = senderNumber === ownerNumber;

        let text = `╭━━━『 *${config.BOT_NAME}* 』━━━╮\n`;
        text += `│ 👤 *User:* ${m.pushName}\n`;
        text += `│ 📱 *Nomor:* ${senderNumber}\n`;
        text += `│ 💎 *Status:* ${isPremium ? "PREMIUM ✨" : isOwner ? "OWNER 👑" : "FREE"}\n`;
        text += `│ 🎯 *Limit:* ${isPremium || isOwner ? "∞" : limit}\n`;
        text += `╰━━━━━━━━━━━━━━━━━╯\n\n`;

        if (categories.general.length > 0) {
            text += `╭━━━『 *GENERAL* 』━━━\n`;
            categories.general.forEach(cmd => {
                text += `│ • ${config.PREFIX[0]}${cmd}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━\n\n`;
        }

        if (categories.group.length > 0) {
            text += `╭━━━『 *GROUP* 』━━━\n`;
            categories.group.forEach(cmd => {
                text += `│ • ${config.PREFIX[0]}${cmd}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━\n\n`;
        }

        if (categories.admin.length > 0) {
            text += `╭━━━『 *ADMIN* 』━━━\n`;
            categories.admin.forEach(cmd => {
                text += `│ • ${config.PREFIX[0]}${cmd}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━\n\n`;
        }

        if (categories.premium.length > 0) {
            text += `╭━━━『 *PREMIUM* 』━━━\n`;
            categories.premium.forEach(cmd => {
                text += `│ • ${config.PREFIX[0]}${cmd}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━\n\n`;
        }

        if (isOwner && categories.owner.length > 0) {
            text += `╭━━━『 *OWNER* 』━━━\n`;
            categories.owner.forEach(cmd => {
                text += `│ • ${config.PREFIX[0]}${cmd}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━\n\n`;
        }

        text += `╭━━━『 *EVAL* 』━━━\n`;
        text += `│ • > (eval)\n`;
        text += `│ • => (eval return)\n`;
        text += `│ • $ (exec)\n`;
        text += `╰━━━━━━━━━━━━━━━\n\n`;

        text += `╭━━━『 *INFO* 』━━━\n`;
        text += `│ 📦 *Total Commands:* ${files.length}\n`;
        text += `│ 🤖 *Bot Mode:* ${config.BOT_MODE.toUpperCase()}\n`;
        text += `│ 👨‍💻 *Owner:* ${config.OWNER_NAME}\n`;
        text += `╰━━━━━━━━━━━━━━━\n\n`;

        text += `_Ketik ${config.PREFIX[0]}help <command> untuk detail command_`;

        await m.reply(text);
    }
};