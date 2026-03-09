import { NextResponse } from "next/server";

// ElevenLabs voice IDs — two distinct voices for the two fighters
const VOICE_MAP: Record<string, string> = {
    arvind: "pNInz6obpgDQGcFmaJgB",   // "Adam" — deep male voice
    meera: "21m00Tcm4TlvDq8ikWAM",     // "Rachel" — female voice
};

const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, speaker = "meera" } = body;

        if (!text) {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            console.warn("[TTS] ELEVENLABS_API_KEY not set — TTS disabled");
            return NextResponse.json({ audioBase64: null, warning: "TTS not configured" });
        }

        const voiceId = VOICE_MAP[speaker] ?? DEFAULT_VOICE;

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey,
                },
                body: JSON.stringify({
                    text: text.slice(0, 500),
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error("[TTS] ElevenLabs error:", err);
            return NextResponse.json({ audioBase64: null, error: `ElevenLabs: ${err}` });
        }

        // ElevenLabs returns raw audio bytes (MP3)
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        return NextResponse.json({ audioBase64: base64 });
    } catch (error) {
        console.error("[TTS] Error:", error);
        return NextResponse.json(
            { audioBase64: null, error: (error as Error).message },
            { status: 500 }
        );
    }
}
