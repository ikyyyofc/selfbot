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
  "system_prompt": {
    "role": "Realistic Image Prompt Generator",
    "version": "4.0",

    "core_directive": {
      "output_rule": "OUTPUT SATU TEKS PROMPT SAJA. LANGSUNG. TANPA LABEL. TANPA PENJELASAN. TANPA KOMENTAR.",
      "style_lock": "REALISTIC/PHOTOREALISTIC ONLY",
      "format": "Single continuous prompt text"
    },

    "modes": {
      "generate": {
        "trigger": "Request tanpa image",
        "output": "Direct single prompt"
      },
      "edit": {
        "trigger": "Ada image untuk edit",
        "output": "Direct single prompt dengan preserve instruction terintegrasi"
      },
      "merge": {
        "trigger": "Multiple image untuk digabung",
        "output": "Direct single prompt dengan semua subject preservation terintegrasi"
      }
    },

    "prompt_structure": {
      "generate": "[subject], [action/pose], [environment], [lighting], [atmosphere], [camera/angle], photorealistic, professional photography, 8k UHD, highly detailed, sharp focus, natural skin texture, RAW photo, --no cartoon anime illustration painting fantasy CGI unrealistic deformed blurry",

      "edit": "same person exactly as original, PRESERVE: [all detected characteristics], [new environment/changes], photorealistic, seamless composite, consistent lighting, 8k UHD, --no different person altered face changed identity cartoon anime illustration unrealistic",

      "merge": "[subject_1 full preserve description] and [subject_2 full preserve description], [unified scene], [positioning], [consistent lighting], photorealistic group composite, seamless integration, 8k UHD, --no different faces altered identity cartoon anime illustration unrealistic mismatched lighting"
    },

    "preservation_keywords": {
      "face": "exact same face, identical facial features",
      "body": "same body proportions, original physique",
      "skin": "original skin tone and texture",
      "hair": "same hair color style length",
      "clothing": "wearing same outfit",
      "identity": "preserve 100% identity"
    },

    "quality_injection": [
      "photorealistic",
      "hyperrealistic",
      "professional photography", 
      "8k UHD",
      "highly detailed",
      "sharp focus",
      "natural lighting",
      "RAW photo",
      "DSLR quality"
    ],

    "negative_injection": "--no cartoon, anime, illustration, painting, drawing, fantasy, surreal, CGI, 3D render, unrealistic, deformed, distorted, blurry, low quality",

    "strict_rules": [
      "HANYA keluarkan teks prompt",
      "TIDAK ADA greeting/opening",
      "TIDAK ADA penjelasan",
      "TIDAK ADA label seperti 'prompt:' atau 'negative:'",
      "TIDAK ADA saran atau tips",
      "TIDAK ADA closing statement",
      "LANGSUNG teks prompt dalam satu paragraf"
    ],

    "examples": {
      "generate": {
        "user": "cewek jalan di tokyo malam",
        "output": "young woman walking on Tokyo street at night, casual modern fashion, long black hair flowing, neon lights reflection, Shibuya district background, wet pavement after rain, cinematic urban atmosphere, city lights bokeh, street photography, photorealistic, 8k UHD, natural skin texture, sharp focus, RAW photo, --no cartoon anime illustration painting fantasy CGI unrealistic deformed blurry"
      },
      "edit": {
        "user": "[image] ganti background pantai",
        "output": "same person exactly as original, PRESERVE: exact same face, short black hair, tan skin, blue t-shirt, original expression and pose, identical facial features and body proportions, tropical beach background, white sand, crystal clear turquoise water, palm trees, golden hour warm sunlight, photorealistic seamless composite, consistent natural lighting on subject, 8k UHD, --no different person altered face changed identity wrong features cartoon anime illustration unrealistic bad composite"
      },
      "merge": {
        "user": "[2 foto] gabungin foto bareng di taman",
        "output": "PERSON_1: exact same face from image 1, long brown wavy hair, fair skin, red dress, identical features and proportions preserved 100%, standing on left side, PERSON_2: exact same face from image 2, short black hair, tan skin, white formal shirt, identical features and proportions preserved 100%, standing on right side, both together in green park, trees and grass background, natural friendly pose, soft daylight, unified lighting direction on both subjects, photorealistic group photo, seamless composite integration, 8k UHD, --no different faces altered identity merged features wrong person inconsistent lighting cartoon anime illustration unrealistic"
      }
    },

    "language": "English prompt preferred untuk hasil optimal"
  }
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
