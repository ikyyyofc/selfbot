import makeWASocket, {
    Browsers,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import colors from "@colors/colors/safe.js";
import readline from "readline";
import MessageHandler from "./MessageHandler.js";
import { extendSocket } from "./socket.js";
import groupCache from "./groupCache.js";
import sessionCleaner from "./SessionCleaner.js";
import db from "./Database.js";
import limitScheduler from "./LimitScheduler.js";
import rentReminder from "./RentReminder.js";
import HotReload from "./HotReload.js";

const config = await import("../config.js").then(m => m.default);

class ConnectionManager {
    constructor(state, pluginManager) {
        this.state = state;
        this.pluginManager = pluginManager;
        this.messageHandler = new MessageHandler(state, pluginManager);
        this.hotReload = new HotReload(pluginManager, state);
    }

    async getPairingCode() {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(
                colors.yellow(
                    "📱 Masukkan nomor WhatsApp (contoh: 628123456789): "
                ),
                answer => {
                    rl.close();
                    resolve(answer.trim());
                }
            );
        });
    }

    async connect() {
        await db.connect();

        await this.pluginManager.loadPlugins();

        limitScheduler.start();

        this.hotReload.start();

        console.log(
            colors.green(`Connecting... Mode: ${config.BOT_MODE.toUpperCase()}`)
        );

        sessionCleaner.start();
        sessionCleaner.logStats();

        const { version, isLatest } = await fetchLatestWaWebVersion();
        console.log(
            colors.green(`Using version: ${version}\nLatest: ${isLatest}`)
        );

        const { state, saveCreds } = await useMultiFileAuthState(
            config.SESSION
        );

        const sock = makeWASocket({
          /*  auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    Pino().child({ level: "fatal", stream: "store" })
                )
            },*/
            browser: Browsers.ubuntu("Chrome"),
            logger: Pino({ level: "silent" }),
            syncFullHistory: false,
            markOnlineOnConnect: config.BOT_MODE === "self" ? false : true,
            generateHighQualityLinkPreview: true,
            version
        });

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const pairingNumber = await this.getPairingCode();

                    if (!pairingNumber || pairingNumber.length < 10) {
                        console.error(colors.red("❌ Nomor tidak valid!"));
                        process.exit(1);
                    }

                    const code = await sock.requestPairingCode(
                        pairingNumber,
                        config.PAIRING_CODE
                    );
                    console.log(
                        colors.green(`\n✅ Pairing Code: `) +
                            colors.yellow.bold(code)
                    );
                    console.log(
                        colors.cyan("📲 Masukkan kode ini di WhatsApp kamu\n")
                    );
                } catch (err) {
                    console.error(`Failed to get pairing code: ${err}`);
                }
            }, 3000);
        }

        sock.ev.on("creds.update", saveCreds);
        sock.ev.on("connection.update", update =>
            this.handleConnectionUpdate(update, sock)
        );
        sock.ev.on("messages.upsert", async ({ messages }) => {
            await this.messageHandler.handleMessage(sock, messages[0]);
        });

        sock.ev.on(
            "group-participants.update",
            async ({ id, participants, action }) => {
                console.log(
                    colors.cyan(
                        `👥 Group participants update: ${action} in ${id}`
                    )
                );

                if (action === "add") {
                    groupCache.addParticipants(id, participants);
                } else if (action === "remove") {
                    groupCache.removeParticipants(id, participants);
                } else if (action === "promote" || action === "demote") {
                    await groupCache.fetch(sock, id);
                }
            }
        );

        sock.ev.on("groups.update", async updates => {
            for (const update of updates) {
                console.log(colors.cyan(`🔄 Group update: ${update.id}`));

                if (update.subject) {
                    groupCache.updateSubject(update.id, update.subject);
                }

                if (update.desc) {
                    groupCache.updateDescription(update.id, update.desc);
                }

                if (
                    update.restrict !== undefined ||
                    update.announce !== undefined
                ) {
                    groupCache.updateSettings(update.id, {
                        restrict: update.restrict,
                        announce: update.announce
                    });
                }
            }
        });

        this.setupGracefulShutdown();
    }

    async handleConnectionUpdate(update, sock) {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(
                colors.green("✅ Connected as ") + colors.cyan(sock.user.name)
            );

            await extendSocket(sock);

            await groupCache.initialize(sock);

            rentReminder.start(sock);
        }

        if (connection === "close") {
            const statusCode = new Boom(lastDisconnect?.error)?.output
                ?.statusCode;

            if (
                statusCode === 401 ||
                statusCode === 403 ||
                statusCode === 405
            ) {
                console.warn(
                    colors.red(
                        `⚠️ Session invalid (${statusCode}), resetting...`
                    )
                );
                fs.rmSync(`./${config.SESSION}`, {
                    recursive: true,
                    force: true
                });
            } else {
                console.log(colors.yellow("🔄 Reconnecting..."));
            }

            await this.connect();
        }
    }

    setupGracefulShutdown() {
        process.on("SIGINT", async () => {
            console.log(colors.yellow("\n⏹️  Shutting down..."));

            sessionCleaner.stop();

            limitScheduler.stop();

            rentReminder.stop();

            this.hotReload.stop();

            await db.close();

            groupCache.logStats();

            sessionCleaner.logStats();

            console.log(colors.green("👋 Stopped\n"));
            process.exit(0);
        });
    }
}

export default ConnectionManager;
