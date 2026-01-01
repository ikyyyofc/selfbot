import os from "os";

export default {
    async execute({ sock, m, state }) {
        const config = (await import("../config.js")).default;
        
        const plugins = Array.from(state.plugins.keys()).sort();
        const totalPlugins = plugins.length;
        
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = hours > 0 
            ? `${hours}j ${minutes}m ${seconds}d`
            : minutes > 0 
            ? `${minutes}m ${seconds}d`
            : `${seconds}d`;
        
        const memUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const memTotal = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
        const cpuModel = os.cpus()[0]?.model?.split(" ").slice(0, 3).join(" ") || "Unknown";
        const platform = os.platform();
        const nodeVer = process.version;
        
        const now = new Date().toLocaleString("id-ID", { 
            timeZone: "Asia/Jakarta",
            day: "numeric",
            month: "long", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        
        const prefix = config.PREFIX[0];
        const commandList = plugins.map((cmd, i) => `│ ${i + 1}. ${prefix}${cmd}`).join("\n");
        
        const menu = `
┏━━━━━━━━━━━━━━━━━━━━━┓
┃    ${config.BOT_NAME} MENU
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━「 INFO BOT 」━━━┓
│ 
│ 📛 nama: ${config.BOT_NAME}
│ 👤 owner: ${config.OWNER_NAME}
│ 🎭 mode: ${config.BOT_MODE}
│ 📅 waktu: ${now}
│ 
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━「 SISTEM 」━━━┓
│ 
│ ⏱️ uptime: ${uptimeStr}
│ 💾 ram: ${memUsed} MB
│ 💻 os: ${platform}
│ 🟢 node: ${nodeVer}
│ ⚙️ cpu: ${cpuModel}
│ 
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━「 COMMANDS 」━━━┓
│ 
│ 📊 total: ${totalPlugins} perintah
│ 
${commandList}
│ 
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━「 SPECIAL 」━━━┓
│ 
│ > eval javascript
│ => eval dengan return
│ $ exec terminal
│ 
┗━━━━━━━━━━━━━━━━━━━━━┛
`.trim();

        await m.reply(menu);
    }
};