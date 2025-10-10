import "./config.js";
import makeWASocket, {
    Browsers,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = await import("./config.js").then(m => m.default);

const plugins = new Map();
const PLUGIN_DIR = path.join(__dirname, "plugins");

async function loadPlugins() {
    try {
        if (!fs.existsSync(PLUGIN_DIR)) {
            fs.mkdirSync(PLUGIN_DIR);
        }

        plugins.clear();
        const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith(".js"));

        for (const file of files) {
            try {
                const pluginPath = path.join(PLUGIN_DIR, file);
                const pluginUrl = `file://${pluginPath}?update=${Date.now()}`;
                const execute = await import(pluginUrl).then(m => m.default);

                if (typeof execute === "function") {
                    const command = path.basename(file, ".js");
                    plugins.set(command, execute);
                }
            } catch (error) {
                console.error(colors.red(`❌ Plugin ${file}:`), error.message);
            }
        }

        console.log(colors.cyan(`🔌 ${plugins.size} plugins loaded`));
    } catch (error) {
        console.error(colors.red("❌ Plugin error:"), error);
    }
}

const connect = async () => {
    await loadPlugins();
    console.log(colors.green("Connecting..."));

    const { state, saveCreds } = await useMultiFileAuthState(config.SESSION);

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                Pino().child({ level: "fatal", stream: "store" })
            )
        },
        browser: Browsers.ubuntu("Chrome"),
        logger: Pino({ level: "silent" }),
        syncFullHistory: false,
        markOnlineOnConnect: false
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(
                    config.PAIRING_NUMBER
                );
                console.log(
                    colors.green(`Pairing Code: `) + colors.yellow(code)
                );
            } catch (err) {
                console.error(`Failed to get pairing code: ${err}`);
            }
        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(
                colors.green("✅ Connected as ") + colors.cyan(sock.user.name)
            );
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const boom = new Boom(lastDisconnect?.error);
            const statusCode = boom?.output?.statusCode;

            if (reason === DisconnectReason.loggedOut || statusCode === 401) {
                console.log(colors.red("❌ Logged out"));
                fs.rmSync(`./${config.SESSION}`, {
                    recursive: true,
                    force: true
                });
                await connect();
                return;
            }

            switch (statusCode) {
                case 403:
                    console.warn(colors.red("⚠️ Account banned"));
                    fs.rmSync(`./${config.SESSION}`, {
                        recursive: true,
                        force: true
                    });
                    await connect();
                    break;
                case 405:
                    console.warn(colors.yellow("⚠️ Not logged in"));
                    fs.rmSync(`./${config.SESSION}`, {
                        recursive: true,
                        force: true
                    });
                    await connect();
                    break;
                default:
                    console.log(colors.yellow("🔄 Reconnecting..."));
                    await connect();
                    break;
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        // Self bot - hanya respon pesan dari bot sendiri
        if (!isGroup && !m.key.fromMe) return;
        if (
            isGroup &&
            !m.key.participant === (await sock.user.lid.split(":")[0]) + "@lid"
        )
            return;

        let text =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.documentMessage?.caption ||
            "";

        text = text.trim();
        if (!text) return;

        // Check prefix
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => text.startsWith(p));
        if (!prefix) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;

        console.log(colors.cyan(`📩 ${command}`));

        // Eval
        if (command === ">" || command === "=>") {
            const isReturn = command.startsWith("=>");
            const code = isReturn ? text.slice(3).trim() : text.slice(2).trim();

            if (!code) {
                await sock.sendMessage(from, { text: "No code provided" });
                return;
            }

            try {
                const evalFunc = new Function(
                    "sock",
                    "from",
                    "m",
                    "plugins",
                    "config",
                    "fs",
                    "path",
                    "util",
                    "colors",
                    "loadPlugins",
                    "isGroup",
                    isReturn
                        ? `return (async () => { return ${code} })()`
                        : `return (async () => { ${code} })()`
                );

                const result = await evalFunc(
                    sock,
                    from,
                    m,
                    plugins,
                    config,
                    fs,
                    path,
                    util,
                    colors,
                    loadPlugins,
                    isGroup
                );
                const output = util.inspect(result, { depth: 2 });
                await sock.sendMessage(from, { text: `✅ Eval:\n\n${output}` });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: `❌ Eval Error:\n\n${error.message}`
                });
            }
            return;
        }

        // Exec
        if (command === "$") {
            const cmd = text.slice(2).trim();
            if (!cmd) {
                await sock.sendMessage(from, { text: "No command provided" });
                return;
            }

            try {
                await sock.sendMessage(from, { text: `⏳ Executing: ${cmd}` });
                const { stdout, stderr } = await execPromise(cmd);
                let output = "";
                if (stdout) output += `stdout:\n${stdout}`;
                if (stderr)
                    output += `${stdout ? "\n\n" : ""}stderr:\n${stderr}`;
                if (!output) output = "✅ Executed (no output)";

                await sock.sendMessage(from, {
                    text:
                        output.length > 4000
                            ? output.substring(0, 4000) + "\n\n... (truncated)"
                            : output
                });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: `❌ Exec Error:\n\n${error.message}`
                });
            }
            return;
        }

        // Plugin execution
        if (plugins.has(command)) {
            try {
                const execute = plugins.get(command);

                // Download media if available
                let fileBuffer = null;
                const quotedMsg =
                    m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

                if (
                    quotedMsg?.imageMessage ||
                    quotedMsg?.videoMessage ||
                    quotedMsg?.documentMessage ||
                    quotedMsg?.audioMessage
                ) {
                    try {
                        fileBuffer = await downloadMediaMessage(
                            { message: quotedMsg },
                            "buffer",
                            {},
                            {
                                logger: Pino({ level: "silent" }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );
                    } catch (e) {}
                }

                if (
                    !fileBuffer &&
                    (m.message?.imageMessage ||
                        m.message?.videoMessage ||
                        m.message?.documentMessage ||
                        m.message?.audioMessage)
                ) {
                    try {
                        fileBuffer = await downloadMediaMessage(
                            m,
                            "buffer",
                            {},
                            {
                                logger: Pino({ level: "silent" }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );
                    } catch (e) {}
                }

                const context = {
                    sock,
                    from,
                    args,
                    text: args.join(" "),
                    message: m,
                    fileBuffer,
                    reply: async content => {
                        if (typeof content === "string") {
                            return await sock.sendMessage(from, {
                                text: content
                            });
                        }
                        return await sock.sendMessage(from, content);
                    }
                };

                await execute(context);
                console.log(colors.green(`✅ ${command} executed`));
            } catch (error) {
                console.error(colors.red(`❌ Plugin error:`), error);
                await sock.sendMessage(from, {
                    text: `❌ Plugin error: ${error.message}`
                });
            }
            return;
        }
    });

    process.on("SIGINT", () => {
        console.log(colors.yellow("\n⏹️  Shutting down..."));
        console.log(colors.green("👋 Stopped\n"));
        process.exit(0);
    });
};

connect();
console.log(colors.cyan("🤖 Starting bot...\n"));
