import { exec as execSync } from 'child_process';
import util from 'util';

// Bikin 'exec' jadi promise-based biar bisa pake async/await
const exec = util.promisify(execSync);

export default {
    desc: 'Mengupdate bot ke commit terbaru dari repository.',
    rules: {
        owner: true, 
    },
    async execute({ reply }) {
        try {
            await reply('⏳ Lagi narik update dari repo, sabar...');

            const { stdout, stderr } = await exec('git pull');

            // Kalo ada error di stderr tapi ga ada output sukses, kirim error
            if (stderr && !stdout) {
                await reply(`❌ Anjir, error:\n\n\`\`\`${stderr}\`\`\``);
                return;
            }

            // Kalo udah up-to-date
            if (stdout.includes('Already up to date.')) {
                await reply('✅ Udah paling baru, ga ada yang perlu di-update.');
                return;
            }
            
            // Kalo sukses update
            let response = `✅ Update kelar!\n\n*Log:*\n\`\`\`${stdout}\`\`\``;
            
            await reply(response);

        } catch (e) {
            // Tangkep error kalo 'git pull' gagal total
            await reply(`❌ Gagal total pas update:\n\n\`\`\`${e.stderr || e.message}\`\`\``);
        }
    }
};