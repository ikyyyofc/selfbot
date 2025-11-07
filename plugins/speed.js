
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export default {
    desc: "Mengecek kecepatan bandwidth server",
    rules: {
        owner: true, // Biar cuma owner yang bisa pake
    },
    async execute({ reply }) {
        try {
            // Kasih tau user kalo prosesnya lagi jalan
            await reply("⏳ Mengukur kecepatan bandwidth server, mohon tunggu...");
            
            // Eksekusi script python-nya
            const { stdout, stderr } = await execPromise("python3 speed.py");

            // Kalo ada error dari script-nya, laporin
            if (stderr) {
                await reply(`⚠️ Terjadi error saat eksekusi:\n\n${stderr}`);
                return;
            }
            
            // Kirim hasilnya kalo berhasil
            const output = `*Hasil Speedtest Server:*\n\n\`\`\`${stdout.trim()}\`\`\``;
            await reply(output);

        } catch (error) {
            // Tangkep error kalo command-nya gagal (misal python ga ada)
            console.error(error);
            await reply(`❌ Gagal menjalankan speedtest. Pastikan 'python3' dan 'speedtest-cli' sudah terinstall di server.\n\nError: ${error.message}`);
        }
    },
};