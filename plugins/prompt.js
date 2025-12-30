import gemini from "../lib/gemini.js";

export default {
    rules: {
        usage: "reply atau kirim gambar dengan caption .analisis <pertanyaan>"
    },
    async execute(context) {
        const { m, text, reply, getFile } = context;

        try {
            const file = await getFile();
            await m.react("🤔");
            await reply("sabar gw proses dulu...");

            const system = `{
"system_prompt": "ANALISIS GAMBAR INPUT DAN HASILKAN SATU PROMPT TUNGGAL YANG SUPER DETAIL UNTUK AI IMAGE EDITING REALISTIC DUNIA NYA. HANYA KELUARKAN PROMPT SAJA, TANPA TEKS LAIN APAPUN, TANPA PENJELASAN, TANPA FORMAT JSON, TANPA KOMENTAR. Prompt harus: 1) Fotorealistik murni, 2) Detail ekstrem parameter teknis fotografi, 3) Konsisten fisika dunia nyata, 4) Struktur terorganisir rapi.",

"realism_mandates": {
"strict_realism_only": "HANYA STYLE REALISTIC PHOTOGRAPHY DUNIA NYA. TOLAK SEMUA ELEMEN: anime, cartoon, painting, drawing, stylized, fantasy, vector, 2D, digital art, watercolor, oil painting, sketch, manga, comic, pixel art, low poly, character design, fantasi, tidak mungkin fisik.",
"physics_requirements": [
"Cahaya mengikuti hukum fisika nyata (inverse square law, color temperature akurat)",
"Bayangan memiliki umbra/penumbra yang benar berdasarkan ukuran sumber cahaya",
"Refleksi mengikuti sifat material (roughness, metallicity)",
"Refraksi mengikuti hukum Snell untuk transparansi",
"Perspektif linear projection dengan vanishing point akurat",
"Atmospheric scattering untuk objek jauh",
"Proporsi anatomi manusia normal (jika ada manusia)",
"Material properties mempengaruhi interaksi cahaya secara fisik"
],
"photography_authenticity": [
"Pola noise sesuai ISO dan ukuran sensor kamera spesifik",
"Bentuk bokeh sesuai bilah aperture lensa spesifik",
"Chromatic aberration meningkat ke tepi frame",
"Vignetting mengikuti formula optik lensa",
"Motion blur arah sesuai gerakan objek",
"Depth of field mengikuti circle of confusion",
"Dynamic range sesuai kemampuan sensor kamera",
"Color response sesuai profil warna kamera/merek spesifik"
]
},

"prompt_architecture": {
"fixed_structure_order": "PHOTOGRAPHY_STYLE + CAMERA_EQUIPMENT + LENS_SETTINGS + LIGHTING_SETUP + ENVIRONMENT_CONTEXT + SUBJECT_DETAILS + COMPOSITION + TECHNICAL_SPECS + POST_PROCESSING + REALISM_ENHANCEMENTS + NEGATIVE_PROMPT",

},

"generation_instructions": "GABUNGKAN SEMUA ELEMEN DI ATAS MENJADI SATU PROMPT PANJANG TUNGGAL DENGAN STRUKTUR RAPI. GUNAKAN KOMA UNTUK PEMISAH. PROMPT HARUS: 1) Diawali dengan genre fotografi, 2) Spesifikasikan kamera dan lensa, 3) Detail pengaturan teknis, 4) Jelaskan pencahayaan, 5) Konteks lingkungan, 6) Detail subjek, 7) Komposisi, 8) Spesifikasi teknis, 9) Post-processing, 10) Peningkatan realisme, 11) Akhiri dengan negative prompt. PANJANG PROMPT 300-500 KATA. HANYA OUTPUT PROMPT SAJA."
}`;

            const prompt = text;
            const messages = [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ];
            const result = await gemini(messages, file);

            await reply(result);
        } catch (error) {
            console.error(error);
            await reply("error cuy, coba lagi ntar");
        }
    }
};
