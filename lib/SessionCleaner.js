import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";

const config = await import("../config.js").then(m => m.default);

class SessionCleaner {
    constructor(sessionDir = config.SESSION) {
        this.sessionDir = sessionDir;
        this.cleanupInterval = null;
        
        // Konfigurasi cleanup
        this.config = {
            // Interval cleanup (default: setiap 6 jam)
            intervalHours: config.SESSION_CLEANUP_INTERVAL || 6,
            
            // Ukuran maksimal session folder (dalam MB)
            maxSizeMB: config.SESSION_MAX_SIZE_MB || 500,
            
            // HANYA file ini yang TIDAK akan dihapus (whitelist)
            protectedFiles: [
                "creds.json",                       // Kredensial akun (WAJIB)
                "app-state-sync-key-*.json",       // Encryption keys (WAJIB)
                "message_store.json"                // Message store untuk anti-delete
            ]
        };
    }

    /**
     * Mulai auto cleanup dengan interval tertentu
     */
    start() {
        if (this.cleanupInterval) {
            console.log(colors.yellow("⚠️  Session cleaner already running"));
            return;
        }

        console.log(
            colors.cyan(
                `🧹 Session cleaner started (every ${this.config.intervalHours}h)`
            )
        );

        // Cleanup pertama kali saat start
        this.cleanup();

        // Set interval untuk cleanup berkala
        const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, intervalMs);
    }

    /**
     * Stop auto cleanup
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log(colors.yellow("🛑 Session cleaner stopped"));
        }
    }

    /**
     * Cleanup session folder - HAPUS SEMUA kecuali yang protected
     */
    async cleanup() {
        try {
            console.log(colors.cyan("\n🧹 Starting aggressive session cleanup..."));

            if (!fs.existsSync(this.sessionDir)) {
                console.log(colors.yellow("⚠️  Session directory not found"));
                return;
            }

            const beforeSize = this.getFolderSize(this.sessionDir);
            const beforeSizeMB = (beforeSize / 1024 / 1024).toFixed(2);

            console.log(
                colors.cyan(`📊 Current session size: ${beforeSizeMB} MB`)
            );

            // Cek apakah perlu cleanup berdasarkan ukuran
            if (beforeSize / 1024 / 1024 < this.config.maxSizeMB) {
                console.log(
                    colors.green(
                        `✅ Session size below limit (${this.config.maxSizeMB} MB), cleanup skipped`
                    )
                );
                return;
            }

            let deletedCount = 0;
            let deletedSize = 0;
            const files = fs.readdirSync(this.sessionDir);

            // Loop semua file dan hapus yang TIDAK protected
            for (const file of files) {
                const filePath = path.join(this.sessionDir, file);
                
                try {
                    const stats = fs.statSync(filePath);
                    
                    // Skip direktori
                    if (stats.isDirectory()) continue;
                    
                    // Skip file yang protected
                    if (this.isProtected(file)) {
                        console.log(colors.green(`✅ Protected: ${file}`));
                        continue;
                    }
                    
                    // Hapus file
                    deletedSize += stats.size;
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(colors.red(`🗑️  Deleted: ${file}`));
                    
                } catch (error) {
                    console.error(
                        colors.red(`❌ Error deleting ${file}:`),
                        error.message
                    );
                }
            }

            const afterSize = this.getFolderSize(this.sessionDir);
            const afterSizeMB = (afterSize / 1024 / 1024).toFixed(2);
            const deletedSizeMB = (deletedSize / 1024 / 1024).toFixed(2);

            console.log(
                colors.green(
                    `✅ Cleanup completed: ${deletedCount} files deleted (${deletedSizeMB} MB freed)`
                )
            );
            console.log(
                colors.cyan(`📊 New session size: ${afterSizeMB} MB\n`)
            );
        } catch (error) {
            console.error(
                colors.red("❌ Session cleanup error:"),
                error.message
            );
        }
    }

    /**
     * Cek apakah file dilindungi (tidak boleh dihapus)
     */
    isProtected(filename) {
        for (const pattern of this.config.protectedFiles) {
            const regex = this.patternToRegex(pattern);
            if (regex.test(filename)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Convert wildcard pattern ke regex
     */
    patternToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*");
        return new RegExp(`^${escaped}$`);
    }

    /**
     * Hitung ukuran folder
     */
    getFolderSize(dirPath) {
        let totalSize = 0;

        try {
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    totalSize += stats.size;
                } else if (stats.isDirectory()) {
                    totalSize += this.getFolderSize(filePath);
                }
            }
        } catch (error) {
            console.error(
                colors.red("❌ Error calculating folder size:"),
                error.message
            );
        }

        return totalSize;
    }

    /**
     * Manual cleanup (bisa dipanggil via command)
     */
    async manualCleanup() {
        console.log(colors.cyan("🧹 Manual cleanup triggered..."));
        
        // Untuk manual cleanup, langsung cleanup tanpa cek ukuran
        const tempMaxSize = this.config.maxSizeMB;
        this.config.maxSizeMB = 0; // Set ke 0 supaya pasti cleanup
        
        await this.cleanup();
        
        this.config.maxSizeMB = tempMaxSize; // Restore
    }

    /**
     * Get session statistics
     */
    getStats() {
        try {
            const totalSize = this.getFolderSize(this.sessionDir);
            const files = fs.readdirSync(this.sessionDir);
            
            const fileList = files.filter(f => {
                const stats = fs.statSync(path.join(this.sessionDir, f));
                return stats.isFile();
            });
            
            const protectedCount = fileList.filter(f => this.isProtected(f)).length;
            const unprotectedCount = fileList.length - protectedCount;

            return {
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                totalSizeBytes: totalSize,
                fileCount: fileList.length,
                protectedCount,
                unprotectedCount,
                maxSizeMB: this.config.maxSizeMB,
                isOverLimit: totalSize / 1024 / 1024 > this.config.maxSizeMB
            };
        } catch (error) {
            console.error(
                colors.red("❌ Error getting stats:"),
                error.message
            );
            return null;
        }
    }

    /**
     * Log current statistics
     */
    logStats() {
        const stats = this.getStats();
        if (!stats) return;

        console.log(colors.cyan("\n📊 Session Statistics:"));
        console.log(colors.cyan(`   Total Files: ${stats.fileCount}`));
        console.log(colors.green(`   Protected: ${stats.protectedCount}`));
        console.log(colors.yellow(`   Cleanable: ${stats.unprotectedCount}`));
        console.log(colors.cyan(`   Size: ${stats.totalSizeMB} MB`));
        console.log(colors.cyan(`   Limit: ${stats.maxSizeMB} MB`));

        if (stats.isOverLimit) {
            console.log(
                colors.red(`   ⚠️  Over limit! Cleanup will run automatically`)
            );
        } else {
            console.log(colors.green(`   ✅ Within limit`));
        }
        console.log();
    }

    /**
     * List protected files
     */
    listProtectedFiles() {
        try {
            const files = fs.readdirSync(this.sessionDir);
            const protectedFiles = files.filter(f => {
                const stats = fs.statSync(path.join(this.sessionDir, f));
                return stats.isFile() && this.isProtected(f);
            });

            console.log(colors.cyan("\n🔒 Protected Files:"));
            protectedFiles.forEach(f => {
                const size = fs.statSync(path.join(this.sessionDir, f)).size;
                const sizeMB = (size / 1024 / 1024).toFixed(2);
                console.log(colors.green(`   ✅ ${f} (${sizeMB} MB)`));
            });
            console.log();

            return protectedFiles;
        } catch (error) {
            console.error(
                colors.red("❌ Error listing protected files:"),
                error.message
            );
            return [];
        }
    }

    /**
     * List cleanable files (yang akan dihapus)
     */
    listCleanableFiles() {
        try {
            const files = fs.readdirSync(this.sessionDir);
            const cleanableFiles = files.filter(f => {
                const stats = fs.statSync(path.join(this.sessionDir, f));
                return stats.isFile() && !this.isProtected(f);
            });

            console.log(colors.cyan("\n🗑️  Cleanable Files:"));
            cleanableFiles.forEach(f => {
                const size = fs.statSync(path.join(this.sessionDir, f)).size;
                const sizeMB = (size / 1024 / 1024).toFixed(2);
                console.log(colors.yellow(`   🔸 ${f} (${sizeMB} MB)`));
            });
            console.log();

            return cleanableFiles;
        } catch (error) {
            console.error(
                colors.red("❌ Error listing cleanable files:"),
                error.message
            );
            return [];
        }
    }
}

// Create singleton instance
const sessionCleaner = new SessionCleaner();

export default sessionCleaner;