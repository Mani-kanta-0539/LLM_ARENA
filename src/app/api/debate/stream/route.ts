import { NextRequest } from "next/server";
import { streamLLMResponse, LLMConfig, ChatMessage } from "@/lib/llm-adapters";

export const runtime = "nodejs";
export const maxDuration = 120;

function sseEvent(data: Record<string, unknown>): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PERSONALITIES: Record<string, string> = {
    openai: "You are GPT — analytical, data-driven, and structured. You argue with crisp logic and real-world evidence.",
    anthropic: "You are Claude — thoughtful, nuanced, and empathetic. You argue with careful ethical reasoning and consideration of multiple perspectives.",
    gemini: "You are Gemini — versatile, creative, and wide-ranging. You argue with surprising angles and fresh analogies.",
    deepseek: "You are DeepSeek — deep, technical, and bold. You argue with cutting-edge insight and courageous claims.",
};

export async function POST(req: NextRequest) {
    let body: {
        topic: string;
        currentTurn: number; // 1-indexed, 1 = f1, 2 = f2, 3 = f1, etc.
        history1?: ChatMessage[];
        history2?: ChatMessage[];
        fighter1: LLMConfig & { name: string };
        fighter2: LLMConfig & { name: string };
        audienceFeedback?: string;
    };

    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const { topic, currentTurn = 1, history1: h1 = [], history2: h2 = [], fighter1, fighter2, audienceFeedback = "" } = body;

    if (!topic || !fighter1?.apiKey || !fighter2?.apiKey) {
        return new Response("Missing required fields", { status: 400 });
    }

    const history1: ChatMessage[] = [...h1];
    const history2: ChatMessage[] = [...h2];

    const stream = new ReadableStream({
        async start(controller) {
            const emit = (data: Record<string, unknown>) => {
                controller.enqueue(new TextEncoder().encode(sseEvent(data)));
            };

            try {
                if (currentTurn === 1) {
                    emit({ type: "init", topic, fighter1: fighter1.name, fighter2: fighter2.name });
                }

                const isFighter1 = currentTurn % 2 !== 0;
                const round = Math.ceil(currentTurn / 2);

                if (isFighter1) {
                    // ── Fighter 1's turn ────────────────────────────────────
                    emit({ type: "round_start", round, activeFighter: "fighter1" });

                    const sys1 = buildSystemPrompt(fighter1.provider, fighter1.name, "FOR", topic, fighter2.name);
                    const msgs1 = buildMessages(sys1, topic, history1, history2, "FOR", fighter2.name, audienceFeedback);

                    let f1Response = "";
                    await delay(1000);

                    try {
                        for await (const token of streamLLMResponse(fighter1, msgs1)) {
                            f1Response += token;
                            emit({ type: "token", fighter: "fighter1", content: token });
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        emit({ type: "error", fighter: "fighter1", message: msg });
                        f1Response = `[${fighter1.name} encountered an error: ${msg}]`;
                    }

                    history1.push({ role: "assistant", content: f1Response });
                    history2.push({ role: "user", content: f1Response });
                    emit({ type: "turn_end", fighter: "fighter1", round });
                } else {
                    // ── Fighter 2's turn ────────────────────────────────────
                    emit({ type: "round_start", round, activeFighter: "fighter2" });

                    const sys2 = buildSystemPrompt(fighter2.provider, fighter2.name, "AGAINST", topic, fighter1.name);
                    const msgs2 = buildMessages(sys2, topic, history2, history1, "AGAINST", fighter1.name, audienceFeedback);

                    let f2Response = "";
                    await delay(1000);

                    try {
                        for await (const token of streamLLMResponse(fighter2, msgs2)) {
                            f2Response += token;
                            emit({ type: "token", fighter: "fighter2", content: token });
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        emit({ type: "error", fighter: "fighter2", message: msg });
                        f2Response = `[${fighter2.name} encountered an error: ${msg}]`;
                    }

                    history2.push({ role: "assistant", content: f2Response });
                    history1.push({ role: "user", content: f2Response });
                    emit({ type: "turn_end", fighter: "fighter2", round });
                }

                emit({ type: "done", history1, history2 });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Stream error";
                emit({ type: "fatal_error", message: msg });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

function buildSystemPrompt(
    provider: string,
    modelName: string,
    side: "FOR" | "AGAINST",
    topic: string,
    opponentName: string
): string {
    const personality = PERSONALITIES[provider] ?? `You are ${modelName}, a capable AI debater.`;
    return `${personality}

You are in a live debate against ${opponentName}. Your position is ${side} the topic: "${topic}"

RULES:
- Argue ${side} firmly. Never concede or switch sides.
- ALWAYS directly address and rebut what ${opponentName} just said — quote or reference their specific argument.
- Keep your reply to 3–5 sentences. Be punchy and persuasive.
- Use real examples, stats, or analogies to strengthen your point.
- Sound like a brilliant human debater — confident, clear, and smart.
- Do NOT start with "As an AI..." or break character.
- Do NOT repeat what you already said in a previous turn.`;
}

function buildMessages(
    systemPrompt: string,
    topic: string,
    ownHistory: ChatMessage[],
    opponentHistory: ChatMessage[],
    side: "FOR" | "AGAINST",
    opponentName: string,
    audienceFeedback?: string
): ChatMessage[] {
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    if (ownHistory.length === 0 && opponentHistory.length === 0) {
        messages.push({
            role: "user",
            content: `The debate topic is: "${topic}". You argue ${side}. Make a compelling opening argument in 3–4 sentences.`,
        });
        return messages;
    }

    // Interleave histories: opponent = user, self = assistant
    const maxLen = Math.max(ownHistory.length, opponentHistory.length);
    for (let i = 0; i < maxLen; i++) {
        if (opponentHistory[i]) {
            messages.push({
                role: "user",
                content: `${opponentName} said: "${opponentHistory[i].content}"`,
            });
        }
        if (ownHistory[i]) {
            messages.push({ role: "assistant", content: ownHistory[i].content });
        }
    }

    // Ensure last message is from "user" (the opponent we must respond to)
    if (messages[messages.length - 1]?.role === "assistant") {
        const lastOpponent = opponentHistory[opponentHistory.length - 1];
        let promptEnd = lastOpponent ? `${opponentName} said: "${lastOpponent.content}" — Now respond.` : `Continue your argument for ${side}. Make a fresh, strong point.`;

        if (audienceFeedback) {
            promptEnd += `\n\n[AUDIENCE FEEDBACK: The audience reacted: "${audienceFeedback}" - Address or acknowledge this directly in your response!]`;
        }

        messages.push({
            role: "user",
            content: promptEnd,
        });
    } else {
        // If it's the very first message
        if (audienceFeedback && messages.length === 2 && messages[1].role === "user") {
            messages[1].content += `\n\n[AUDIENCE INITIAL FEEDBACK: "${audienceFeedback}" - Acknowledge this.]`;
        }
    }

    return messages;
}
