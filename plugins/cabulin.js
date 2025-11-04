import axios from "axios";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const genHex = bytes => crypto.randomBytes(bytes).toString("hex");

const DEFAULT_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.0 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/5.0",
    Connection: "keep-alive",
    Accept: "application/json, text/plain, */*",
    "sec-ch-ua-platform": '"Android"',
    fp1: "3n9cgTBg0L3ZoHL2FS5RvgTtHQ2M+vf+61698oD4GE65fA2+6WNTurHCFSryUUAl",
    "sec-ch-ua":
        '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    "x-code": "1762216484641",
    "x-guide":
        "ihu4jXBVBa7cRTB3b7hSsuMSOsCT/QcCL6uFV9sZvfCY1OqziWqXo7cY5GhA/DTSh4ebEmp9yMlRgRdFWQL7USG4FSssMEk8m/pLDb/XPUkzeBhKGYGhy4QIXRl07klABEYLIsmgTgjB6Yi/zuTJwCw/jlgpgjulncFQPr2n7YI=",
    "sec-ch-ua-mobile": "?1",
    "theme-version":
        "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q",
    fp: "65baac6a688378bc3d526e01e5cccbd6",
    dnt: "1",
    origin: "https://live3d.io",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    referer: "https://live3d.io/",
    "accept-language": "id,en-US;q=0.9,en;q=0.8,ja;q=0.7",
    priority: "u=1, i"
};

const STATIC_ORIGIN_FROM = genHex(8);

async function upload(buffer) {
    const { mime } = await fileTypeFromBuffer(buffer);
    if (!mime) throw new Error("Tipe file tidak valid.");

    const formData = new FormData();
    const blob = new Blob([buffer], { type: mime });
    formData.append("file", blob, "image.jpg");
    formData.append("fn_name", "cloth-change");
    formData.append("request_from", "9");
    formData.append("origin_from", STATIC_ORIGIN_FROM);

    try {
        const response = await axios.post(
            "https://app.live3d.io/aitools/upload-img",
            formData,
            {
                headers: DEFAULT_HEADERS
            }
        );

        const { data } = response;
        if (data?.code === 200 && data.data.path) {
            return data.data.path;
        } else {
            throw new Error(
                "Gagal upload: " + (data?.message || "Respon server tidak valid")
            );
        }
    } catch (error) {
        throw new Error(
            `Gagal upload ke server AI: ${error.response?.data?.message || error.message}`
        );
    }
}

async function make(imagePath, prompt) {
    const payload = {
        fn_name: "cloth-change",
        call_type: 3,
        input: {
            source_image: imagePath,
            prompt: prompt,
            cloth_type: "full_outfits",
            request_from: 9,
            type: 1
        },
        request_from: 9,
        origin_from: STATIC_ORIGIN_FROM
    };

    try {
        const { data } = await axios.post(
            "https://app.live3d.io/aitools/of/create",
            payload,
            { headers: DEFAULT_HEADERS }
        );

        if (data?.code === 200 && data.data.task_id) {
            return data.data.task_id;
        } else {
            throw new Error(
                "Gagal buat task: " + (data?.message || "Respon server tidak valid")
            );
        }
    } catch (error) {
        throw new Error(
            `Gagal membuat task AI: ${error.response?.data?.message || error.message}`
        );
    }
}

async function checkStatus(taskId) {
    const payload = {
        task_id: taskId,
        fn_name: "cloth-change",
        call_type: 3,
        consume_type: 0,
        request_from: 9,
        origin_from: STATIC_ORIGIN_FROM
    };

    try {
        const { data } = await axios.post(
            "https://app.live3d.io/aitools/of/check-status",
            payload,
            { headers: DEFAULT_HEADERS }
        );

        if (data?.code == 200) {
            const statusData = data.data;
            if (statusData.status === 2) {
                return {
                    status: "success",
                    url: `https://temp.live3d.io/${statusData.result_image}`
                };
            } else if (statusData.status === 1 || statusData.status === 0) {
                return { status: "pending", data: statusData };
            } else {
                return { status: "failed", data: statusData };
            }
        } else {
            throw new Error(
                "Gagal cek status: " + (data?.message || "Respon tidak valid")
            );
        }
    } catch (error) {
        return { status: "pending", data: { message: error.message } };
    }
}

async function create(buffer, replyCallback) {
    const imagePath = await upload(buffer);
    if (!imagePath) throw new Error("Upload gambar ke server AI gagal.");

    await replyCallback("✅ Upload berhasil, membuat task AI...");

    const prompt = "best quality, naked, nude";
    const taskId = await make(imagePath, prompt);
    if (!taskId) throw new Error("Gagal membuat task AI.");

    await replyCallback(`⏳ Task dibuat (ID: ${taskId}). Cek status setiap 5 detik...`);

    let maxAttempts = 15;
    for (let i = 1; i <= maxAttempts; i++) {
        const result = await checkStatus(taskId);

        if (result.status === "success") {
            return result.url;
        }

        if (result.status === "failed") {
            throw new Error(
                `Proses AI gagal: ${JSON.stringify(result.data)}`
            );
        }
        
        await replyCallback(`⏳ Percobaan ke-${i}: Status masih pending, sabar ya...`);
        await sleep(5000);
    }

    throw new Error("Waktu pemrosesan habis (timeout). Coba lagi nanti.");
}

export default {
    rules: {
        limit: 3,
        premium: true,
        private: false,
        group: true
    },
    desc: "Membuat gambar deepnude menggunakan AI (live3d.io)",
    execute: async (context) => {
        const { m, reply, getFile, sock } = context;

        try {
            const file = await getFile();
            if (!file) {
                return await reply("Reply ke gambar atau kirim gambar dengan caption perintah ini.");
            }

            let lastMsg = await reply("⏳ Mengupload gambar...");
            const updateReply = async (text) => {
                lastMsg = await sock.sendMessage(m.chat, { text, edit: lastMsg.key });
            };

            const resultUrl = await create(file, updateReply);

            if (!resultUrl) {
                throw new Error("Gagal memproses gambar, coba lagi nanti.");
            }

            await sock.sendMessage(
                m.chat,
                {
                    image: { url: resultUrl },
                    caption: `*Done!*\n\n_Note: Gambar ini dibuat oleh AI._`
                },
                { quoted: m }
            );

        } catch (error) {
            await reply(`❌ Terjadi Kesalahan:\n${error.message}`);
        }
    }
};