import {
    makeWASocket,
    useMultiFileAuthState,
    Browsers,
    fetchLatestWaWebVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import pino from "pino";
import colors from "@colors/colors/safe.js";

// Impor handler dan serializer dari bot utama
import serialize from "../lib/serialize.js";
import PluginHandler from "../lib/PluginHandler.js";
import config from "../config.js";

// Map untuk menyimpan semua sesi jadibot yang aktif
export const jadibotSessions = new Map();
const JADIBOT_SESSION_DIR = "jadibot_sessions";

// Pastikan direktori session jadibot ada
if (!fs.existsSync(JADIBOT_SESSION_DIR)) {
    fs.mkdirSync(JADIBOT_SESSION_DIR);
}

// Fungsi utama untuk memulai koneksi jadibot
async function startJadibot(clientJid, mainSock, mainState) {
    const sessionId = clientJid.split("@")[0];
    const sessionPath = path.join(JADIBOT_SESSION_DIR, `session_${sessionId}`);

    // Hapus sesi lama jika ada
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestWaWebVersion();

    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        logger: pino({ level: "silent" }),
        version,
        printQRInTerminal: false, // Kita pake pairing code, jadi QR ga perlu
    });

    // Kirim pairing code ke user
    if (!sock.authState.creds.registered) {
        await mainSock.reply(
            "⏳ Mohon tunggu, sedang meminta pairing code..."
        );
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(clientJid.split("@")[0]);
                await mainSock.reply(
                    `📲 *PAIRING CODE*\n\n` +
                    `Kode kamu: *${code}*\n\n` +
                    `Buka WhatsApp di HP kamu > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon > Masukkan kode.`
                );
            } catch (e) {
                console.error(colors.red("❌ Gagal meminta pairing code:"), e);
                await mainSock.reply("❌ Gagal mendapatkan pairing code. Coba lagi nanti.");
                jadibotSessions.delete(clientJid);
            }
        }, 3000);
    }

    // Listener untuk update koneksi
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(colors.green(`✅ Jadibot connected for: ${clientJid}`));
            jadibotSessions.set(clientJid, { sock, sessionPath });
            await mainSock.sendMessage(clientJid, { 
                text: "🎉 Berhasil terhubung! Kamu sekarang adalah bot.\n\nKirim `.stopjadibot` di chat ini untuk menghentikan sesi.\n\n_Sesi akan otomatis berhenti dalam 30 menit._" 
            });
            
            // Set timeout untuk sesi
            setTimeout(() => {
                if (jadibotSessions.has(clientJid)) {
                    console.log(colors.yellow(`⏰ Sesi jadibot untuk ${clientJid} telah berakhir.`));
                    sock.logout();
                    mainSock.sendMessage(clientJid, { text: "⏰ Sesi jadibot kamu telah berakhir karena batas waktu." });
                }
            }, 30 * 60 * 1000); // 30 menit
        }

        if (connection === "close") {
            const status = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = status !== DisconnectReason.loggedOut;
            console.log(colors.red(`🔌 Jadibot connection closed for ${clientJid}, reason: ${DisconnectReason[status]}`));
            
            if (jadibotSessions.has(clientJid)) {
                jadibotSessions.delete(clientJid);
            }
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        }
    });

    // Simpan kredensial
    sock.ev.on("creds.update", saveCreds);

    // Handler untuk pesan yang masuk ke nomor user
    sock.ev.on("messages.upsert", async ({ messages }) => {
        let m = messages[0];
        if (!m.message) return;

        m = await serialize(m, sock);
        
        // Cek jika user mengirim .stopjadibot ke nomornya sendiri
        if (m.fromMe && m.text.toLowerCase() === ".stopjadibot") {
            await m.reply("🔌 Sesi jadibot dihentikan.");
            sock.logout();
            return;
        }

        // Proses command menggunakan plugin handler dari bot utama
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => m.text.startsWith(p));
        if (!prefix) return;

        const args = m.text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;
        
        if (mainState.plugins.has(command)) {
            const plugin = mainState.plugins.get(command);

            // Buat context baru untuk plugin, tapi pakai socket jadibot
            const context = {
                sock,
                chat: m.chat,
                from: m.chat,
                args,
                text: args.join(" "),
                m,
                isGroup: m.isGroup,
                sender: m.sender,
                reply: async (content, options) => await m.reply(content, options),
                state: mainState,
                // tambahkan properti lain yang mungkin dibutuhkan plugin
            };
            
            // Eksekusi plugin
            try {
                console.log(colors.cyan(` executing '${command}' for jadibot ${clientJid}`));
                await PluginHandler.execute(plugin, context);
            } catch (e) {
                console.error(colors.red(`❌ Jadibot plugin error:`), e);
                await m.reply(`Error saat menjalankan command: ${e.message}`);
            }
        }
    });
}

// Plugin Export
export default {
    name: "jadibot",
    desc: "Menjadi bot sementara menggunakan pairing code.",
    rules: {
        premium: true, // Biar ga sembarang orang pake, bisa ganti ke owner: true
        private: true,
    },
    execute: async (context) => {
        const { sender, reply, sock, state } = context;

        if (jadibotSessions.has(sender)) {
            return await reply("❌ Kamu sudah memiliki sesi jadibot yang aktif.");
        }

        await reply("✅ OK! Memulai sesi jadibot. Silakan cek pesan selanjutnya untuk pairing code.");
        
        try {
            await startJadibot(sender, sock, state);
        } catch (error) {
            console.error(colors.red("❌ Gagal memulai jadibot:"), error);
            await reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    },
};