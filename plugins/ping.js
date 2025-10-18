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

    const msg = `
🖥️ *SERVER INFORMATION*
──────────────────────
🏷️ *Hostname:* ${os.hostname()}
💻 *Platform:* ${osInfo.platform} (${osInfo.arch})
🧠 *Distro:* ${osInfo.distro} ${osInfo.release}
⚙️ *Kernel:* ${osInfo.kernel}
📦 *Build:* ${osInfo.build}

⏱️ *Uptime:* ${uptimeStr}
🪫 *Battery:* ${battery.hasBattery ? `${battery.percent}% (${battery.isCharging ? "Charging" : "Discharging"})` : "N/A"}

──────────────────────
🧩 *CPU INFORMATION*
──────────────────────
🧠 *Model:* ${cpu.manufacturer} ${cpu.brand}
📈 *Cores:* ${cpu.cores} (${cpu.physicalCores} Physical)
⚡ *Speed:* ${cpu.speed} GHz
🌡️ *Temperature:* ${temp.main ? temp.main + "°C" : "N/A"}
📊 *Load (1/5/15min):* ${os.loadavg().map(n => n.toFixed(2)).join(" / ")}
🔥 *Current Load:* ${load.currentload.toFixed(2)}%
🧮 *Cache:* L1:${cpu.cache.l1d} KB L2:${cpu.cache.l2} KB L3:${cpu.cache.l3} KB

──────────────────────
💾 *MEMORY INFORMATION*
──────────────────────
🪣 *Total:* ${(mem.total / 1073741824).toFixed(2)} GB
📉 *Used:* ${(mem.active / 1073741824).toFixed(2)} GB
📊 *Free:* ${(mem.available / 1073741824).toFixed(2)} GB
💢 *Usage:* ${((mem.active / mem.total) * 100).toFixed(2)}%

──────────────────────
🗄️ *STORAGE INFORMATION*
──────────────────────
${disk
  .map(
    d =>
      `💽 *${d.name || d.device}*\nType: ${d.type}\nSize: ${(d.size / 1073741824).toFixed(2)} GB\nInterface: ${d.interfaceType}\n`
  )
  .join("\n")}

──────────────────────
🌐 *NETWORK INFORMATION*
──────────────────────
${net
  .map(
    n =>
      `🔌 *${n.iface}*\nIP: ${n.ip4 || "N/A"}\nMAC: ${n.mac}\nSpeed: ${n.speed || "?"} Mbps\nStatus: ${n.operstate}\n`
  )
  .join("\n")}

──────────────────────
🧾 *NODE & ENVIRONMENT*
──────────────────────
📦 *Node.js:* ${process.version}
🪄 *V8 Version:* ${process.versions.v8}
⚙️ *Arch:* ${process.arch}
🧭 *PID:* ${process.pid}
📂 *CWD:* ${process.cwd()}
🌍 *Timezone:* ${time.timezoneName}
🕓 *Current Time:* ${time.current}

──────────────────────
✅ _Generated Automatically by System Info Plugin_
`;

    await reply(msg.trim());
  } catch (err) {
    await reply(`❌ Gagal mendapatkan informasi server: ${err.message}`);
  }
}