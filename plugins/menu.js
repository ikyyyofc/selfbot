import db from "../lib/Database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import os from "os";

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

        const pluginDetails = new Map();

        for (const file of files) {
            const cmd = path.basename(file, ".js");
            
            try {
                const pluginPath = path.join(PLUGIN_DIR, file);
                const pluginUrl = `file://${pluginPath}?t=${Date.now()}`;
                const module = await import(pluginUrl);
                const plugin = module.default;
                
                if (!plugin || typeof plugin.execute !== "function") continue;
                
                const rules = plugin.rules || {};
                const desc = plugin.desc || "No description";
                const usage = plugin.usg || `${config.PREFIX[0]}${cmd}`;
                const example = plugin.eg || "";
                
                pluginDetails.set(cmd, { rules, desc, usage, example });
                
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

        const runtime = process.uptime();
        const days = Math.floor(runtime / 86400);
        const hours = Math.floor((runtime % 86400) / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = Math.floor(runtime % 60);

        const runtimeText = days > 0 
            ? `${days}d ${hours}h ${minutes}m` 
            : hours > 0 
            ? `${hours}h ${minutes}m ${seconds}s`
            : `${minutes}m ${seconds}s`;

        const platform = os.platform();
        const arch = os.arch();
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const usedMem = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);

        let text = `╭━━━━━『 *${config.BOT_NAME}* 』━━━━━╮\n`;
        text += `│\n`;
        text += `│ 👤 *USER INFO*\n`;
        text += `│ ├ Name: ${m.pushName}\n`;
        text += `│ ├ Number: @${senderNumber}\n`;
        text += `│ ├ Status: ${isPremium ? "PREMIUM ✨" : isOwner ? "OWNER 👑" : "FREE USER"}\n`;
        text += `│ └ Limit: ${isPremium || isOwner ? "Unlimited ∞" : `${limit} / ${config.DEFAULT_LIMIT}`}\n`;
        text += `│\n`;
        text += `│ 🤖 *BOT INFO*\n`;
        text += `│ ├ Mode: ${config.BOT_MODE.toUpperCase()}\n`;
        text += `│ ├ Runtime: ${runtimeText}\n`;
        text += `│ ├ Platform: ${platform} (${arch})\n`;
        text += `│ ├ Memory: ${usedMem}GB / ${totalMem}GB\n`;
        text += `│ ├ Owner: ${config.OWNER_NAME}\n`;
        text += `│ └ Prefix: ${config.PREFIX.join(", ")}\n`;
        text += `│\n`;
        text += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        if (categories.general.length > 0) {
            text += `╭━━━『 *GENERAL COMMANDS* 』\n`;
            categories.general.forEach(cmd => {
                const detail = pluginDetails.get(cmd);
                const limitInfo = detail.rules.limit ? ` [${detail.rules.limit}L]` : "";
                text += `│ ✦ ${config.PREFIX[0]}${cmd}${limitInfo}\n`;
                text += `│   └ ${detail.desc.charAt(0).toUpperCase() + detail.desc.slice(1)}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━\n\n`;
        }

        if (categories.group.length > 0) {
            text += `╭━━━『 *GROUP COMMANDS* 』\n`;
            categories.group.forEach(cmd => {
                const detail = pluginDetails.get(cmd);
                const limitInfo = detail.rules.limit ? ` [${detail.rules.limit}L]` : "";
                text += `│ ✦ ${config.PREFIX[0]}${cmd}${limitInfo}\n`;
                text += `│   └ ${detail.desc.charAt(0).toUpperCase() + detail.desc.slice(1)}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━\n\n`;
        }

        if (categories.admin.length > 0) {
            text += `╭━━━『 *ADMIN COMMANDS* 』\n`;
            categories.admin.forEach(cmd => {
                const detail = pluginDetails.get(cmd);
                const limitInfo = detail.rules.limit ? ` [${detail.rules.limit}L]` : "";
                text += `│ ✦ ${config.PREFIX[0]}${cmd}${limitInfo}\n`;
                text += `│   └ ${detail.desc.charAt(0).toUpperCase() + detail.desc.slice(1)}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━\n\n`;
        }

        if (categories.premium.length > 0) {
            text += `╭━━━『 *PREMIUM COMMANDS* 』\n`;
            categories.premium.forEach(cmd => {
                const detail = pluginDetails.get(cmd);
                text += `│ ✦ ${config.PREFIX[0]}${cmd} [P]\n`;
                text += `│   └ ${detail.desc.charAt(0).toUpperCase() + detail.desc.slice(1)}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━\n\n`;
        }

        if (isOwner && categories.owner.length > 0) {
            text += `╭━━━『 *OWNER COMMANDS* 』\n`;
            categories.owner.forEach(cmd => {
                const detail = pluginDetails.get(cmd);
                text += `│ ✦ ${config.PREFIX[0]}${cmd} [O]\n`;
                text += `│   └ ${detail.desc.charAt(0).toUpperCase() + detail.desc.slice(1)}\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━\n\n`;
        }

        text += `╭━━━『 *EVAL COMMANDS* 』\n`;
        text += `│ ✦ > <code>\n`;
        text += `│   └ Execute JavaScript code\n`;
        text += `│ ✦ => <code>\n`;
        text += `│   └ Execute & return result\n`;
        text += `│ ✦ $ <command>\n`;
        text += `│   └ Execute terminal command\n`;
        text += `╰━━━━━━━━━━━━━━━━━━\n\n`;

        text += `╭━━━『 *STATISTICS* 』\n`;
        text += `│ • Total Commands: ${files.length}\n`;
        text += `│ • General: ${categories.general.length}\n`;
        text += `│ • Group: ${categories.group.length}\n`;
        text += `│ • Admin: ${categories.admin.length}\n`;
        text += `│ • Premium: ${categories.premium.length}\n`;
        if (isOwner) text += `│ • Owner: ${categories.owner.length}\n`;
        text += `╰━━━━━━━━━━━━━━━━━━\n\n`;

        text += `_💡 Tip: Ketik ${config.PREFIX[0]}help <command> untuk detail_\n`;
        text += "*_📌 Note_*\n" 
        
        text += "[L] = Limit Required\n" 
        text += "[P] = Premium Required\n"
        
        text += "[O] Owner Required`;

        await m.reply(text, { mentions: [m.sender] });
    }
};