import fetch from "node-fetch";
import FormData from "form-data";
import crypto from "crypto";

const headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "id-ID,id;q=0.7",
    Origin: "https://nano-banana-pro.co",
    Referer: "https://nano-banana-pro.co/",
    "sec-ch-ua-platform": '"Android"',
    "sec-ch-ua-mobile": "?1",
    "sec-gpc": "1",
    priority: "u=1, i"
};

const createTempMail = async () => {
    try {
        const r = await fetch("https://api.nekolabs.web.id/tools/tempmail/v1/create");
        return (await r.json()).result;
    } catch {
        return null;
    }
};

const checkInbox = async id => {
    try {
        const r = await fetch(`https://api.nekolabs.web.id/tools/tempmail/v1/inbox?id=${id}`);
        return (await r.json()).result;
    } catch {
        return null;
    }
};

export default {
    name: "nano",
    description: "Edit gambar pake AI Nano Banana Pro",
    category: "ai",

    async execute({ m, args }) {
        const text = args.join(" ");

        if (!m.quoted?.isMedia && !m.isMedia) {
            return await m.reply(
                `Reply gambar dulu bro!\n\nContoh:\nReply gambar terus ketik:\n.nano jadi anime`
            );
        }

        if (!text) {
            return await m.reply(
                `Kasih prompt dong!\n\nContoh:\nReply gambar terus ketik:\n.nano jadi anime`
            );
        }

        await m.reply("⏳ lagi edit gambar pake AI nih, tunggu bentar ya...");

        try {
            const emailData = await createTempMail();
            if (!emailData) {
                return await m.reply("❌ gagal bikin email temporary bro");
            }

            const { email, sessionId } = emailData;
            const password = "Pass" + crypto.randomBytes(4).toString("hex") + "!";
            const name = "User" + crypto.randomBytes(2).toString("hex");

            await fetch("https://nano-banana-pro.co/api/auth/sign-up/email", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name })
            });

            let verifyLink = null;
            let attempts = 0;

            while (attempts < 20 && !verifyLink) {
                await delay(3000);
                const inbox = await checkInbox(sessionId);
                if (inbox?.emails?.length) {
                    const body = inbox.emails[0].text || inbox.emails[0].html || "";
                    const match = body.match(/https:\/\/nano-banana-pro\.co\/api\/auth\/verify-email\?token=[^\s"]+/);
                    if (match) verifyLink = match[0];
                }
                attempts++;
            }

            if (!verifyLink) {
                return await m.reply("❌ timeout verifikasi email bro, coba lagi");
            }

            const verifyRes = await fetch(verifyLink, { headers, redirect: "manual" });
            const rawCookies = verifyRes.headers.raw()["set-cookie"];
            const cookie = rawCookies ? rawCookies.map(v => v.split(";")[0]).join("; ") : "";

            if (!cookie) {
                return await m.reply("❌ cookie ga ketemu anjir");
            }

            const media = await (m.quoted?.isMedia ? m.quoted.download() : m.download());
            const mime = m.quoted?.msg?.mimetype || m.msg?.mimetype || "image/jpeg";
            
            const form = new FormData();
            form.append("files", media, { filename: "image.jpg", contentType: mime });

            const upRes = await fetch("https://nano-banana-pro.co/api/storage/upload-image", {
                method: "POST",
                headers: { ...headers, Cookie: cookie, ...form.getHeaders() },
                body: form
            });

            const upJson = await upRes.json();
            const uploadedUrl = upJson?.data?.urls?.[0];

            if (!uploadedUrl) {
                return await m.reply("❌ upload gambar gagal bro");
            }

            const payload = {
                mediaType: "image",
                scene: "image-to-image",
                provider: "kie",
                model: "nano-banana",
                prompt: text,
                options: { image_input: [uploadedUrl] }
            };

            const genRes = await fetch("https://nano-banana-pro.co/api/ai/generate", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json", Cookie: cookie },
                body: JSON.stringify(payload)
            });

            const genJson = await genRes.json();
            const taskId = genJson?.data?.id;

            if (!taskId) {
                return await m.reply("❌ gagal dapet task ID nih");
            }

            let resultImg = null;
            let poll = 0;

            while (poll < 60 && !resultImg) {
                await delay(4000);

                const qRes = await fetch("https://nano-banana-pro.co/api/ai/query", {
                    method: "POST",
                    headers: { ...headers, "Content-Type": "application/json", Cookie: cookie },
                    body: JSON.stringify({ taskId })
                });

                const type = qRes.headers.get("content-type") || "";

                if (type.includes("image")) {
                    resultImg = await qRes.buffer();
                    break;
                }

                const json = await qRes.json().catch(() => ({}));
                const taskStr = json?.data?.taskResult;
                
                if (!taskStr) {
                    poll++;
                    continue;
                }

                let task;
                try {
                    task = JSON.parse(taskStr);
                } catch {
                    poll++;
                    continue;
                }

                if (["waiting", "pending"].includes(task.state)) {
                    poll++;
                    continue;
                }

                if (["failed", "error"].includes(task.state)) {
                    return await m.reply(`❌ task gagal: ${task.failMsg || "unknown error"}`);
                }

                if (["success", "completed"].includes(task.state)) {
                    const res = JSON.parse(task.resultJson || "{}");
                    const url = res?.resultUrls?.[0];
                    if (!url) {
                        return await m.reply("❌ URL hasil ga ketemu bro");
                    }
                    const dl = await fetch(url);
                    resultImg = await dl.buffer();
                    break;
                }

                poll++;
            }

            if (!resultImg) {
                return await m.reply("❌ timeout nih, proses kelamaan coba lagi");
            }

            await m.reply({
                image: resultImg,
                caption: `✅ *Nano Banana Pro - AI Edit*\n\n📝 Prompt: ${text}\n🎨 Mode: Image to Image\n⚡ Powered by Nano Banana`
            });

        } catch (e) {
            await m.reply(`❌ error nih bro: ${e.message}`);
        }
    }
};