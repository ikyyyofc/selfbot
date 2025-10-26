import fs from "fs";
import path from "path";
import colors from "@colors/colors/safe.js";

const config = await import("../config.js").then(m => m.default);

class SessionCleaner {
    constructor(sessionDir = config.SESSION) {
        this.sessionDir = sessionDir;
        this.cleanupInterval = null;
        
        this.config = {
            intervalHours: config.SESSION_CLEANUP_INTERVAL || 6,
            maxSizeMB: config.SESSION_MAX_SIZE_MB || 500,
            protectedFiles: [
                "creds.json",
                "app-state-sync-key-*.json",
                "message_store.json"
            ]
        };

        this.ensureSessionDir();
    }

    ensureSessionDir() {
        if (!fs.existsSync(this.sessionDir)) {
            console.log(colors.yellow("⚠️  Session directory not found, creating..."));
            fs.mkdirSync(this.sessionDir, { recursive: true });
            console.log(colors.green(`✅ Created session directory: ${this.sessionDir}`));
        }
    }

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

        this.cleanup();

        const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, intervalMs);
    }

    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log(colors.yellow("🛑 Session cleaner stopped"));
        }
    }

    async cleanup() {
        try {
            console.log(colors.cyan("\n🧹 Starting aggressive session cleanup..."));

            this.ensureSessionDir();

            const beforeSize = this.getCleanableSize(this.sessionDir);
            const beforeSizeMB = (beforeSize / 1024 / 1024).toFixed(2);

            console.log(
                colors.cyan(`📊 Current cleanable size: ${beforeSizeMB} MB`)
            );

            if (beforeSize / 1024 / 1024 < this.config.maxSizeMB) {
                console.log(
                    colors.green(
                        `✅ Cleanable size below limit (${this.config.maxSizeMB} MB), cleanup skipped`
                    )
                );
                return;
            }

            let deletedCount = 0;
            let deletedSize = 0;
            const files = fs.readdirSync(this.sessionDir);

            for (const file of files) {
                const filePath = path.join(this.sessionDir, file);
                
                try {
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isDirectory()) continue;
                    
                    if (this.isProtected(file)) {
                        console.log(colors.green(`✅ Protected: ${file}`));
                        continue;
                    }
                    
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

            const afterSize = this.getCleanableSize(this.sessionDir);
            const afterSizeMB = (afterSize / 1024 / 1024).toFixed(2);
            const deletedSizeMB = (deletedSize / 1024 / 1024).toFixed(2);

            console.log(
                colors.green(
                    `✅ Cleanup completed: ${deletedCount} files deleted (${deletedSizeMB} MB freed)`
                )
            );
            console.log(
                colors.cyan(`📊 New cleanable size: ${afterSizeMB} MB\n`)
            );
        } catch (error) {
            console.error(
                colors.red("❌ Session cleanup error:"),
                error.message
            );
        }
    }

    isProtected(filename) {
        for (const pattern of this.config.protectedFiles) {
            const regex = this.patternToRegex(pattern);
            if (regex.test(filename)) {
                return true;
            }
        }
        return false;
    }

    patternToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*");
        return new RegExp(`^${escaped}$`);
    }

    getCleanableSize(dirPath) {
        let totalSize = 0;

        try {
            if (!fs.existsSync(dirPath)) return 0;

            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    if (!this.isProtected(file)) {
                        totalSize += stats.size;
                    }
                } else if (stats.isDirectory()) {
                    totalSize += this.getCleanableSize(filePath);
                }
            }
        } catch (error) {
            console.error(
                colors.red("❌ Error calculating cleanable size:"),
                error.message
            );
        }

        return totalSize;
    }

    getFolderSize(dirPath) {
        let totalSize = 0;

        try {
            if (!fs.existsSync(dirPath)) return 0;

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

    async manualCleanup() {
        console.log(colors.cyan("🧹 Manual cleanup triggered..."));
        
        const tempMaxSize = this.config.maxSizeMB;
        this.config.maxSizeMB = 0;
        
        await this.cleanup();
        
        this.config.maxSizeMB = tempMaxSize;
    }

    getStats() {
        try {
            this.ensureSessionDir();

            const totalSize = this.getFolderSize(this.sessionDir);
            const cleanableSize = this.getCleanableSize(this.sessionDir);
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
                cleanableSizeMB: (cleanableSize / 1024 / 1024).toFixed(2),
                cleanableSizeBytes: cleanableSize,
                fileCount: fileList.length,
                protectedCount,
                unprotectedCount,
                maxSizeMB: this.config.maxSizeMB,
                isOverLimit: cleanableSize / 1024 / 1024 > this.config.maxSizeMB
            };
        } catch (error) {
            console.error(
                colors.red("❌ Error getting stats:"),
                error.message
            );
            return null;
        }
    }

    logStats() {
        const stats = this.getStats();
        if (!stats) return;

        console.log(colors.cyan("\n📊 Session Statistics:"));
        console.log(colors.cyan(`   Total Files: ${stats.fileCount}`));
        console.log(colors.green(`   Protected: ${stats.protectedCount}`));
        console.log(colors.yellow(`   Cleanable: ${stats.unprotectedCount}`));
        console.log(colors.cyan(`   Total Size: ${stats.totalSizeMB} MB`));
        console.log(colors.cyan(`   Cleanable Size: ${stats.cleanableSizeMB} MB`));
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

    listProtectedFiles() {
        try {
            this.ensureSessionDir();

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

    listCleanableFiles() {
        try {
            this.ensureSessionDir();

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

const sessionCleaner = new SessionCleaner();

export default sessionCleaner;