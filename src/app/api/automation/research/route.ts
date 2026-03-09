import { NextRequest, NextResponse } from "next/server";
import { streamLLMResponse, LLMProvider } from "@/lib/llm-adapters";

export const runtime = "nodejs";
export const maxDuration = 180;

function enc(obj: unknown) {
    return `data: ${JSON.stringify(obj)}\n\n`;
}

const SECTION_COUNTS: Record<string, number> = { brief: 4, standard: 7, deep: 11 };

interface SectionPlan {
    title: string;
    imageQuery: string;
    keyPoints: string;
}

/* ── Fetch Pexels image for a query ─────────────────────────────── */
async function fetchPexelsImage(query: string, apiKey: string): Promise<string | null> {
    if (!apiKey) return null;
    try {
        const res = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: apiKey } }
        );
        if (!res.ok) return null;
        const data = await res.json() as { photos: { src: { large: string } }[] };
        return data.photos?.[0]?.src?.large ?? null;
    } catch { return null; }
}

export async function POST(req: NextRequest) {
    const {
        topic, depth = "standard", pexelsKey,
        analyzerProvider, analyzerModel, analyzerKey,
        writerProvider, writerModel, writerKey,
        combinerProvider, combinerModel, combinerKey,
    } = await req.json() as {
        topic: string; depth: string; pexelsKey: string;
        analyzerProvider: LLMProvider; analyzerModel: string; analyzerKey: string;
        writerProvider: LLMProvider; writerModel: string; writerKey: string;
        combinerProvider: LLMProvider; combinerModel: string; combinerKey: string;
    };

    const numSections = SECTION_COUNTS[depth] ?? 7;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (obj: unknown) =>
                controller.enqueue(new TextEncoder().encode(enc(obj)));

            try {
                /* ══════════════════════════════════════════════════
                   NODE 1 — ANALYZER AI
                   Breaks the topic into N structured sections
                   ══════════════════════════════════════════════════ */
                send({ type: "node_start", node: "analyze" });

                const analyzerPrompt = `You are a research paper architect. Given a topic, output a JSON plan for a research paper.

Topic: "${topic}"
Number of sections: ${numSections}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "title": "Full paper title",
  "abstract": "150-word abstract",
  "sections": [
    {
      "title": "Section title",
      "imageQuery": "2-3 word pexels search query for a relevant photo",
      "keyPoints": "2-3 sentence description of what this section should cover"
    }
  ]
}`;

                let analyzerRaw = "";
                for await (const chunk of streamLLMResponse(
                    { provider: analyzerProvider, model: analyzerModel, apiKey: analyzerKey },
                    [{ role: "user", content: analyzerPrompt }]
                )) {
                    analyzerRaw += chunk;
                }

                // Parse the JSON plan
                let plan: { title: string; abstract: string; sections: SectionPlan[] };
                try {
                    const jsonMatch = analyzerRaw.match(/\{[\s\S]*\}/);
                    plan = JSON.parse(jsonMatch?.[0] ?? analyzerRaw);
                } catch {
                    // Fallback plan
                    const titles = ["Introduction", "Background", "Methodology", "Results", "Analysis", "Discussion", "Conclusion"];
                    plan = {
                        title: `Research Paper: ${topic}`,
                        abstract: `This paper explores ${topic} in depth.`,
                        sections: titles.slice(0, numSections).map(t => ({
                            title: t,
                            imageQuery: `${topic} ${t}`,
                            keyPoints: `Detailed exploration of ${t} related to ${topic}.`,
                        })),
                    };
                }

                send({ type: "node_done", node: "analyze" });
                send({ type: "title", content: plan.title });
                send({ type: "abstract", content: plan.abstract });
                send({ type: "sections_plan", count: plan.sections.length, sections: plan.sections });

                /* ══════════════════════════════════════════════════
                   NODE 2 — WRITER AI
                   Writes detailed content for each section
                   ══════════════════════════════════════════════════ */
                send({ type: "node_start", node: "write" });

                const wordCounts: Record<string, number> = { brief: 220, standard: 380, deep: 600 };
                const wordCount = wordCounts[depth] ?? 380;

                const sectionContents: string[] = [];

                for (let i = 0; i < plan.sections.length; i++) {
                    const sec = plan.sections[i];
                    send({ type: "section_start", index: i });

                    const writerPrompt = `Write the "${sec.title}" section of an academic research paper about "${topic}".

Key points to cover: ${sec.keyPoints}
Length: approximately ${wordCount} words
Style: formal academic, paragraph form, no bullet points
Do NOT include the section heading — only the body text.`;

                    let sectionText = "";
                    for await (const chunk of streamLLMResponse(
                        { provider: writerProvider, model: writerModel, apiKey: writerKey },
                        [
                            { role: "system", content: `You are an expert academic writer writing a research paper on: "${topic}". Title: "${plan.title}".` },
                            { role: "user", content: writerPrompt },
                        ]
                    )) {
                        sectionText += chunk;
                        send({ type: "section_token", index: i, content: chunk });
                    }

                    sectionContents.push(sectionText);
                    send({ type: "section_done", index: i });
                }

                send({ type: "node_done", node: "write" });

                /* ══════════════════════════════════════════════════
                   NODE 3 — PEXELS IMAGES
                   Fetches one photo per section in parallel
                   ══════════════════════════════════════════════════ */
                send({ type: "node_start", node: "images" });

                const imageResults = await Promise.all(
                    plan.sections.map(sec => fetchPexelsImage(sec.imageQuery, pexelsKey))
                );

                for (let i = 0; i < imageResults.length; i++) {
                    if (imageResults[i]) {
                        send({ type: "image", index: i, url: imageResults[i] });
                    }
                }

                send({ type: "node_done", node: "images" });

                /* ══════════════════════════════════════════════════
                   NODE 4 — COMBINER AI
                   Polishes abstract and adds a conclusions section
                   ══════════════════════════════════════════════════ */
                send({ type: "node_start", node: "combine" });

                // Combiner writes a polished abstract + conclusion
                const combinerPrompt = `You are a senior academic editor. A research paper on "${topic}" has been drafted.
Title: "${plan.title}"
Sections written: ${plan.sections.map((s, i) => `[${i + 1}] ${s.title}`).join(", ")}

Write a single final polished paragraph (max 120 words) that serves as the editor's note — summarizing the paper's contribution and significance. Keep it formal and impactful.`;

                let editorNote = "";
                for await (const chunk of streamLLMResponse(
                    { provider: combinerProvider, model: combinerModel, apiKey: combinerKey },
                    [{ role: "user", content: combinerPrompt }]
                )) {
                    editorNote += chunk;
                    // We don't stream this to a special section — it's stored for the done event
                }

                send({ type: "node_done", node: "combine" });
                send({ type: "editor_note", content: editorNote });
                send({ type: "done" });

            } catch (err) {
                send({ type: "error", message: (err as Error).message });
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
