import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default {
  desc: "mengupdate bot",
    rules: {
        owner: true
    },
    async execute({ sock, m, reply }) {
        try {
            await reply("🔍 Checking for updates...");

            await execAsync("git fetch origin");

            const { stdout: statusOut } = await execAsync(
                "git rev-list HEAD...origin/main --count"
            );

            const updateCount = parseInt(statusOut.trim());

            if (updateCount === 0) {
                await reply("✅ Bot is already up to date. No restart needed.");
                return;
            }

            const { stdout: logOut } = await execAsync(
                "git log HEAD..origin/main --oneline --pretty=format:'%h - %s'"
            );

            const updateList = logOut.trim().split("\n").join("\n");

            await reply(
                `📦 Found ${updateCount} update(s):\n\n${updateList}\n\nPulling changes...`
            );

            const { stdout: pullOut } = await execAsync("git pull origin main");

            await reply("✅ Update completed. Restarting bot...");

            process.exit(0);
        } catch (error) {
            console.error("Update error:", error);

            if (error.message.includes("CONFLICT")) {
                await reply(
                    "❌ Update failed: Git conflict detected. Please resolve manually."
                );
            } else if (error.message.includes("not a git repository")) {
                await reply(
                    "❌ Update failed: Not a git repository. Please initialize git first."
                );
            } else {
                await reply(`❌ Update failed: ${error.message}`);
            }
        }
    }
};
