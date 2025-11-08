
import {
    generateWAMessageFromContent
} from "@whiskeysockets/baileys";
import upload from "../lib/upload.js"

export default {
    name: 'testbutton',
    aliases: ['tbtn'],
    desc: 'Test send button message',
    rules: {
        owner: true
    },
    async execute(context) {
        const {
            sock,
            m
        } = context;

        // 1. Siapin data button-nya
        const buttons = [{
            buttonId: '.mycreator',
            buttonText: {
                displayText: 'Developer'
            },
            type: 1
        }];

        // 2. Siapin footer & content text
        const footerText = 'Script ini tidak bersifat `open source` karena dibuat khusus untuk keperluan pembelajaran dan pengembangan pribadi. \nScript ini dikembangkan berdasarkan base dari Hisoka Morou pada tahun 2021 dan telah mengalami berbagai peningkatan hingga saat ini.';
        const contentText = ' ';

        // 3. Siapin header (pake documentMessage kayak contoh lu)
        // URL & data lainnya bisa lu dapetin dari hasil upload, dll.
        const documentMessage = {
            url: 'https://raw.githubusercontent.com/ikyyyofc/uploader/refs/heads/main/uploads/42400.jpg', // Contoh URL gambar
            mimetype: 'image/jpeg',
            title: 'siang ikyy', // Nama file yang muncul
            fileLength: '99999', // Ukuran file (bisa diisi random)
            pageCount: 0,
            caption: ' ',
            fileName: 'siang ikyy.jpg'
        };

        // 4. Kirim pesannya pake fungsi baru
        await sock.sendButtons(
            m.chat,
            contentText,
            footerText,
            buttons,
            3, // headerType 3 = DOCUMENT
            documentMessage,
            m // quoted
        );

    }
}