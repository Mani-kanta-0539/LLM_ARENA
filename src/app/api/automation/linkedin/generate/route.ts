import { NextRequest, NextResponse } from "next/server";
import { streamLLMResponse, LLMProvider } from "@/lib/llm-adapters";

export const runtime = "nodejs";
export const maxDuration = 60;

function enc(obj: unknown) {
    return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: NextRequest) {
    const { topic, tone, postType, provider, model, apiKey } = await req.json() as {
        topic: string; tone: string; postType: string;
        provider: LLMProvider; model: string; apiKey: string;
    };

    if (!topic || !provider || !model || !apiKey) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const prompt = `Write a LinkedIn post about: "${topic}"
Post type: ${postType}
Tone: ${tone}

Rules:
- 150-300 words max
- Start with a strong hook (no "I" or "We")
- Use short paragraphs (1-3 lines max)
- 3-5 relevant hashtags at the end
- Do NOT use clichés like "game-changer" or "excited to share"
- Make it feel authentic and human`;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(enc(obj)));
            try {
                for await (const chunk of streamLLMResponse({ provider, model, apiKey }, [
                    { role: "system", content: "You are an expert LinkedIn copywriter who writes engaging, authentic posts that get high engagement." },
                    { role: "user", content: prompt },
                ])) {
                    send({ type: "token", content: chunk });
                }
                send({ type: "done" });
            } catch (e) {
                send({ type: "error", message: (e as Error).message });
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
}
