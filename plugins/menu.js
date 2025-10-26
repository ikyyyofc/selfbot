export default async ({ sock, m, reply }) => {
    const plugins = Array.from(m.sock.user.state.plugins.keys());
    
    let menu = `╭─── *MENU BOT* ───╮\n\n`;
    menu += `Hai ${m.pushName}! 👋\n`;
    menu += `Total ada ${plugins.length} command yang bisa dipake\n\n`;
    
    menu += `*📌 Available Commands:*\n\n`;
    
    plugins.forEach(cmd => {
        menu += `◦ .${cmd}\n`;
    });
    
    menu += `\n╰───────────────╯\n\n`;
    menu += `_Ketik .help <command> buat info detail_`;
    
    await reply(menu);
};