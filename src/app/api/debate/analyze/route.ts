import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TranscriptEntry {
    id: string;
    fighter: "fighter1" | "fighter2";
    fighterName: string;
    side: "FOR" | "AGAINST";
    content: string;
    turn: number;
}

interface LLMCfg {
    provider: string;
    model: string;
    apiKey: string;
}

export async function POST(req: NextRequest) {
    let body: {
        transcript: TranscriptEntry[];
        topic: string;
        llmConfig: LLMCfg;
        fighter1Name: string;
        fighter2Name: string;
    };

    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const { transcript, topic, llmConfig, fighter1Name, fighter2Name } = body;
    if (!transcript?.length || !llmConfig?.apiKey) {
        return new Response("Missing fields", { status: 400 });
    }

    const transcriptText = transcript
        .map((t) => `[Turn ${t.turn} – ${t.fighterName} (${t.side})]: ${t.content}`)
        .join("\n\n");

    const prompt = `You are an expert debate judge and coach. Analyze this debate transcript and return ONLY valid JSON.

TOPIC: "${topic}"
Fighter FOR: ${fighter1Name}
Fighter AGAINST: ${fighter2Name}

TRANSCRIPT:
${transcriptText}

Return this exact JSON structure (no markdown, no \`\`\`, just raw JSON):
{
  "perMessage": [
    {
      "id": "<message id from transcript, use format turn-N>",
      "logicScore": <1-10>,
      "technique": "<one short phrase like 'Causal reasoning' or 'Rebuttal by example'>",
      "insight": "<1-2 sentences: what debate technique this uses and why it works>",
      "strength": "<what makes this argument effective>",
      "weakness": "<a vulnerability in this argument>"
    }
  ],
  "bestComebackId": "<id of the single best comeback/rebuttal turn>",
  "bestComebackReason": "<one sentence why this was the best>",
  "winner": "<'${fighter1Name}' or '${fighter2Name}'>",
  "winnerReason": "<2 sentences explaining why they made a stronger overall case>",
  "f1AvgScore": <average logic score for ${fighter1Name}, 1-10>,
  "f2AvgScore": <average logic score for ${fighter2Name}, 1-10>,
  "summary": "<3 sentences summarizing the debate's key arguments and outcome>"
}`;

    try {
        const result = await callLLM(llmConfig, prompt);
        const cleanJson = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return Response.json(parsed);
    } catch (err) {
        console.error("Analyze error:", err);
        return new Response("Analysis failed: " + (err instanceof Error ? err.message : String(err)), { status: 500 });
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
                    generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
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
                max_tokens: 2048,
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
                { role: "system", content: "You are an expert debate judge. Always respond with raw JSON only, no markdown." },
                { role: "user", content: prompt },
            ],
            max_tokens: 2048,
            temperature: 0.3,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json));
    return json.choices?.[0]?.message?.content ?? "";
}
