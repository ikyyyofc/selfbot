import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function ({ sock, m, reply }) {
    try {
        await reply("🔍 Checking for updates...");

        // Fetch latest changes from remote
        const { stdout: fetchOut } = await execAsync("git fetch origin");

        // Check if there are differences between local and remote
        const { stdout: statusOut } = await execAsync(
            "git rev-list HEAD...origin/main --count"
        );

        const updateCount = parseInt(statusOut.trim());

        if (updateCount === 0) {
            await reply("✅ Bot is already up to date. No restart needed.");
            return;
        }

        // Get commit messages for updates
        const { stdout: logOut } = await execAsync(
            "git log HEAD..origin/main --oneline --pretty=format:'%h - %s'"
        );

        const updateList = logOut.trim().split("\n").join("\n");

        await reply(
            `📦 Found ${updateCount} update(s):\n\n${updateList}\n\nPulling changes...`
        );

        // Pull the latest changes
        const { stdout: pullOut, stderr: pullErr } = await execAsync(
            "git pull origin main"
        );

        if (pullErr && !pullErr.includes("Already up to date")) {
            throw new Error(pullErr);
        }

        await reply("✅ Update completed. Restarting bot...");

        // Wait a moment before restarting
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Restart the process
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