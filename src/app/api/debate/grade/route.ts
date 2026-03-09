import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface LLMCfg {
    provider: string;
    model: string;
    apiKey: string;
}

export async function POST(req: NextRequest) {
    let body: {
        playerArgument: string;
        topic: string;
        side: "FOR" | "AGAINST";
        transcript: string;
        llmConfig: LLMCfg;
    };

    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const { playerArgument, topic, side, transcript, llmConfig } = body;
    if (!playerArgument || !llmConfig?.apiKey) {
        return new Response("Missing fields", { status: 400 });
    }

    const prompt = `You are a world-class debate coach helping a student learn to debate.

DEBATE TOPIC: "${topic}"
SIDE THE STUDENT IS ARGUING: ${side}
THE STUDENT WROTE: "${playerArgument}"

CONTEXT (how the AIs argued this topic):
${transcript}

Grade this student's argument and return ONLY valid raw JSON (no markdown, no \`\`\`):
{
  "score": <integer 1-10>,
  "verdict": "<'Excellent!', 'Great point!', 'Good start', 'Needs work', or 'Off-topic'>",
  "whatWorked": "<1-2 sentences on the strongest part of their argument>",
  "improvement": "<1-2 sentences on the most important thing they should improve>",
  "modelAnswer": "<2-3 sentences showing how a skilled debater would argue this point — be inspiring, not harsh>",
  "debateTip": "<one actionable debate tip the student can use in their next argument>"
}`;

    try {
        const result = await callLLM(llmConfig, prompt);
        const cleanJson = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return Response.json(parsed);
    } catch (err) {
        console.error("Grade error:", err);
        return new Response("Grading failed: " + (err instanceof Error ? err.message : String(err)), { status: 500 });
    }
}

async function callLLM(cfg: LLMCfg, prompt: string): Promise<string> {
    if (cfg.provider === "gemini") {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
                }),
            }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(json));
        return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    if (cfg.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": cfg.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: cfg.model,
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }],
            }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(json));
        return json.content?.[0]?.text ?? "";
    }

    // OpenAI / DeepSeek / Groq
    const baseUrl =
        cfg.provider === "deepseek" ? "https://api.deepseek.com/v1" :
            cfg.provider === "groq" ? "https://api.groq.com/openai/v1" :
                "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
            model: cfg.model,
            messages: [
                { role: "system", content: "You are an expert debate coach. Always respond with raw JSON only." },
                { role: "user", content: prompt },
            ],
            max_tokens: 1024,
            temperature: 0.4,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json));
    return json.choices?.[0]?.message?.content ?? "";
}
