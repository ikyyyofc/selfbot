import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execPromise = promisify(exec);

async function getSystemInfo() {
    const info = {
        os: os.platform(),
        hostname: os.hostname(),
        kernel: os.release(),
        uptime: formatUptime(os.uptime()),
        shell: process.env.SHELL || "unknown",
        cpu: os.cpus()[0].model,
        memory: `${Math.round(
            (os.totalmem() - os.freemem()) / 1024 / 1024
        )}MiB / ${Math.round(os.totalmem() / 1024 / 1024)}MiB`,
        architecture: os.arch()
    };

    try {
        const { stdout: distro } = await execPromise(
            "cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'"
        );
        info.distro = distro.trim();
    } catch {
        info.distro = `${os.type()} ${os.release()}`;
    }

    return info;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
}

function createAsciiArt() {
    const colors = {
        reset: "\x1b[0m",
        cyan: "\x1b[36m",
        blue: "\x1b[34m",
        green: "\x1b[32m",
        yellow: "\x1b[33m"
    };

    return `${colors.cyan}
       _,met\$\$\$\$\$gg.
    ,g\$\$\$\$\$\$\$\$\$\$\$\$\$\$\$P.
  ,g\$\$P"     """Y\$\$."".
 ,\$\$P'              \`\$\$\$.
',\$\$P       ,ggs.     \`\$\$b:
\`d\$\$'     ,\$P"'   .    \$\$\$
 \$\$P      d\$'     ,    \$\$P
 \$\$:      \$\$.   -    ,d\$\$'
 \$\$;      Y\$b._   _,d\$P'
 Y\$\$.    \`.\`"Y\$\$\$\$P"'
 \`\$\$b      "-.__
  \`Y\$\$
   \`Y\$\$.
     \`\$\$b.
       \`Y\$\$b.
          \`"Y\$b._
              \`"""
${colors.reset}`;
}

async function displayNeofetch() {
    const info = await getSystemInfo();
    const ascii = createAsciiArt();
    const lines = ascii.split("\n");

    const data = [
        `\x1b[1m${info.hostname}\x1b[0m`,
        "-".repeat(info.hostname.length),
        `\x1b[33mOS:\x1b[0m ${info.distro}`,
        `\x1b[33mKernel:\x1b[0m ${info.kernel}`,
        `\x1b[33mUptime:\x1b[0m ${info.uptime}`,
        `\x1b[33mShell:\x1b[0m ${info.shell}`,
        `\x1b[33mCPU:\x1b[0m ${info.cpu}`,
        `\x1b[33mMemory:\x1b[0m ${info.memory}`,
        `\x1b[33mArchitecture:\x1b[0m ${info.architecture}`
    ];

    console.log("\n");
    const maxLen = Math.max(lines.length, data.length);
    for (let i = 0; i < maxLen; i++) {
        const asciiLine = lines[i] || "";
        const dataLine = data[i] || "";
        console.log(`${asciiLine.padEnd(40)}  ${dataLine}`);
    }
    console.log("\n");
}

displayNeofetch();

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
}