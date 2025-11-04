import { gotScraping } from "got-scraping";
import FormData from "form-data";
import crypto from "crypto";

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

const deepNude = {
    upload: async buffer => {
        try {
            let data = new FormData();
            data.append("file", buffer, {
                filename: "img.jpg",
                contentType: "image/jpeg"
            });
            data.append("fn_name", "cloth-change");
            data.append("request_from", "9");
            data.append("origin_from", STATIC_ORIGIN_FROM);

            const response = await gotScraping.post(
                "https://app.live3d.io/aitools/upload-img",
                {
                    body: data,
                    headers: DEFAULT_HEADERS,
                    responseType: "json"
                }
            );

            if (
                response.body &&
                response.body.code === 200 &&
                response.body.data.path
            ) {
                return response.body.data.path;
            } else {
                throw new Error(
                    "Upload gagal: " + (response.body.message || "Unknown error")
                );
            }
        } catch (error) {
            throw new Error(`Upload error: ${error.message}`);
        }
    },

    make: async imagePath => {
        try {
            const payload = {
                fn_name: "cloth-change",
                call_type: 3,
                input: {
                    source_image: imagePath,
                    prompt: "best quality, naked, nude",
                    cloth_type: "full_outfits",
                    request_from: 9,
                    type: 1
                },
                request_from: 9,
                origin_from: STATIC_ORIGIN_FROM
            };

            const response = await gotScraping.post(
                "https://app.live3d.io/aitools/of/create",
                {
                    json: payload,
                    headers: DEFAULT_HEADERS,
                    responseType: "json"
                }
            );

            if (
                response.body &&
                response.body.code === 200 &&
                response.body.data.task_id
            ) {
                return response.body.data.task_id;
            } else {
                throw new Error(
                    "Task creation gagal: " +
                        (response.body.message || "Unknown error")
                );
            }
        } catch (error) {
            throw new Error(`Task error: ${error.message}`);
        }
    },

    status: async taskId => {
        try {
            const payload = {
                task_id: taskId,
                fn_name: "cloth-change",
                call_type: 3,
                consume_type: 0,
                request_from: 9,
                origin_from: STATIC_ORIGIN_FROM
            };

            const response = await gotScraping.post(
                "https://app.live3d.io/aitools/of/check-status",
                {
                    json: payload,
                    headers: DEFAULT_HEADERS,
                    responseType: "json"
                }
            );

            if (response.body && response.body.code == 200) {
                const data = response.body.data;
                if (data.status === 2) {
                    return {
                        status: "success",
                        url: "https://temp.live3d.io/" + data.result_image
                    };
                } else if (data.status === 1 || data.status === 0) {
                    return { status: "pending", data };
                } else {
                    return {
                        status: "failed",
                        message: data.fail_reason || "Gagal proses gambar"
                    };
                }
            } else {
                throw new Error(
                    "Check status gagal: " +
                        (response.body.message || "Unknown error")
                );
            }
        } catch (error) {
            return { status: "pending", data: { status: -1 } };
        }
    },

    create: async buffer => {
        try {
            const imagePath = await deepNude.upload(buffer);
            const taskId = await deepNude.make(imagePath);

            let maxAttempts = 15;
            for (let i = 0; i < maxAttempts; i++) {
                const result = await deepNude.status(taskId);
                if (result.status === "success") {
                    return { success: true, url: result.url };
                } else if (result.status === "failed") {
                    throw new Error(result.message);
                }
                await sleep(5000);
            }
            throw new Error("Waktu habis, servernya lagi sibuk kayaknya.");
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default {
    desc: "AI Nude Generator dari live3d.io (18+)",
    rules: {
        premium: true,
        limit: 5 // kepake kalo user ga premium
    },
    execute: async ({ m, reply, sock }) => {
        if (!m.quoted || !/image/i.test(m.quoted.msg?.mimetype)) {
            await reply("Reply ke gambar, Cok.");
            return;
        }

        await m.react("⏳");
        await reply(
            "Sabar ya, lagi diproses nih... Mungkin semenit dua menit, jangan dispam."
        );

        const buffer = await m.quoted.download();
        if (!buffer) {
            await reply("Gagal download gambar, coba lagi dah.");
            return;
        }

        const result = await deepNude.create(buffer);

        if (result.success) {
            await sock.sendMessage(
                m.chat,
                {
                    image: { url: result.url },
                    caption: `Nih hasilnya, jangan disebar aneh-aneh ya. Dosa tanggung sendiri.\n\n_by: shannz_`
                },
                { quoted: m }
            );
        } else {
            await reply(`Gagal bro: ${result.message}`);
        }
        await m.react("✅");
    }
};