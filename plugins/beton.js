// plugins/button-test.js

export default {
    name: "buttontest",
    desc: "Test sending buttons",
    execute: async ({ sock, m }) => {
        const data = {
            text: "Halo! Ini pesan dengan tombol.",
            footer: "Pencet salah satu ya",
            buttons: [
                { id: "id1", text: "Tombol 1" },
                { id: "id2", text: "Tombol 2" },
                { id: "id3", text: "Tombol 3" }
            ],
            // Bisa juga tambahin media
            // image: { url: "https://link.to/image.jpg" }
        };

        await sock.sendButtons(m.chat, data);
    }
};