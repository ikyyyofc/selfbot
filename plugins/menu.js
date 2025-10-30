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

// Helper function untuk memotong teks panjang
const truncateText = (text, maxLength = 45) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
};

// Helper function untuk capitalize
const capitalize = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
};

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
        const senderNumber = m.key.participant.replace(/[^0-9]/g, "");
        const isOwner = m.sender.split("@")[0] === ownerNumber;

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

        // Header dengan box style yang lebih rapi
        let text = `┏━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `┃ *${config.BOT_NAME}*\n`;
        text += `┗━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // User Info Section
        text += `┏━━━ *USER INFO* ━━━\n`;
        text += `┃ Name : ${m.pushName}\n`;
        text += `┃ Number : @${senderNumber}\n`;
        text += `┃ Status : ${isPremium ? "PREMIUM ✨" : isOwner ? "OWNER 👑" : "FREE USER"}\n`;
        text += `┃ Limit : ${isPremium || isOwner ? "Unlimited ∞" : `${limit}/${config.DEFAULT_LIMIT}`}\n`;
        text += `┗━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Bot Info Section
        text += `┏━━━ *BOT INFO* ━━━\n`;
        text += `┃ Mode : ${config.BOT_MODE.toUpperCase()}\n`;
        text += `┃ Runtime : ${runtimeText}\n`;
        text += `┃ Platform : ${platform} (${arch})\n`;
        text += `┃ Memory : ${usedMem}GB/${totalMem}GB\n`;
        text += `┃ Owner : ${config.OWNER_NAME}\n`;
        text += `┃ Prefix : ${config.PREFIX.join(", ")}\n`;
        text += `┗━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Commands Section dengan format yang lebih rapi
        const displayCategory = (title, cmds, showForOwner = true) => {
            if (!showForOwner || cmds.length === 0) return "";
            
            let section = `┏━━━ *${title}* ━━━\n`;
            cmds.forEach((cmd, index) => {
                const detail = pluginDetails.get(cmd);
                const limitInfo = detail.rules.limit ? ` [${detail.rules.limit}L]` : "";
                const premiumInfo = detail.rules.premium ? " [P]" : "";
                const ownerInfo = detail.rules.owner ? " [O]" : "";
                const badges = limitInfo + premiumInfo + ownerInfo;
                
                // Truncate description jika terlalu panjang
                const desc = truncateText(capitalize(detail.desc));
                
                section += `┃\n`;
                section += `┃ ${config.PREFIX[0]}${cmd}${badges}\n`;
                section += `┃ ↳ ${desc}\n`;
            });
            section += `┗━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            return section;
        };

        // Display categories
        text += displayCategory("GENERAL COMMANDS", categories.general);
        text += displayCategory("GROUP COMMANDS", categories.group);
        text += displayCategory("ADMIN COMMANDS", categories.admin);
        text += displayCategory("PREMIUM COMMANDS", categories.premium);
        
        if (isOwner && categories.owner.length > 0) {
            text += displayCategory("OWNER COMMANDS", categories.owner);
        }

        // Eval Commands
        text += `┏━━━ *EVAL COMMANDS* ━━━\n`;
        text += `┃\n`;
        text += `┃ > <code>\n`;
        text += `┃ ↳ Execute JavaScript code\n`;
        text += `┃\n`;
        text += `┃ => <code>\n`;
        text += `┃ ↳ Execute & return result\n`;
        text += `┃\n`;
        text += `┃ $ <command>\n`;
        text += `┃ ↳ Execute terminal command\n`;
        text += `┗━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Statistics
        text += `┏━━━ *STATISTICS* ━━━\n`;
        text += `┃ Total Commands : ${files.length}\n`;
        text += `┃ General : ${categories.general.length}\n`;
        text += `┃ Group : ${categories.group.length}\n`;
        text += `┃ Admin : ${categories.admin.length}\n`;
        text += `┃ Premium : ${categories.premium.length}\n`;
        if (isOwner) text += `┃ Owner : ${categories.owner.length}\n`;
        text += `┗━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Footer
        text += `┏━━━ *NOTES* ━━━\n`;
        text += `┃ [L] = Limit Required\n`;
        text += `┃ [P] = Premium Required\n`;
        text += `┃ [O] = Owner Only\n`;
        text += `┃\n`;
        text += `┃ 💡 Ketik ${config.PREFIX[0]}<command>\n`;
        text += `┃    untuk menggunakan fitur\n`;
        text += `┗━━━━━━━━━━━━━━━━━━━━━━━`;

        await m.reply(text, [m.key.participant], { mentions: [m.key.participant] });
    }
};