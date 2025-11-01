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

// Helper function untuk word wrap dengan indentasi
const wrapText = (text, maxWidth = 30, indent = "┃    ") => {
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";
    
    for (let word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        if (testLine.length <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    
    if (currentLine) lines.push(currentLine);
    
    // Join dengan indentasi untuk baris kedua dan seterusnya
    return lines.map((line, index) => {
        if (index === 0) return line;
        return `${indent}${line}`;
    }).join("\n");
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
        const files = fs.readdirSync(PLUGIN_DIR).filter(f => 
            f.endsWith(".js") && 
            !f.startsWith("___") && 
            f !== "menu.js"
        );
        
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
        let text = `╭──────────────────╮\n`;
        text += `│                     *${config.BOT_NAME}*\n`;
        text += `╰──────────────────╯\n\n`;

        // User Info Section
        text += `╭─〔 *USER INFO* 〕\n`;
        text += `│\n`;
        text += `│ ◦ Name: ${m.pushName}\n`;
        text += `│ ◦ Number: @${senderNumber}\n`;
        text += `│ ◦ Status: ${isPremium ? "PREMIUM ✨" : isOwner ? "OWNER 👑" : "FREE"}\n`;
        text += `│ ◦ Limit: ${isPremium || isOwner ? "∞" : `${limit}/${config.DEFAULT_LIMIT}`}\n`;
        text += `│\n`;
        text += `╰─────────────────\n\n`;

        // Bot Info Section
        text += `╭─〔 *BOT INFO* 〕\n`;
        text += `│\n`;
        text += `│ ◦ Mode: ${config.BOT_MODE.toUpperCase()}\n`;
        text += `│ ◦ Runtime: ${runtimeText}\n`;
        text += `│ ◦ Platform: ${platform}\n`;
        text += `│ ◦ Memory: ${usedMem}/${totalMem}GB\n`;
        text += `│ ◦ Owner: ${config.OWNER_NAME}\n`;
        text += `│ ◦ Prefix: ${config.PREFIX.join(", ")}\n`;
        text += `│\n`;
        text += `╰─────────────────\n\n`;

        // Commands Section dengan format yang lebih rapi
        const displayCategory = (title, cmds, showForOwner = true) => {
            if (!showForOwner || cmds.length === 0) return "";
            
            let section = `╭─〔 *${title}* 〕\n`;
            section += `│\n`;
            
            cmds.forEach((cmd, index) => {
                const detail = pluginDetails.get(cmd);
                const limitInfo = detail.rules.limit ? ` [${detail.rules.limit}L]` : "";
                const premiumInfo = detail.rules.premium ? " [P]" : "";
                const ownerInfo = detail.rules.owner ? " [O]" : "";
                const badges = limitInfo + premiumInfo + ownerInfo;
                
                // Wrap description dengan indentasi yang tepat
                const desc = wrapText(capitalize(detail.desc));
                
                section += `│ • ${config.PREFIX[0]}${cmd}${badges}\n`;
                section += `│   ${desc}\n`;
                
                // Spacing antar command
                if (index < cmds.length - 1) {
                    section += `│\n`;
                }
            });
            
            section += `│\n`;
            section += `╰─────────────────\n\n`;
            
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
        text += `╭─〔 *EVAL* 〕\n`;
        text += `│\n`;
        text += `│ • > <code>\n`;
        text += `│   Execute JS code\n`;
        text += `│\n`;
        text += `│ • => <code>\n`;
        text += `│   Execute & return\n`;
        text += `│\n`;
        text += `│ • $ <command>\n`;
        text += `│   Execute terminal\n`;
        text += `│\n`;
        text += `╰─────────────────\n\n`;

        // Statistics
        text += `╭─〔 *STATS* 〕\n`;
        text += `│\n`;
        text += `│ Total: ${files.length}\n`;
        text += `│ • General: ${categories.general.length}\n`;
        text += `│ • Group: ${categories.group.length}\n`;
        text += `│ • Admin: ${categories.admin.length}\n`;
        text += `│ • Premium: ${categories.premium.length}\n`;
        if (isOwner) text += `│ • Owner: ${categories.owner.length}\n`;
        text += `│\n`;
        text += `╰─────────────────\n\n`;

        // Footer
        text += `╭─〔 *LEGEND* 〕\n`;
        text += `│\n`;
        text += `│ [L] = Limit\n`;
        text += `│ [P] = Premium\n`;
        text += `│ [O] = Owner\n`;
        text += `│\n`;
        text += `│ 💡 ${config.PREFIX[0]}<command>\n`;
        text += `│\n`;
        text += `╰─────────────────`;

        await m.reply(text, [m.key.participant], { mentions: [m.key.participant] });
    }
};