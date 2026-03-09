import { NextRequest } from "next/server";
import { streamLLMResponse, LLMConfig, ChatMessage } from "@/lib/llm-adapters";

export const runtime = "nodejs";
export const maxDuration = 120;

function sseEvent(data: Record<string, unknown>): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
    let body: {
        rounds: number;
        char1: LLMConfig & { name: string; behaviour: string };
        char2: LLMConfig & { name: string; behaviour: string };
    };

    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const { rounds = 5, char1, char2 } = body;

    if (!char1?.apiKey || !char2?.apiKey || !char1?.behaviour || !char2?.behaviour) {
        return new Response("Missing required fields (apiKey and behaviour for both characters)", { status: 400 });
    }

    const history1: ChatMessage[] = [];
    const history2: ChatMessage[] = [];

    const stream = new ReadableStream({
        async start(controller) {
            const emit = (data: Record<string, unknown>) => {
                controller.enqueue(new TextEncoder().encode(sseEvent(data)));
            };

            try {
                emit({ type: "init", rounds, char1: char1.name, char2: char2.name });

                for (let round = 1; round <= rounds; round++) {
                    // ── Char 1's turn ────────────────────────────────────
                    emit({ type: "round_start", round, activeRole: "char1" });

                    const msgs1 = buildMessages(char1.behaviour, char1.name, char2.name, history1, history2);

                    let c1Response = "";
                    await delay(1500);

                    try {
                        for await (const token of streamLLMResponse(char1, msgs1)) {
                            c1Response += token;
                            emit({ type: "token", role: "char1", content: token });
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        emit({ type: "error", role: "char1", message: msg });
                        c1Response = `[${char1.name} encountered an error: ${msg}]`;
                    }

                    history1.push({ role: "assistant", content: c1Response });
                    history2.push({ role: "user", content: c1Response });
                    emit({ type: "turn_end", role: "char1", round });

                    // ── Char 2's turn ────────────────────────────────────
                    emit({ type: "round_start", round, activeRole: "char2" });

                    const msgs2 = buildMessages(char2.behaviour, char2.name, char1.name, history2, history1);

                    let c2Response = "";
                    await delay(1500);

                    try {
                        for await (const token of streamLLMResponse(char2, msgs2)) {
                            c2Response += token;
                            emit({ type: "token", role: "char2", content: token });
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        emit({ type: "error", role: "char2", message: msg });
                        c2Response = `[${char2.name} encountered an error: ${msg}]`;
                    }

                    history2.push({ role: "assistant", content: c2Response });
                    history1.push({ role: "user", content: c2Response });
                    emit({ type: "turn_end", role: "char2", round });
                }

                emit({ type: "done" });
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

/**
 * Build chat messages using the character's own behaviour description as the system prompt.
 * The behaviour is set per-character by the user on the lobby page.
 */
function buildMessages(
    behaviour: string,
    myName: string,
    theirName: string,
    ownHistory: ChatMessage[],
    partnerHistory: ChatMessage[]
): ChatMessage[] {
    const systemPrompt = `${behaviour.trim()}

You are ${myName}, interacting with ${theirName}.

RULES:
- Stay fully in character at all times. Do NOT break character.
- Reply to ${theirName} directly.
- Keep your response to 2-4 sentences. Be punchy and deeply in character.
- Do NOT say "As an AI..." or mention that you are an AI.
- Have fun with the interaction and make it engaging.`;

    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    if (ownHistory.length === 0 && partnerHistory.length === 0) {
        messages.push({
            role: "user",
            content: `The scene begins. Produce your opening line as ${theirName} approaches you.`,
        });
        return messages;
    }

    const maxLen = Math.max(ownHistory.length, partnerHistory.length);
    for (let i = 0; i < maxLen; i++) {
        if (partnerHistory[i]) {
            messages.push({
                role: "user",
                content: `${theirName} said: "${partnerHistory[i].content}"`,
            });
        }
        if (ownHistory[i]) {
            messages.push({ role: "assistant", content: ownHistory[i].content });
        }
    }

    if (messages[messages.length - 1]?.role === "assistant") {
        const lastPartner = partnerHistory[partnerHistory.length - 1];
        if (lastPartner) {
            messages.push({
                role: "user",
                content: `${theirName} said: "${lastPartner.content}" — How do you respond?`,
            });
        }
    }

    return messages;
}
