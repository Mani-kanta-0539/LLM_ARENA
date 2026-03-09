// ─────────────────────────────────────────────────────────────────────────────
// LLM Adapters — Unified streaming interface for all supported providers
// ─────────────────────────────────────────────────────────────────────────────

export type LLMProvider = "openai" | "anthropic" | "gemini" | "deepseek" | "groq" | "cerebras" | "scaleway";

export interface LLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey: string;
}

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
    let lastErr: Error | null = null;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            response = await fetch(url, options);
            if (response.status === 429 && attempt < maxRetries) {
                // Rate limit hit, wait longer and retry
                await delay(3000 * (attempt + 1));
                continue;
            }
            return response;
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
                await delay(3000 * (attempt + 1));
                continue;
            }
        }
    }
    if (response) return response;
    throw lastErr ?? new Error("Fetch failed");
}

/** Routes to the correct provider streaming generator */
export async function* streamLLMResponse(
    config: LLMConfig,
    messages: ChatMessage[]
): AsyncGenerator<string> {
    switch (config.provider) {
        case "openai":
        case "deepseek":
        case "groq":
        case "cerebras":
        case "scaleway":
            yield* streamOpenAICompatible(config, messages);
            break;
        case "anthropic":
            yield* streamAnthropic(config, messages);
            break;
        case "gemini":
            yield* streamGemini(config, messages);
            break;
        default:
            throw new Error(`Unknown provider: ${config.provider}`);
    }
}

// ─── OpenAI & DeepSeek (same API format) ─────────────────────────────────────
async function* streamOpenAICompatible(
    config: LLMConfig,
    messages: ChatMessage[]
): AsyncGenerator<string> {
    const baseUrl =
        config.provider === "deepseek"
            ? "https://api.deepseek.com/v1"
            : config.provider === "groq"
                ? "https://api.groq.com/openai/v1"
                : config.provider === "cerebras"
                    ? "https://api.cerebras.ai/v1"
                    : config.provider === "scaleway"
                        ? "https://api.scaleway.ai/632ad4e7-6471-448a-bb79-4839b464db99/v1"
                        : "https://api.openai.com/v1";

    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            stream: true,
            max_tokens: 350,
            temperature: 0.85,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`[${config.provider}] ${response.status}: ${err}`);
    }

    yield* readSSEStream(response, (json) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const j = json as any;
        return j.choices?.[0]?.delta?.content ?? null;
    });
}

// ─── Anthropic Claude ─────────────────────────────────────────────────────────
async function* streamAnthropic(
    config: LLMConfig,
    messages: ChatMessage[]
): AsyncGenerator<string> {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages.filter((m) => m.role !== "system");

    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: 350,
            system: systemMsg?.content ?? "",
            messages: chatMsgs.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
            stream: true,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`[anthropic] ${response.status}: ${err}`);
    }

    yield* readSSEStream(response, (json) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const j = json as any;
        if (j.type === "content_block_delta" && j.delta?.text) {
            return j.delta.text;
        }
        return null;
    });
}

// ─── Google Gemini ────────────────────────────────────────────────────────────
async function* streamGemini(
    config: LLMConfig,
    messages: ChatMessage[]
): AsyncGenerator<string> {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages.filter((m) => m.role !== "system");

    // Gemma models do NOT support system_instruction — inject system prompt as
    // a leading user/model turn pair to keep the alternating-role requirement.
    const isGemma = config.model.toLowerCase().startsWith("gemma");

    const baseContents = chatMsgs.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));

    const contents = isGemma && systemMsg
        ? [
            { role: "user", parts: [{ text: systemMsg.content }] },
            { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
            ...baseContents,
        ]
        : baseContents;

    const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                // Only use system_instruction for native Gemini models (not Gemma)
                ...(!isGemma && systemMsg && {
                    system_instruction: { parts: [{ text: systemMsg.content }] },
                }),
                contents,
                generationConfig: {
                    maxOutputTokens: 350,
                    temperature: 0.85,
                },
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`[gemini] ${response.status}: ${err}`);
    }

    yield* readSSEStream(response, (json) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const j = json as any;
        return j.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    });
}

// ─── Generic SSE Reader ───────────────────────────────────────────────────────
async function* readSSEStream(
    response: Response,
    extractor: (json: Record<string, unknown>) => string | null
): AsyncGenerator<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
                const json = JSON.parse(trimmed.slice(6));
                const text = extractor(json);
                if (text) yield text;
            } catch {
                // skip unparseable lines
            }
        }
    }
}

// ─── Provider / Model Catalogue (used by UI) ──────────────────────────────────
export const PROVIDER_CATALOGUE = {
    openai: {
        name: "OpenAI",
        color: "#10a37f",
        avatar: "🤖",
        models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        keyPlaceholder: "sk-...",
    },
    anthropic: {
        name: "Anthropic",
        color: "#d4a27f",
        avatar: "🧬",
        models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
        keyPlaceholder: "sk-ant-...",
    },
    gemini: {
        name: "Google",
        color: "#4285f4",
        avatar: "💎",
        models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemma-3-27b-it"],
        keyPlaceholder: "AIzaSy...",
    },
    deepseek: {
        name: "DeepSeek",
        color: "#7b5ea7",
        avatar: "🔮",
        models: ["deepseek-chat", "deepseek-reasoner"],
        keyPlaceholder: "sk-...",
    },
    groq: {
        name: "Groq",
        color: "#f55f44",
        avatar: "⚡",
        models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
        keyPlaceholder: "gsk_...",
    },
    cerebras: {
        name: "Cerebras",
        color: "#ff6b35",
        avatar: "🔥",
        models: ["gpt-oss-120b", "qwen-3-235b-a22b-instruct-2507", "llama3.1-8b"],
        keyPlaceholder: "csk-...",
    },
    scaleway: {
        name: "Scaleway",
        color: "#7c3aed",
        avatar: "🚀",
        models: [
            "deepseek-r1-distill-llama-70b",
            "deepseek-r1",
            "llama-3.3-70b-instruct",
            "llama-3.1-8b-instruct",
            "qwen2.5-coder-32b-instruct",
            "mistral-nemo-instruct-2407",
        ],
        keyPlaceholder: "b9378b85-...",
    },
} as const satisfies Record<LLMProvider, {
    name: string;
    color: string;
    avatar: string;
    models: string[];
    keyPlaceholder: string;
}>;
