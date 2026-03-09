// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/call
// LLM proxy for multi-agent calls with tool/function definitions
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

interface AgentCallBody {
    provider: string;
    model: string;
    apiKey: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
}

// Build provider base URL
function getBaseUrl(provider: string): string {
    switch (provider) {
        case 'openai': return 'https://api.openai.com/v1';
        case 'groq': return 'https://api.groq.com/openai/v1';
        case 'cerebras': return 'https://api.cerebras.ai/v1';
        case 'deepseek': return 'https://api.deepseek.com/v1';
        case 'scaleway': return 'https://api.scaleway.ai/632ad4e7-6471-448a-bb79-4839b464db99/v1';
        default: return 'https://api.openai.com/v1';
    }
}

// Call OpenAI-compatible API with tool definitions
async function callOpenAIWithTools(body: AgentCallBody) {
    const { provider, model, apiKey, messages, tools } = body;
    const baseUrl = getBaseUrl(provider);

    const openAITools = tools?.map(t => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            tools: openAITools,
            tool_choice: openAITools?.length ? 'auto' : undefined,
            temperature: 0.7,
            max_tokens: 1500,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[${provider}] ${res.status}: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    // Extract function calls
    const functionCalls = msg?.tool_calls?.map((tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
    })) ?? [];

    return {
        text: msg?.content ?? null,
        functionCalls,
    };
}

// Call Gemini with function declarations
async function callGeminiWithTools(body: AgentCallBody) {
    const { model, apiKey, messages, tools } = body;

    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const contents = chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    const functionDeclarations = tools?.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
    }));

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...(systemMsg && { system_instruction: { parts: [{ text: systemMsg.content }] } }),
                contents,
                ...(functionDeclarations?.length && {
                    tools: [{ functionDeclarations }],
                    tool_config: { function_calling_config: { mode: 'AUTO' } },
                }),
                generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
            }),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[gemini] ${res.status}: ${err}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    const text = parts.find((p: { text?: string }) => p.text)?.text ?? null;
    const functionCalls = parts
        .filter((p: { functionCall?: { name: string; args: Record<string, unknown> } }) => p.functionCall)
        .map((p: { functionCall: { name: string; args: Record<string, unknown> } }) => ({
            name: p.functionCall.name,
            args: p.functionCall.args ?? {},
        }));

    return { text, functionCalls };
}

// Call Anthropic with tool use
async function callAnthropicWithTools(body: AgentCallBody) {
    const { model, apiKey, messages, tools } = body;
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const anthropicTools = tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 1500,
            system: systemMsg?.content ?? '',
            messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
            ...(anthropicTools?.length && { tools: anthropicTools }),
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[anthropic] ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.content ?? [];

    const text = content.find((c: { type: string; text?: string }) => c.type === 'text')?.text ?? null;
    const functionCalls = content
        .filter((c: { type: string }) => c.type === 'tool_use')
        .map((c: { name: string; input: Record<string, unknown> }) => ({ name: c.name, args: c.input ?? {} }));

    return { text, functionCalls };
}

export async function POST(req: NextRequest) {
    try {
        const body: AgentCallBody = await req.json();
        const { provider, apiKey } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API key required' }, { status: 400 });
        }

        let result: { text: string | null; functionCalls: Array<{ name: string; args: Record<string, unknown> }> };

        if (provider === 'gemini') {
            result = await callGeminiWithTools(body);
        } else if (provider === 'anthropic') {
            result = await callAnthropicWithTools(body);
        } else {
            result = await callOpenAIWithTools(body);
        }

        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[agents/call]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
