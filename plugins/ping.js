// plugins/serverinfo.js
import os from "os";
import si from "systeminformation";

export default async function ({ reply }) {
  try {
    const [cpu, mem, osInfo, disk, net, battery, time, temp, load] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.diskLayout(),
      si.networkInterfaces(),
      si.battery(),
      si.time(),
      si.cpuTemperature(),
      si.currentLoad(),
    ]);

    const uptime = os.uptime();
    const uptimeStr = new Date(uptime * 1000).toISOString().substr(11, 8);

    // Helper to safely format numbers
    const fmt = (num, dec = 2) => (isNaN(num) ? "N/A" : num.toFixed(dec));
    const gb = n => (isNaN(n) ? "N/A" : (n / 1073741824).toFixed(2) + " GB");

    const msg = `
🖥️ *SERVER INFORMATION*
──────────────────────
🏷️ *Hostname:* ${os.hostname()}
💻 *Platform:* ${osInfo.platform || "N/A"} (${osInfo.arch || os.arch()})
🧠 *Distro:* ${osInfo.distro || "N/A"} ${osInfo.release || ""}
⚙️ *Kernel:* ${osInfo.kernel || "N/A"}
📦 *Build:* ${osInfo.build || "N/A"}

⏱️ *Uptime:* ${uptimeStr}
🪫 *Battery:* ${
      battery.hasBattery
        ? `${battery.percent ?? "?"}% (${battery.isCharging ? "Charging" : "Discharging"})`
        : "N/A"
    }

──────────────────────
🧩 *CPU INFORMATION*
──────────────────────
🧠 *Model:* ${cpu.manufacturer || "?"} ${cpu.brand || ""}
📈 *Cores:* ${cpu.cores || "?"} (${cpu.physicalCores || "?"} Physical)
⚡ *Speed:* ${fmt(cpu.speed)} GHz
🌡️ *Temperature:* ${temp.main ? `${fmt(temp.main)}°C` : "N/A"}
📊 *Load (1/5/15min):* ${os.loadavg().map(n => fmt(n)).join(" / ")}
🔥 *Current Load:* ${fmt(load.currentload)}%
🧮 *Cache:* L1:${cpu.cache?.l1d || "?"} KB L2:${cpu.cache?.l2 || "?"} KB L3:${cpu.cache?.l3 || "?"} KB

──────────────────────
💾 *MEMORY INFORMATION*
──────────────────────
🪣 *Total:* ${gb(mem.total)}
📉 *Used:* ${gb(mem.active ?? mem.used)}
📊 *Free:* ${gb(mem.available)}
💢 *Usage:* ${mem.total ? fmt(((mem.active ?? mem.used) / mem.total) * 100) : "N/A"}%

──────────────────────
🗄️ *STORAGE INFORMATION*
──────────────────────
${disk
  .map(
    d =>
      `💽 *${d.name || d.device || "Unknown"}*\nType: ${d.type || "?"}\nSize: ${gb(d.size)}\nInterface: ${d.interfaceType || "?"}\n`
  )
  .join("\n") || "Tidak ada data storage"}

──────────────────────
🌐 *NETWORK INFORMATION*
──────────────────────
${net
  .map(
    n =>
      `🔌 *${n.iface || "?"}*\nIP: ${n.ip4 || "N/A"}\nMAC: ${n.mac || "?"}\nSpeed: ${n.speed || "?"} Mbps\nStatus: ${n.operstate || "?"}\n`
  )
  .join("\n") || "Tidak ada data network"}

──────────────────────
🧾 *NODE & ENVIRONMENT*
──────────────────────
📦 *Node.js:* ${process.version}
🪄 *V8 Version:* ${process.versions.v8}
⚙️ *Arch:* ${process.arch}
🧭 *PID:* ${process.pid}
📂 *CWD:* ${process.cwd()}
🌍 *Timezone:* ${time.timezoneName || Intl.DateTimeFormat().resolvedOptions().timeZone}
🕓 *Current Time:* ${time.current || new Date().toLocaleString("id-ID")}

──────────────────────
✅ _Generated Automatically by System Info Plugin_
`;

    await reply(msg.trim());
  } catch (err) {
    await reply(`❌ Gagal mendapatkan informasi server:\n${err.stack}`);
  }
}