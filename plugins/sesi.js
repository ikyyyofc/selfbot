import sessionCleaner from "../lib/SessionCleaner.js";

export default async function ({ m, args }) {
    const command = args[0]?.toLowerCase();

    try {
        // Command: stats / info
        if (command === "stats" || command === "info") {
            const stats = sessionCleaner.getStats();
            
            if (!stats) {
                return await m.reply("❌ Gagal mendapatkan statistik session");
            }

            let message = "📊 *SESSION STATISTICS*\n\n";
            message += `📁 Total Files: ${stats.fileCount}\n`;
            message += `🔒 Protected: ${stats.protectedCount}\n`;
            message += `🗑️ Cleanable: ${stats.unprotectedCount}\n`;
            message += `💾 Size: ${stats.totalSizeMB} MB\n`;
            message += `⚠️ Limit: ${stats.maxSizeMB} MB\n`;
            message += `📈 Usage: ${((stats.totalSizeBytes / (stats.maxSizeMB * 1024 * 1024)) * 100).toFixed(1)}%\n\n`;

            if (stats.isOverLimit) {
                message += "🔴 *Status:* Over Limit!\n";
                message += "💡 Cleanup otomatis akan berjalan";
            } else {
                message += "🟢 *Status:* Normal";
            }

            return await m.reply(message);
        }

        // Command: list
        if (command === "list") {
            const stats = sessionCleaner.getStats();
            
            if (!stats) {
                return await m.reply("❌ Gagal mendapatkan statistik session");
            }

            let message = "📋 *SESSION FILES*\n\n";
            message += `🔒 *Protected Files (${stats.protectedCount}):*\n`;
            message += `├ creds.json\n`;
            message += `├ app-state-sync-key-*.json\n`;
            message += `└ message_store.json\n\n`;
            message += `🗑️ *Cleanable Files: ${stats.unprotectedCount}*\n`;
            message += `(Semua file lain akan dihapus saat cleanup)\n\n`;
            message += `💡 Gunakan .cleansession untuk cleanup`;

            return await m.reply(message);
        }

        // Default: Cleanup
        const beforeStats = sessionCleaner.getStats();
        await m.reply("🧹 Memulai cleanup session...\n⏳ Mohon tunggu...");

        await sessionCleaner.manualCleanup();

        const afterStats = sessionCleaner.getStats();
        const freedMB = (beforeStats.totalSizeMB - afterStats.totalSizeMB).toFixed(2);
        const deletedFiles = beforeStats.fileCount - afterStats.fileCount;

        let message = "✅ *CLEANUP SELESAI*\n\n";
        message += `🗑️ Files Deleted: ${deletedFiles}\n`;
        message += `💾 Space Freed: ${freedMB} MB\n\n`;
        message += `📊 Statistik saat ini:\n`;
        message += `📁 Files: ${afterStats.fileCount}\n`;
        message += `🔒 Protected: ${afterStats.protectedCount}\n`;
        message += `💾 Size: ${afterStats.totalSizeMB} MB`;

        await m.reply(message);

    } catch (error) {
        await m.reply(`❌ Error: ${error.message}`);
    }
}