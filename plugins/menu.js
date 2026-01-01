export default {
    async execute({ reply, state }) {
        const plugins = Array.from(state.plugins.keys()).sort();
        
        let menu = `╭──「 *MENU* 」
│
│ Total: ${plugins.length} commands
│
├──「 *Commands* 」\n`;

        plugins.forEach(cmd => {
            menu += `│ • .${cmd}\n`;
        });

        menu += `│
╰──────────────`;

        await reply(menu);
    }
};