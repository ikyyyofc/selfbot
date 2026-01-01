export default {
    execute: async ({ sock, m, state }) => {
        const config = (await import("../config.js")).default;
        
        const plugins = Array.from(state.plugins.keys()).sort();
        
        const categories = {
            "🤖 AI & Tools": ["ai", "gemini", "gpt", "chat", "tts", "tr", "ocr"],
            "🎵 Media": ["play", "ytmp3", "ytmp4", "spotify", "tiktok", "ig", "fb"],
            "🖼️ Image": ["sticker", "s", "toimg", "hd", "removebg", "waifu", "anime"],
            "🔧 Utility": ["ping", "runtime", "speed", "info", "owner", "sc"],
            "👥 Group": ["kick", "add", "promote", "demote", "tagall", "hidetag", "group"],
            "🎮 Fun": ["truth", "dare", "quote", "fakta", "zodiak", "cuaca"],
            "📥 Downloader": ["mediafire", "gdrive", "apk", "pinterest"],
            "🔍 Search": ["google", "wiki", "kbbi", "brainly", "lirik"],
            "💰 Economy": ["daily", "weekly", "transfer", "balance", "slot", "casino"],
            "⚙️ Settings": ["setpp", "setname", "setwelcome", "setbye", "antilink"]
        };
        
        const categorized = {};
        const uncategorized = [];
        
        for (const cmd of plugins) {
            let found = false;
            for (const [cat, cmds] of Object.entries(categories)) {
                if (cmds.includes(cmd)) {
                    if (!categorized[cat]) categorized[cat] = [];
                    categorized[cat].push(cmd);
                    found = true;
                    break;
                }
            }
            if (!found) uncategorized.push(cmd);
        }
        
        if (uncategorized.length > 0) {
            categorized["📦 Lainnya"] = uncategorized;
        }
        
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${hours}j ${minutes}m ${seconds}s`;
        
        const memory = process.memoryUsage();
        const memUsed = Math.round(memory.heapUsed / 1024 / 1024);
        const memTotal = Math.round(memory.heapTotal / 1024 / 1024);
        
        const now = new Date().toLocaleString("id-ID", { 
            timeZone: "Asia/Jakarta",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        
        const hour = new Date().toLocaleString("id-ID", { 
            timeZone: "Asia/Jakarta", 
            hour: "numeric", 
            hour12: false 
        });
        const h = parseInt(hour);
        const greeting = h >= 4 && h < 11 ? "Selamat Pagi" : 
                        h >= 11 && h < 15 ? "Selamat Siang" : 
                        h >= 15 && h < 18 ? "Selamat Sore" : "Selamat Malam";
        
        const prefix = config.PREFIX[0];
        const totalCmd = plugins.length;
        const userName = m.pushName || "User";
        
        let menu = `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ✦ ${config.BOT_NAME} ✦
╰━━━━━━━━━━━━━━━━━━━━━╯

┌─❏ *${greeting}, ${userName}!*
│
├ 📅 ${now}
├ ⏱️ Uptime: ${uptimeStr}
├ 💾 RAM: ${memUsed}/${memTotal} MB
├ 📊 Total: ${totalCmd} commands
├ 🔖 Prefix: [ ${config.PREFIX.join(" | ")} ]
└─────────────────

`;

        for (const [category, cmds] of Object.entries(categorized)) {
            if (cmds.length === 0) continue;
            
            menu += `╭──「 ${category} 」\n`;
            menu += `│\n`;
            
            for (const cmd of cmds) {
                menu += `│ ◦ ${prefix}${cmd}\n`;
            }
            
            menu += `│\n`;
            menu += `╰──────────────\n\n`;
        }

        menu += `╭━━━━「 INFO 」━━━━╮
┃
┃ Owner: @${config.OWNER_NUMBER}
┃ Mode: ${config.BOT_MODE.toUpperCase()}
┃ Bot: ${config.BOT_NAME}
┃
╰━━━━━━━━━━━━━━━━━╯

> _powered by ${config.OWNER_NAME}_`;

        await sock.sendMessage(m.chat, {
            text: menu,
            contextInfo: {
                mentionedJid: [`${config.OWNER_NUMBER}@s.whatsapp.net`],
                externalAdReply: {
                    title: `${config.BOT_NAME} - Menu`,
                    body: `${totalCmd} Commands Available`,
                    thumbnailUrl: "https://raw.githubusercontent.com/ikyyyofc/uploader/refs/heads/main/uploads/42400.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
    }
};