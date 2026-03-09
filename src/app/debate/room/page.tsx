"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Loader2,
    Send, Zap, History, ThumbsUp, Minus, ThumbsDown, Play,
    Volume2, VolumeX
} from "lucide-react";
import { LLMProvider, PROVIDER_CATALOGUE } from "@/lib/llm-adapters";
import ChatBubble, { ChatBubbleMessage } from "@/components/debate/ChatBubble";
import ComicChatOverlay from "@/components/debate/ComicChatOverlay";
import DebateReport, { DebateAnalysis, GradeResult } from "@/components/debate/DebateReport";
import { MessageAnalysis } from "@/components/debate/DebateReport";
import { ChatMessage } from "@/lib/llm-adapters";

// Lazily load PhaserArena (Phaser can't run on the server)
const PhaserArena = dynamic(() => import("@/components/debate/PhaserArena"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#08081a] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-neon-purple animate-spin mb-4" />
            <p className="font-orbitron text-xs text-neon-purple tracking-widest animate-pulse">LOADING ARENA...</p>
        </div>
    ),
});

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FighterConfig {
    name: string;
    provider: LLMProvider;
    model: string;
    apiKey: string;
    characterImage?: string;
}

interface DebateConfig {
    topic: string;
    rounds: number;
    fighter1: FighterConfig;
    fighter2: FighterConfig;
    backgroundImage?: string;
}

type DebateStatus = "idle" | "loading" | "running" | "done" | "error";

// Fallback avatar images
const FALLBACK_F1 = "/assets/avatar4.png";
const FALLBACK_F2 = "/assets/avatar3.jpg";
const FALLBACK_BG = "/assets/Gemini_Generated_Image_kjsil6kjsil6kjsi.png";

// ─── Debate Room ───────────────────────────────────────────────────────────────
export default function DebateRoom() {
    const router = useRouter();
    const [config, setConfig] = useState<DebateConfig | null>(null);
    const [status, setStatus] = useState<DebateStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [apiErrors, setApiErrors] = useState<string[]>([]);

    const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);
    const [streamingMsg, setStreamingMsg] = useState<ChatBubbleMessage | null>(null);

    // Analysis state
    const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [insightMap, setInsightMap] = useState<Record<string, MessageAnalysis>>({});

    const [audienceComment, setAudienceComment] = useState("");
    const audienceFeedbackMapRef = useRef<Record<number, string>>({});

    // UI state
    const [showHistory, setShowHistory] = useState(false);
    const [activeFighter, setActiveFighter] = useState<"fighter1" | "fighter2" | null>(null);
    const [currentTurnDisplay, setCurrentTurnDisplay] = useState(0);
    const [isWaitingFeedback, setIsWaitingFeedback] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const turnRef = useRef(0);
    const messagesRef = useRef<ChatBubbleMessage[]>([]);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);


    // Load config
    useEffect(() => {
        const raw = sessionStorage.getItem("debateConfig");
        if (!raw) { router.replace("/debate"); return; }
        try {
            const parsed = JSON.parse(raw);
            setConfig(parsed);
        }
        catch { router.replace("/debate"); }
    }, [router]);

    // Auto-start
    useEffect(() => {
        if (config && status === "idle") startDebate(config);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);

    // ── Run analysis when debate finishes ───────────────────────────────────────
    const runAnalysis = useCallback(async (cfg: DebateConfig, finalMessages: ChatBubbleMessage[]) => {
        const debateMsgs = finalMessages.filter((m) => m.fighter !== "player");
        if (debateMsgs.length === 0) return;

        setIsAnalyzing(true);

        const llmConfig = {
            provider: cfg.fighter1.provider,
            model: cfg.fighter1.model,
            apiKey: cfg.fighter1.apiKey,
        };

        try {
            const res = await fetch("/api/debate/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript: debateMsgs.map((m) => ({
                        id: m.id,
                        fighter: m.fighter,
                        fighterName: m.fighterName,
                        side: m.side,
                        content: m.content,
                        turn: m.turn,
                    })),
                    topic: cfg.topic,
                    llmConfig,
                    fighter1Name: cfg.fighter1.name,
                    fighter2Name: cfg.fighter2.name,
                }),
            });

            if (!res.ok) throw new Error(await res.text());

            const data: DebateAnalysis = await res.json();
            setAnalysis(data);

            const map: Record<string, MessageAnalysis> = {};
            for (const p of data.perMessage) { map[p.id] = p; }
            setInsightMap(map);
        } catch (err) {
            console.error("Analysis failed:", err);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // ── Grade player argument ───────────────────────────────────────────────────
    const handleGrade = useCallback(async (
        argument: string,
        side: "FOR" | "AGAINST"
    ): Promise<GradeResult | null> => {
        if (!config) return null;

        const llmConfig = {
            provider: config.fighter1.provider,
            model: config.fighter1.model,
            apiKey: config.fighter1.apiKey,
        };

        const transcriptText = messagesRef.current
            .filter((m) => m.fighter !== "player")
            .map((m) => `[${m.fighterName} (${m.side})]: ${m.content}`)
            .join("\n\n");

        try {
            const res = await fetch("/api/debate/grade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playerArgument: argument,
                    topic: config.topic,
                    side,
                    transcript: transcriptText,
                    llmConfig,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            return null;
        }
    }, [config]);

    // ── Start / restart debate ──────────────────────────────────────────────────
    const startDebate = useCallback(async (cfg: DebateConfig, isNextTurn = false) => {
        if (!isNextTurn) {
            setStatus("loading");
            setMessages([]);
            setStreamingMsg(null);
            setErrorMsg("");
            setApiErrors([]);
            setAnalysis(null);
            setInsightMap({});
            setIsAnalyzing(false);
            turnRef.current = 0;
            setCurrentTurnDisplay(0);
            audienceFeedbackMapRef.current = {};
            messagesRef.current = [];
        }

        abortRef.current = new AbortController();
        setIsWaitingFeedback(false);
        setStatus("running");

        // Compute history up to this point
        const h1: ChatMessage[] = [];
        const h2: ChatMessage[] = [];
        messagesRef.current.forEach(msg => {
            if (msg.fighter === "fighter1") {
                h1.push({ role: "assistant", content: msg.content });
                h2.push({ role: "user", content: msg.content });
            } else if (msg.fighter === "fighter2") {
                h1.push({ role: "user", content: msg.content });
                h2.push({ role: "assistant", content: msg.content });
            }
        });

        try {
            const nextTurn = turnRef.current + 1;

            if (nextTurn > cfg.rounds * 2) {
                setStatus("done");
                runAnalysis(cfg, messagesRef.current);
                return;
            }

            const response = await fetch("/api/debate/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...cfg,
                    currentTurn: nextTurn,
                    history1: h1,
                    history2: h2,
                    audienceFeedback: audienceFeedbackMapRef.current[turnRef.current] || ""
                }),
                signal: abortRef.current.signal,
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let currentStreamText = "";
            let currentStreamMsg: ChatBubbleMessage | null = null;

            const f1Info = PROVIDER_CATALOGUE[cfg.fighter1.provider];
            const f2Info = PROVIDER_CATALOGUE[cfg.fighter2.provider];

            let didError = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data: ")) continue;

                    let evt: Record<string, unknown>;
                    try { evt = JSON.parse(trimmed.slice(6)); }
                    catch { continue; }

                    switch (evt.type) {
                        case "round_start": {
                            turnRef.current += 1;
                            setCurrentTurnDisplay(turnRef.current);
                            const fighter = (evt.activeFighter ?? evt.activefighter) as "fighter1" | "fighter2";
                            setActiveFighter(fighter);
                            const isF1 = fighter === "fighter1";
                            currentStreamText = "";
                            currentStreamMsg = {
                                id: `turn-${turnRef.current}`,
                                fighter,
                                fighterName: isF1 ? cfg.fighter1.name : cfg.fighter2.name,
                                side: isF1 ? "FOR" : "AGAINST",
                                content: "",
                                isStreaming: true,
                                avatar: isF1 ? f1Info.avatar : f2Info.avatar,
                                color: isF1 ? f1Info.color : f2Info.color,
                                turn: turnRef.current,
                            };
                            setStreamingMsg({ ...currentStreamMsg });
                            break;
                        }

                        case "token": {
                            currentStreamText += evt.content as string;
                            if (currentStreamMsg) {
                                currentStreamMsg.content = currentStreamText;
                                setStreamingMsg({ ...currentStreamMsg });
                            }
                            break;
                        }

                        case "turn_end": {
                            if (currentStreamMsg) {
                                const finalMsg: ChatBubbleMessage = {
                                    ...currentStreamMsg,
                                    content: currentStreamText,
                                    isStreaming: false,
                                };
                                setMessages((p) => [...p, finalMsg]);
                                messagesRef.current.push(finalMsg);
                                setStreamingMsg(null);
                                currentStreamMsg = null;
                                currentStreamText = "";
                            }
                            setActiveFighter(null);
                            break;
                        }

                        case "error": {
                            const errFighter = evt.fighter as "fighter1" | "fighter2";
                            const errMsg = evt.message as string;
                            setApiErrors((prev) => [...prev, `${errFighter === "fighter1" ? cfg.fighter1.name : cfg.fighter2.name}: ${errMsg}`]);
                            didError = true;
                            if (currentStreamMsg && currentStreamMsg.fighter === errFighter) {
                                const errBubble: ChatBubbleMessage = {
                                    ...currentStreamMsg,
                                    content: `⚠️ API Error: ${errMsg}`,
                                    isStreaming: false,
                                    color: "#ef4444",
                                };
                                setMessages((p) => [...p, errBubble]);
                                messagesRef.current.push(errBubble);
                                setStreamingMsg(null);
                                currentStreamMsg = null;
                                currentStreamText = "";
                            }
                            break;
                        }

                        case "done":
                            break;

                        case "fatal_error":
                            didError = true;
                            throw new Error(evt.message as string);
                    }
                }
            } // end loop

            if (!abortRef.current?.signal.aborted && !didError) {
                setIsWaitingFeedback(true);
            }

        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setErrorMsg((err as Error).message);
            setStatus("error");
        }
    }, [runAnalysis]);

    const handleAudienceFeedback = (action: string) => {
        let currentString = audienceFeedbackMapRef.current[turnRef.current] || "";
        if (action === "AGREE") currentString += " [Audience Strongly Agrees!] ";
        else if (action === "DISAGREE") currentString += " [Audience Boos & Disagrees!] ";
        else if (action === "NEUTRAL") currentString += " [Audience is Neutral/Confused...] ";

        if (action === "COMMENT" && audienceComment) {
            currentString += ` [Audience Commented: "${audienceComment}"] `;
            setAudienceComment("");
        }

        audienceFeedbackMapRef.current[turnRef.current] = currentString;

        if (config) {
            startDebate(config, true);
        }
    };

    const handleRestart = () => { abortRef.current?.abort(); router.push("/debate"); };

    // ── TTS: speak a message on demand ──────────────────────────────────────────
    const speakMessage = useCallback(async (msg: ChatBubbleMessage) => {
        if (!ttsEnabled) return;
        // Stop any playing audio
        if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
            ttsAudioRef.current = null;
        }
        if (speakingMsgId === msg.id) {
            setSpeakingMsgId(null);
            return;
        }
        setSpeakingMsgId(msg.id);
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: msg.content.slice(0, 500), // limit length
                    speaker: msg.fighter === "fighter1" ? "arvind" : "meera"
                })
            });
            const data = await res.json();
            if (data.audioBase64) {
                const audio = new Audio("data:audio/mpeg;base64," + data.audioBase64);
                ttsAudioRef.current = audio;
                audio.onended = () => { setSpeakingMsgId(null); ttsAudioRef.current = null; };
                audio.onerror = () => { setSpeakingMsgId(null); ttsAudioRef.current = null; };
                audio.play().catch(() => setSpeakingMsgId(null));
            } else {
                setSpeakingMsgId(null);
            }
        } catch {
            setSpeakingMsgId(null);
        }
    }, [ttsEnabled, speakingMsgId]);

    if (!config) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
            </div>
        );
    }

    const f1Info = PROVIDER_CATALOGUE[config.fighter1.provider];
    const f2Info = PROVIDER_CATALOGUE[config.fighter2.provider];

    const bgImage = config.backgroundImage || `url('${FALLBACK_BG}')`;
    const f1Image = config.fighter1.characterImage || FALLBACK_F1;
    const f2Image = config.fighter2.characterImage || FALLBACK_F2;

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col overflow-hidden"
            style={{ height: "100dvh" }}>

            {/* Fixed background — isolated so layout changes never cause it to shake */}
            <div className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: config.backgroundImage
                        ? `url('${config.backgroundImage}')`
                        : `url('${FALLBACK_BG}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            />
            <div className="fixed inset-0 bg-black/40 pointer-events-none z-0" />

            {/* ── Main Square Layout ───────────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-start p-4 pt-6 relative z-10 w-full overflow-y-auto">

                {/* Main Arena Container — fixed 16:9 box */}
                <div className="relative w-full max-w-5xl rounded-2xl border-2 border-white/20 shadow-[0_0_60px_rgba(144,0,255,0.4)] overflow-hidden flex-shrink-0"
                    style={{ aspectRatio: "16/9" }}>

                    {/* Phaser background */}
                    <div className="absolute inset-0 z-0">
                        <PhaserArena
                            fighter1Provider={config.fighter1.provider}
                            fighter2Provider={config.fighter2.provider}
                            fighter1Name={config.fighter1.name}
                            fighter2Name={config.fighter2.name}
                            activeFighter={activeFighter}
                            status={status}
                            backgroundImage={config.backgroundImage}
                        />
                    </div>

                    {/* Fighter 1 — left */}
                    <div
                        className="absolute bottom-0 left-0 z-10 flex flex-col items-center"
                        style={{
                            width: "20%",
                            transform: activeFighter === "fighter1" ? "scale(1.04)" : "scale(1)",
                            transition: "transform 0.3s ease",
                        }}
                    >
                        {activeFighter === "fighter1" && (
                            <div className="absolute -inset-2 rounded-full animate-ping opacity-20 pointer-events-none"
                                style={{ background: `radial-gradient(circle, ${f1Info.color}80 0%, transparent 70%)` }} />
                        )}
                        <img
                            src={f1Image}
                            alt={config.fighter1.name}
                            className="w-full h-auto object-contain drop-shadow-2xl"
                            style={{
                                maxHeight: "75%",
                                filter: activeFighter === "fighter1"
                                    ? `drop-shadow(0 0 20px ${f1Info.color}) brightness(1.1)`
                                    : "drop-shadow(0 4px 12px rgba(0,0,0,0.9))",
                            }}
                        />
                        <div className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider font-mono shadow-lg"
                            style={{
                                background: `linear-gradient(90deg, ${f1Info.color}cc, ${f1Info.color}88)`,
                                boxShadow: activeFighter === "fighter1" ? `0 0 12px ${f1Info.color}` : "none",
                            }}>
                            {config.fighter1.name} · FOR
                        </div>
                    </div>

                    {/* Fighter 2 — right */}
                    <div
                        className="absolute bottom-0 right-0 z-10 flex flex-col items-center"
                        style={{
                            width: "20%",
                            transform: activeFighter === "fighter2" ? "scale(1.04)" : "scale(1)",
                            transition: "transform 0.3s ease",
                        }}
                    >
                        {activeFighter === "fighter2" && (
                            <div className="absolute -inset-2 rounded-full animate-ping opacity-20 pointer-events-none"
                                style={{ background: `radial-gradient(circle, ${f2Info.color}80 0%, transparent 70%)` }} />
                        )}
                        <img
                            src={f2Image}
                            alt={config.fighter2.name}
                            className="w-full h-auto object-contain drop-shadow-2xl"
                            style={{
                                maxHeight: "75%",
                                transform: "scaleX(-1)",
                                filter: activeFighter === "fighter2"
                                    ? `drop-shadow(0 0 20px ${f2Info.color}) brightness(1.1)`
                                    : "drop-shadow(0 4px 12px rgba(0,0,0,0.9))",
                            }}
                        />
                        <div className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider font-mono shadow-lg"
                            style={{
                                background: `linear-gradient(90deg, ${f2Info.color}88, ${f2Info.color}cc)`,
                                boxShadow: activeFighter === "fighter2" ? `0 0 12px ${f2Info.color}` : "none",
                            }}>
                            {config.fighter2.name} · AGAINST
                        </div>
                    </div>

                    {/* Comic Chat — center, between the two characters */}
                    <div className="absolute inset-x-[20%] top-0 bottom-16 z-20 pointer-events-none">
                        <ComicChatOverlay
                            messages={showHistory ? [] : messages}
                            streamingMsg={showHistory ? null : streamingMsg}
                            insightMap={insightMap}
                        />
                    </div>

                    {/* Score bar inside arena (top) */}
                    <div className="absolute top-0 left-0 right-0 z-25 flex items-center justify-between px-3 py-2"
                        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: f1Info.color, boxShadow: `0 0 6px ${f1Info.color}` }} />
                            <span className="font-orbitron text-[10px] text-white font-black">{config.fighter1.name}</span>
                        </div>
                        <div className="font-orbitron text-[10px] text-gray-300">
                            TURN <span className="text-white font-black bg-white/10 px-1.5 py-0.5 rounded">{currentTurnDisplay}</span> / {config.rounds * 2}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-orbitron text-[10px] text-white font-black">{config.fighter2.name}</span>
                            <div className="w-2 h-2 rounded-full" style={{ background: f2Info.color, boxShadow: `0 0 6px ${f2Info.color}` }} />
                        </div>
                    </div>

                    {/* Status Modals */}
                    {status === "loading" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-md z-30">
                            <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
                            <p className="font-orbitron text-neon-purple text-sm animate-pulse tracking-widest">LOADING FIGHTERS...</p>
                        </div>
                    )}

                    {apiErrors.length > 0 && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 max-w-lg w-full bg-red-900/80 border border-red-500 p-4 rounded-xl z-30 text-xs font-inter text-red-200">
                            <strong>API ERRORS:</strong>
                            <ul className="list-disc pl-4 mt-1">
                                {apiErrors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Controls Bar beneath Arena */}
                <div className="max-w-5xl w-full flex items-center justify-between mt-3 px-2 mb-3 shrink-0">
                    <button onClick={handleRestart}
                        className="flex items-center gap-1.5 p-2 px-3 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-inter text-xs">
                        <ArrowLeft className="w-3.5 h-3.5" /> Exit
                    </button>
                    <div className="flex items-center gap-2">
                        {/* TTS toggle */}
                        <button onClick={() => setTtsEnabled(e => !e)}
                            title={ttsEnabled ? "Mute speaker" : "Enable speaker"}
                            className="flex items-center gap-1.5 p-2 px-3 rounded-lg border font-inter text-xs transition-all"
                            style={{
                                background: ttsEnabled ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                                borderColor: ttsEnabled ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)",
                                color: ttsEnabled ? "#a78bfa" : "#6b7280",
                            }}>
                            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{ttsEnabled ? "Voice ON" : "Voice OFF"}</span>
                        </button>
                        <button onClick={() => setShowHistory(h => !h)}
                            className="flex items-center gap-2 p-2 px-4 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-inter text-xs">
                            <History className="w-4 h-4" /> {showHistory ? "Back to Live Arena" : "View Chat History"}
                        </button>
                    </div>
                </div>

                {/* Debate Report Card (shows when done) */}
                <AnimatePresence>
                    {status === "done" && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-5xl bg-black/90 backdrop-blur-xl p-8 rounded-3xl mb-6 shadow-[0_0_50px_rgba(144,0,255,0.2)] border border-white/20 shrink-0"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs font-orbitron text-gray-400 tracking-widest">DEBATE COMPLETE</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>
                            <DebateReport
                                analysis={analysis}
                                isAnalyzing={isAnalyzing}
                                messages={messages}
                                topic={config.topic}
                                fighter1Name={config.fighter1.name}
                                fighter2Name={config.fighter2.name}
                                f1Color={f1Info.color}
                                f2Color={f2Info.color}
                                f1Avatar={f1Info.avatar}
                                f2Avatar={f2Info.avatar}
                                onGrade={handleGrade}
                            />
                        </motion.div>
                    )}

                    {showHistory && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="w-full max-w-5xl bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl mb-6 shrink-0"
                        >
                            <div className="text-xs font-orbitron text-gray-400 tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center justify-between">
                                <span>FULL HISTORY</span>
                                {ttsEnabled && <span className="text-[10px] text-purple-400 font-inter">Click 🔊 on any message to hear it</span>}
                            </div>
                            <div className="space-y-6">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="relative">
                                        <ChatBubble
                                            message={msg}
                                            insight={insightMap[msg.id] ?? null}
                                        />
                                        {ttsEnabled && (
                                            <button
                                                onClick={() => speakMessage(msg)}
                                                title="Speak this message"
                                                className="absolute top-2 right-2 p-1.5 rounded-lg transition-all hover:scale-110"
                                                style={{
                                                    background: speakingMsgId === msg.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)",
                                                    border: `1px solid ${speakingMsgId === msg.id ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)"}`,
                                                    color: speakingMsgId === msg.id ? "#a78bfa" : "#6b7280",
                                                }}>
                                                <Volume2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={bottomRef} className="h-4 w-full shrink-0"></div>
            </div>

            {/* ── Audience Controls (Bottom Bar) ──────────────────────────────────────────────────── */}
            <div className="relative z-40 border-t border-white/10 bg-black/95 backdrop-blur-xl px-4 py-3 shrink-0">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center">

                    <div className="flex items-center gap-4 border-r border-white/10 pr-6 shrink-0">
                        <div className="text-right">
                            <span className="font-orbitron text-xs block text-gray-400">AUDIENCE</span>
                            <span className="font-inter text-sm font-bold text-neon-blue">INTERACT</span>
                        </div>
                    </div>

                    {status === "running" ? (
                        <>
                            {isWaitingFeedback ? (
                                <div className="font-orbitron text-xs text-neon-purple animate-pulse shrink-0">
                                    WAITING FOR AUDIENCE FEEDBACK...
                                </div>
                            ) : (
                                <div className="font-orbitron text-xs text-gray-400 shrink-0">
                                    LLM IS GENERATING RESPONSE...
                                </div>
                            )}

                            <div className="flex gap-2 shrink-0">
                                <button disabled={!isWaitingFeedback} onClick={() => handleAudienceFeedback("AGREE")} className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-400 transition-all active:scale-95 disabled:opacity-30" title="Agree">
                                    <ThumbsUp className="w-5 h-5" />
                                </button>
                                <button disabled={!isWaitingFeedback} onClick={() => handleAudienceFeedback("NEUTRAL")} className="p-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/50 rounded-xl text-gray-400 transition-all active:scale-95 disabled:opacity-30" title="Neutral">
                                    <Minus className="w-5 h-5" />
                                </button>
                                <button disabled={!isWaitingFeedback} onClick={() => handleAudienceFeedback("DISAGREE")} className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 transition-all active:scale-95 disabled:opacity-30" title="Disagree">
                                    <ThumbsDown className="w-5 h-5" />
                                </button>
                                <button disabled={!isWaitingFeedback} onClick={() => handleAudienceFeedback("CONTINUE")} className="p-3 bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/50 rounded-xl text-neon-blue transition-all active:scale-95 flex items-center gap-2 font-orbitron text-xs ml-2 disabled:opacity-30" title="Continue Debate">
                                    NEXT <Play className="w-4 h-4" />
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => { e.preventDefault(); handleAudienceFeedback("COMMENT"); }}
                                className="flex-1 flex gap-2 w-full"
                            >
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        disabled={!isWaitingFeedback}
                                        value={audienceComment}
                                        onChange={(e) => setAudienceComment(e.target.value)}
                                        placeholder="Send a Custom Comment & Proceed..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white font-inter text-sm focus:outline-none focus:border-neon-blue/50 transition-all disabled:opacity-30"
                                    />
                                    <Zap className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                </div>
                                <button type="submit"
                                    disabled={!audienceComment.trim() || !isWaitingFeedback}
                                    className="px-6 py-2.5 rounded-xl font-orbitron text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40"
                                    style={{
                                        background: audienceComment.trim() ? "linear-gradient(135deg, rgba(0, 204, 255, 0.3), rgba(0, 204, 255, 0.1))" : "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(0, 204, 255, 0.4)",
                                        color: "#00ccff",
                                    }}>
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 text-center font-inter text-sm text-gray-500">
                            {status === "done" ? "Debate ended." : "Waiting..."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
