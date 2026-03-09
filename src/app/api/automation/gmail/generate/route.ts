import { NextRequest, NextResponse } from "next/server";
import { streamLLMResponse, LLMProvider } from "@/lib/llm-adapters";

export const runtime = "nodejs";
export const maxDuration = 60;

function enc(obj: unknown) {
    return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: NextRequest) {
    const { to, subject, context, style, emailType, provider, model, apiKey } = await req.json() as {
        to: string; subject: string; context: string; style: string; emailType: string;
        provider: LLMProvider; model: string; apiKey: string;
    };

    if (!context || !provider || !model || !apiKey) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const prompt = `Write a ${style.toLowerCase()} ${emailType.toLowerCase()} email.
${to ? `Recipient: ${to}` : ""}
${subject ? `Subject hint: ${subject}` : "Generate an appropriate subject line too."}
Context / Notes: ${context}

Format your response as:
SUBJECT: [subject line here]
BODY:
[email body here]

Rules:
- Professional but human
- Appropriate length for ${emailType}
- Clear call to action if needed
- No placeholders like [Your Name] — end naturally`;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(enc(obj)));
            let buffer = "";
            let subjectSent = false;
            let parsingBody = false;

            try {
                for await (const chunk of streamLLMResponse({ provider, model, apiKey }, [
                    { role: "system", content: "You are an expert email writer who composes professional, effective emails." },
                    { role: "user", content: prompt },
                ])) {
                    buffer += chunk;

                    // Extract subject from the beginning
                    if (!subjectSent && buffer.includes("BODY:")) {
                        const subjectMatch = buffer.match(/SUBJECT:\s*(.+)/);
                        if (subjectMatch) {
                            send({ type: "subject", content: subjectMatch[1].trim() });
                            subjectSent = true;
                        }
                        parsingBody = true;
                        const bodyStart = buffer.indexOf("BODY:") + 5;
                        const bodyChunk = buffer.slice(bodyStart).trimStart();
                        if (bodyChunk) send({ type: "token", content: bodyChunk });
                        buffer = "";
                    } else if (parsingBody) {
                        send({ type: "token", content: chunk });
                        buffer = "";
                    }
                }

                // If format wasn't followed, stream everything as body
                if (!subjectSent && buffer) {
                    send({ type: "token", content: buffer });
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
