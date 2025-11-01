const config = await import("../config.js").then(m => m.default);

function levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }
    
    return matrix[b.length][a.length];
}

function getSimilarity(str1, str2) {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - distance / maxLength;
}

export default {
    execute: async (context) => {
        const { m, text } = context;
        
        const prefixes = config.PREFIX || ["."];
        const prefix = prefixes.find(p => text.startsWith(p));
        
        if (!prefix) return true;
        
        const args = text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        
        if (!command) return true;
        
        const plugins = Array.from(context.sock.state?.plugins?.keys() || []);
        
        if (plugins.includes(command)) return true;
        
        const similarCommands = plugins
            .map(cmd => ({
                name: cmd,
                similarity: getSimilarity(command, cmd)
            }))
            .filter(item => item.similarity >= 0.4)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
        
        if (similarCommands.length === 0) return true;
        
        let message = `❌ *Command tidak ditemukan!*\n\n`;
        message += `🔍 Yang kamu cari: *${prefix}${command}*\n\n`;
        message += `💡 *Mungkin maksud kamu:*\n`;
        
        similarCommands.forEach((item, index) => {
            const percentage = Math.round(item.similarity * 100);
            message += `${index + 1}. ${prefix}${item.name} _(${percentage}% match)_\n`;
        });
        
        await m.reply(message);
        
        return false;
    }
};