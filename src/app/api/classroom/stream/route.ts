import { NextRequest } from "next/server";
import { streamLLMResponse, LLMConfig, ChatMessage } from "@/lib/llm-adapters";

export const runtime = "nodejs";
export const maxDuration = 120;

function sseEvent(data: Record<string, unknown>): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PERSONALITIES: Record<string, string> = {
    openai: "You are GPT — analytical and structured.",
    anthropic: "You are Claude — thoughtful and nuanced.",
    gemini: "You are Gemini — versatile and creative.",
    deepseek: "You are DeepSeek — deep and technical.",
    groq: "You are Groq — blazing fast and concise.",
};

export async function POST(req: NextRequest) {
    let body: {
        topic: string;
        rounds: number;
        teacher: LLMConfig & { name: string };
        student: LLMConfig & { name: string };
    };

    try {
        body = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const { topic, rounds = 5, teacher, student } = body;

    if (!topic || !teacher?.apiKey || !student?.apiKey) {
        return new Response("Missing required fields", { status: 400 });
    }

    const historyT: ChatMessage[] = [];
    const historyS: ChatMessage[] = [];

    const stream = new ReadableStream({
        async start(controller) {
            const emit = (data: Record<string, unknown>) => {
                controller.enqueue(new TextEncoder().encode(sseEvent(data)));
            };

            try {
                emit({ type: "init", topic, rounds, teacher: teacher.name, student: student.name });

                for (let round = 1; round <= rounds; round++) {
                    // ── Teacher's turn (Explains) ────────────────────────────────────
                    emit({ type: "round_start", round, activeRole: "teacher" });

                    const sysT = buildSystemPrompt(teacher.provider, teacher.name, "TEACHER", topic);
                    const msgsT = buildMessages(sysT, topic, historyT, historyS, "TEACHER", student.name);

                    let tResponse = "";
                    await delay(1500);

                    try {
                        for await (const token of streamLLMResponse(teacher, msgsT)) {
                            tResponse += token;
                            emit({ type: "token", role: "teacher", content: token });
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        emit({ type: "error", role: "teacher", message: msg });
                        tResponse = `[${teacher.name} encountered an error: ${msg}]`;
                    }

                    historyT.push({ role: "assistant", content: tResponse });
                    historyS.push({ role: "user", content: tResponse });
                    emit({ type: "turn_end", role: "teacher", round });

                    // ── Student's turn (Asks) ────────────────────────────────────
                    emit({ type: "round_start", round, activeRole: "student" });

                    const sysS = buildSystemPrompt(student.provider, student.name, "STUDENT", topic);
                    const msgsS = buildMessages(sysS, topic, historyS, historyT, "STUDENT", teacher.name);

                    let sResponse = "";
                    await delay(1500);

                    try {
                        for await (const token of streamLLMResponse(student, msgsS)) {
                            sResponse += token;
                            emit({ type: "token", role: "student", content: token });
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "Unknown error";
                        emit({ type: "error", role: "student", message: msg });
                        sResponse = `[${student.name} encountered an error: ${msg}]`;
                    }

                    historyS.push({ role: "assistant", content: sResponse });
                    historyT.push({ role: "user", content: sResponse });
                    emit({ type: "turn_end", role: "student", round });
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

function buildSystemPrompt(
    provider: string,
    modelName: string,
    role: "TEACHER" | "STUDENT",
    topic: string
): string {
    const personality = PERSONALITIES[provider] ?? `You are ${modelName}.`;

    if (role === "TEACHER") {
        return `${personality}

You are an expert teacher explaining the topic: "${topic}" to a curious student.

RULES:
- Break complex ideas down into simple, intuitive concepts. Use analogies.
- Keep your reply to 3–5 sentences. Be engaging and encouraging.
- At the end of your turn, gently ask the student a guiding question or check their understanding.
- Do NOT say "As an AI..."
- Do NOT lecture endlessly. Keep it conversational.`;
    } else {
        return `${personality}

You are a curious, bright student learning about the topic: "${topic}".

RULES:
- Actively listen to the teacher.
- Keep your replies to 2-3 sentences.
- Ask insightful, clarifying questions about the analogies they used.
- Occasionally summarize what they just taught you to check your understanding.
- Do NOT say "As an AI..."
- Do NOT act like you already know everything. Play the role of the eager learner.`;
    }
}

function buildMessages(
    systemPrompt: string,
    topic: string,
    ownHistory: ChatMessage[],
    partnerHistory: ChatMessage[],
    role: "TEACHER" | "STUDENT",
    partnerName: string
): ChatMessage[] {
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    if (ownHistory.length === 0 && partnerHistory.length === 0) {
        if (role === "TEACHER") {
            messages.push({
                role: "user",
                content: `You are starting a new lesson on "${topic}". Please introduce the topic in 3-4 simple sentences.`,
            });
        } // Student goes second, so they won't hit this branch
        return messages;
    }

    const maxLen = Math.max(ownHistory.length, partnerHistory.length);
    for (let i = 0; i < maxLen; i++) {
        if (partnerHistory[i]) {
            messages.push({
                role: "user",
                content: `${partnerName} said: "${partnerHistory[i].content}"`,
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
                content: `${partnerName} said: "${lastPartner.content}" — Now respond.`,
            });
        }
    }

    return messages;
}
