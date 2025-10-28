export default async ({ m }) => {
    if (!m.text) return true;
    
    const text = m.text.toLowerCase().trim();
    
    if (text === "hahahihi") {
        await m.react("🤣");
    }
    
    return true;
};