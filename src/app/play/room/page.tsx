"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Loader2, History, ThumbsUp, ThumbsDown,
    Minus, Send, Megaphone, RotateCcw, Pause, Play as PlayIcon,
    Volume2, VolumeX
} from "lucide-react";
import { LLMProvider, PROVIDER_CATALOGUE } from "@/lib/llm-adapters";
import ChatBubble, { ChatBubbleMessage } from "@/components/debate/ChatBubble";
import ComicChatOverlay from "@/components/debate/ComicChatOverlay";
import { playImageStore } from "@/lib/play-store";

const PhaserArena = dynamic(() => import("@/components/debate/PhaserArena"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#08081a] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <p className="font-orbitron text-xs text-emerald-500 tracking-widest animate-pulse">LOADING ARENA...</p>
        </div>
    ),
});

// Fallback character images
const FALLBACK_C1 = "/assets/avatar4.png";
const FALLBACK_C2 = "/assets/avatar3.jpg";
const FALLBACK_BG = "/assets/Gemini_Generated_Image_kjsil6kjsil6kjsi.png";

interface RoleConfig {
    name: string;
    provider: LLMProvider;
    model: string;
    apiKey: string;
    behaviour: string;
    characterImage?: string;
}

interface PlayConfig {
    rounds: number;
    char1: RoleConfig;
    char2: RoleConfig;
    backgroundImage?: string;
    scenario?: string;
}

type PlayStatus = "idle" | "loading" | "running" | "paused" | "done" | "error";

const QUICK_DIRECTIVES = [
    "Talk about something completely random!",
    "Start arguing with each other!",
    "Do something embarrassing!",
    "Tell a joke!",
    "Reveal a secret!",
    "Challenge each other!",
];

export default function PlayRoom() {
    const router = useRouter();
    const [config, setConfig] = useState<PlayConfig | null>(null);
    const [status, setStatus] = useState<PlayStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [apiErrors, setApiErrors] = useState<string[]>([]);

    const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);
    const [streamingMsg, setStreamingMsg] = useState<ChatBubbleMessage | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [audienceReaction, setAudienceReaction] = useState<string | null>(null);

    // Audience direction
    const [directionText, setDirectionText] = useState("");
    const [showQuickPicks, setShowQuickPicks] = useState(false);
    const [lastDirection, setLastDirection] = useState<string | null>(null);

    const [activeRole, setActiveRole] = useState<"fighter1" | "fighter2" | null>(null);
    const [currentTurnDisplay, setCurrentTurnDisplay] = useState(0);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const pauseRef = useRef(false);   // true = streaming is paused
    const turnRef = useRef(0);
    const startedRef = useRef(false);


    useEffect(() => {
        const raw = sessionStorage.getItem("playConfig");
        if (!raw) { router.replace("/play"); return; }
        try { setConfig(JSON.parse(raw)); }
        catch { router.replace("/play"); }
    }, [router]);

    const startPlay = useCallback(async (cfg: PlayConfig, directionContext?: string) => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        pauseRef.current = false;

        setStatus("running");
        setStreamingMsg(null);
        setApiErrors([]);
        setAudienceReaction(null);

        const directionSuffix = directionContext
            ? `\n\n[AUDIENCE DIRECTIVE: ${directionContext} — React naturally to this!]`
            : "";

        const sendCfg = {
            ...cfg,
            char1: { ...cfg.char1, behaviour: cfg.char1.behaviour + directionSuffix },
            char2: { ...cfg.char2, behaviour: cfg.char2.behaviour + directionSuffix },
        };

        try {
            const response = await fetch("/api/play/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sendCfg),
                signal: abortRef.current.signal,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Server error: ${response.status}`);
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let currentStreamText = "";
            let currentStreamMsg: ChatBubbleMessage | null = null;

            const c1Info = PROVIDER_CATALOGUE[cfg.char1.provider];
            const c2Info = PROVIDER_CATALOGUE[cfg.char2.provider];

            while (true) {
                // ── Pause handling: busy-wait until unpaused
                while (pauseRef.current) {
                    await new Promise(r => setTimeout(r, 200));
                    if (abortRef.current?.signal.aborted) return;
                }

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data: ")) continue;
                    let evt: Record<string, unknown>;
                    try { evt = JSON.parse(trimmed.slice(6)); } catch { continue; }

                    switch (evt.type) {
                        case "round_start": {
                            // ── Auto-pause between turns so audience can read
                            while (pauseRef.current) {
                                await new Promise(r => setTimeout(r, 200));
                                if (abortRef.current?.signal.aborted) return;
                            }
                            turnRef.current += 1;
                            setCurrentTurnDisplay(turnRef.current);
                            const role = evt.activeRole as "char1" | "char2";
                            setActiveRole(role === "char1" ? "fighter1" : "fighter2");
                            const isChar1 = role === "char1";
                            currentStreamText = "";
                            currentStreamMsg = {
                                id: `turn-${turnRef.current}-${Date.now()}`,
                                fighter: isChar1 ? "fighter1" : "fighter2",
                                fighterName: isChar1 ? cfg.char1.name : cfg.char2.name,
                                side: isChar1 ? "FOR" : "AGAINST",
                                content: "",
                                isStreaming: true,
                                avatar: isChar1 ? c1Info.avatar : c2Info.avatar,
                                color: isChar1 ? c1Info.color : c2Info.color,
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
                                setMessages(p => [...p, finalMsg]);
                                setStreamingMsg(null);
                                currentStreamMsg = null;
                                currentStreamText = "";
                            }
                            setActiveRole(null);
                            // ── Auto-pause after each turn so audience can read
                            pauseRef.current = true;
                            setStatus("paused");
                            break;
                        }
                        case "error": {
                            const errRole = evt.role as "char1" | "char2";
                            const errText = evt.message as string;
                            setApiErrors(prev => [...prev, `${errRole === "char1" ? cfg.char1.name : cfg.char2.name}: ${errText}`]);
                            if (currentStreamMsg) {
                                const errBubble: ChatBubbleMessage = {
                                    ...currentStreamMsg,
                                    content: `⚠️ API Error: ${errText}`,
                                    isStreaming: false,
                                    color: "#ef4444",
                                };
                                setMessages(p => [...p, errBubble]);
                                setStreamingMsg(null);
                                currentStreamMsg = null;
                            }
                            break;
                        }
                        case "done":
                            setStatus("done");
                            setStreamingMsg(null);
                            pauseRef.current = false;
                            break;
                        case "fatal_error":
                            throw new Error(evt.message as string);
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setErrorMsg((err as Error).message);
            setStatus("error");
        }
    }, []);

    // Start on mount
    useEffect(() => {
        if (config && !startedRef.current) {
            startedRef.current = true;
            startPlay(config);
        }
    }, [config, startPlay]);

    const handleResume = () => {
        pauseRef.current = false;
        setStatus("running");
    };

    const handlePause = () => {
        pauseRef.current = true;
        setStatus("paused");
    };

    const handleDirectionSubmit = (text: string) => {
        if (!config || !text.trim()) return;
        setLastDirection(text.trim());
        setDirectionText("");
        setShowQuickPicks(false);
        setMessages([]);
        turnRef.current = 0;
        setCurrentTurnDisplay(0);
        startPlay(config, text.trim());
    };

    const handlePlayAgain = (reaction?: string) => {
        if (!config) return;
        const extra = reaction === "CHEER" ? "The audience loved it! Keep the energy high and build on it!"
            : reaction === "BOO" ? "The audience is bored and booing. SPICE THINGS UP! Make it crazy!"
                : undefined;
        setMessages([]);
        turnRef.current = 0;
        setCurrentTurnDisplay(0);
        setLastDirection(null);
        startPlay(config, extra);
    };

    const handleRestart = () => { abortRef.current?.abort(); router.push("/play"); };

    // ── TTS: speak a message on demand ──────────────────────────────────────────
    const speakMessage = useCallback(async (msg: ChatBubbleMessage) => {
        if (!ttsEnabled) return;
        if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
        if (speakingMsgId === msg.id) { setSpeakingMsgId(null); return; }
        setSpeakingMsgId(msg.id);
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: msg.content.slice(0, 500), speaker: msg.fighter === "fighter1" ? "arvind" : "meera" })
            });
            const data = await res.json();
            if (data.audioBase64) {
                const audio = new Audio("data:audio/mpeg;base64," + data.audioBase64);
                ttsAudioRef.current = audio;
                audio.onended = () => { setSpeakingMsgId(null); ttsAudioRef.current = null; };
                audio.onerror = () => { setSpeakingMsgId(null); ttsAudioRef.current = null; };
                audio.play().catch(() => setSpeakingMsgId(null));
            } else { setSpeakingMsgId(null); }
        } catch { setSpeakingMsgId(null); }
    }, [ttsEnabled, speakingMsgId]);

    if (!config) {
        return <div className="min-h-screen bg-dark-bg flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>;
    }

    const c1Info = PROVIDER_CATALOGUE[config.char1.provider];
    const c2Info = PROVIDER_CATALOGUE[config.char2.provider];

    // Images from in-memory store (base64 too large for sessionStorage)
    const imgs = playImageStore.get();
    const c1Image = imgs.char1Image || FALLBACK_C1;
    const c2Image = imgs.char2Image || FALLBACK_C2;
    const backgroundImage = imgs.backgroundImage; // may be undefined → Phaser uses default

    const isRunning = status === "running";
    const isPaused = status === "paused";

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col overflow-hidden"
            style={{ height: "100dvh" }}>

            {/* subtle BG glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute w-[600px] h-[400px] rounded-full bg-emerald-500/8 blur-[160px] top-0 left-1/4" />
                <div className="absolute w-[400px] h-[300px] rounded-full bg-emerald-200/6 blur-[140px] bottom-0 right-1/4" />
            </div>

            {/* ── HEADER */}
            <div className="relative z-20 flex-shrink-0 border-b border-white/10 bg-black/70 backdrop-blur-md">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
                    <button onClick={handleRestart}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Exit
                    </button>
                    <div className="text-center">
                        <span className="font-orbitron font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-white tracking-widest uppercase block">
                            LLM ARENA • PLAY MODE
                        </span>
                        {config.scenario && (
                            <span className="text-[10px] font-inter text-emerald-500/70 truncate max-w-[240px] block">
                                📽 {config.scenario}
                            </span>
                        )}
                    </div>
                    <button onClick={() => setShowHistory(h => !h)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <History className="w-4 h-4" /> {showHistory ? "Arena" : "History"}
                    </button>
                </div>
            </div>

            {/* ── MAIN SCROLL AREA */}
            <div className="flex-1 flex flex-col items-center p-4 pt-5 relative z-10 w-full overflow-y-auto">

                {/* ─── 16:9 ARENA BOX ─── */}
                <div className="relative w-full max-w-5xl rounded-2xl border-2 border-white/20 shadow-[0_0_60px_rgba(16,185,129,0.3)] overflow-hidden flex-shrink-0"
                    style={{ aspectRatio: "16/9" }}>

                    {/* Phaser arena with background */}
                    <div className="absolute inset-0 z-0">
                        <PhaserArena
                            fighter1Provider={config.char1.provider}
                            fighter2Provider={config.char2.provider}
                            fighter1Name={config.char1.name}
                            fighter2Name={config.char2.name}
                            activeFighter={activeRole}
                            status={status === "paused" ? "running" : status}
                            backgroundImage={backgroundImage || FALLBACK_BG}
                        />
                    </div>

                    {/* Character 1 — left */}
                    <div className="absolute bottom-0 left-0 z-10 flex flex-col items-center"
                        style={{
                            width: "20%",
                            transform: activeRole === "fighter1" ? "scale(1.04)" : "scale(1)",
                            transition: "transform 0.3s ease",
                        }}>
                        {activeRole === "fighter1" && (
                            <div className="absolute -inset-2 rounded-full animate-ping opacity-20 pointer-events-none"
                                style={{ background: `radial-gradient(circle, ${c1Info.color}80 0%, transparent 70%)` }} />
                        )}
                        <img src={c1Image} alt={config.char1.name}
                            className="w-full h-auto object-contain drop-shadow-2xl"
                            style={{
                                maxHeight: "75%",
                                filter: activeRole === "fighter1"
                                    ? `drop-shadow(0 0 20px ${c1Info.color}) brightness(1.1)`
                                    : "drop-shadow(0 4px 12px rgba(0,0,0,0.9))",
                            }} />
                        <div className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider font-mono shadow-lg"
                            style={{
                                background: `linear-gradient(90deg, ${c1Info.color}cc, ${c1Info.color}88)`,
                                boxShadow: activeRole === "fighter1" ? `0 0 12px ${c1Info.color}` : "none",
                            }}>
                            {config.char1.name}
                        </div>
                    </div>

                    {/* Character 2 — right */}
                    <div className="absolute bottom-0 right-0 z-10 flex flex-col items-center"
                        style={{
                            width: "20%",
                            transform: activeRole === "fighter2" ? "scale(1.04)" : "scale(1)",
                            transition: "transform 0.3s ease",
                        }}>
                        {activeRole === "fighter2" && (
                            <div className="absolute -inset-2 rounded-full animate-ping opacity-20 pointer-events-none"
                                style={{ background: `radial-gradient(circle, ${c2Info.color}80 0%, transparent 70%)` }} />
                        )}
                        <img src={c2Image} alt={config.char2.name}
                            className="w-full h-auto object-contain drop-shadow-2xl"
                            style={{
                                maxHeight: "75%",
                                transform: "scaleX(-1)",
                                filter: activeRole === "fighter2"
                                    ? `drop-shadow(0 0 20px ${c2Info.color}) brightness(1.1)`
                                    : "drop-shadow(0 4px 12px rgba(0,0,0,0.9))",
                            }} />
                        <div className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider font-mono shadow-lg"
                            style={{
                                background: `linear-gradient(90deg, ${c2Info.color}88, ${c2Info.color}cc)`,
                                boxShadow: activeRole === "fighter2" ? `0 0 12px ${c2Info.color}` : "none",
                            }}>
                            {config.char2.name}
                        </div>
                    </div>

                    {/* Comic Chat — center between characters */}
                    <div className="absolute inset-x-[20%] top-0 bottom-14 z-20 pointer-events-none">
                        <ComicChatOverlay
                            messages={showHistory ? [] : messages}
                            streamingMsg={showHistory ? null : streamingMsg}
                            insightMap={{}}
                        />
                    </div>

                    {/* Top turn bar */}
                    <div className="absolute top-0 left-0 right-0 z-25 flex items-center justify-between px-3 py-2"
                        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: c1Info.color, boxShadow: `0 0 6px ${c1Info.color}` }} />
                            <span className="font-orbitron text-[10px] text-white font-black">{config.char1.name}</span>
                        </div>
                        <div className="font-orbitron text-[10px] text-gray-300">
                            TURN <span className="text-white font-black bg-white/10 px-1.5 py-0.5 rounded">{currentTurnDisplay}</span> / {config.rounds * 2}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-orbitron text-[10px] text-white font-black">{config.char2.name}</span>
                            <div className="w-2 h-2 rounded-full" style={{ background: c2Info.color, boxShadow: `0 0 6px ${c2Info.color}` }} />
                        </div>
                    </div>

                    {/* Loading overlay */}
                    {status === "loading" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-md z-30">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                            <p className="font-orbitron text-emerald-500 text-sm animate-pulse tracking-widest">SETTING THE SCENE...</p>
                        </div>
                    )}

                    {/* ── Small NEXT TURN button — only shows when paused ── */}
                    <AnimatePresence>
                        {isPaused && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30"
                            >
                                <button
                                    onClick={handleResume}
                                    className="flex items-center gap-2 px-5 py-2 rounded-full font-orbitron text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-lg"
                                    style={{
                                        background: "linear-gradient(135deg,#10b981,#059669)",
                                        color: "white",
                                        boxShadow: "0 0 20px rgba(16,185,129,0.5)",
                                    }}
                                >
                                    <PlayIcon className="w-3.5 h-3.5" /> NEXT TURN
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* API errors */}
                    {apiErrors.length > 0 && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 max-w-lg w-full bg-red-900/80 border border-red-500 p-4 rounded-xl z-30 text-xs font-inter text-red-200">
                            <strong>API ERRORS:</strong>
                            <ul className="list-disc pl-4 mt-1">{apiErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </div>
                    )}

                    {/* Error overlay */}
                    {status === "error" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md z-30">
                            <span className="text-4xl">⚠️</span>
                            <p className="font-orbitron text-red-400 text-sm text-center px-6">{errorMsg}</p>
                            <div className="flex gap-3">
                                <button onClick={handleRestart} className="px-5 py-2.5 rounded-xl font-orbitron text-xs border border-white/20 text-white hover:bg-white/5 transition-all">EXIT</button>
                                <button onClick={() => config && startPlay(config)} className="px-5 py-2.5 rounded-xl font-orbitron text-xs bg-emerald-900/20 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/20 transition-all">RETRY</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Controls bar beneath arena */}
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
                                background: ttsEnabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                                borderColor: ttsEnabled ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)",
                                color: ttsEnabled ? "#10b981" : "#6b7280",
                            }}>
                            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{ttsEnabled ? "Voice ON" : "Voice OFF"}</span>
                        </button>
                        {/* ── PAUSE / RESUME button */}
                        {(isRunning || isPaused) && (
                            <button
                                onClick={isPaused ? handleResume : handlePause}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-orbitron text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                style={{
                                    background: isPaused
                                        ? "linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.1))"
                                        : "rgba(255,255,255,0.06)",
                                    border: isPaused ? "1px solid rgba(16,185,129,0.6)" : "1px solid rgba(255,255,255,0.14)",
                                    color: isPaused ? "#10b981" : "#9ca3af",
                                }}>
                                {isPaused ? <><PlayIcon className="w-3.5 h-3.5" /> CONTINUE</> : <><Pause className="w-3.5 h-3.5" /> PAUSE</>}
                            </button>
                        )}
                        <button onClick={() => setShowHistory(h => !h)}
                            className="flex items-center gap-2 p-2 px-4 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-inter text-xs">
                            <History className="w-4 h-4" /> {showHistory ? "Back to Arena" : "View History"}
                        </button>
                    </div>
                </div>

                {/* History panel */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="w-full max-w-5xl bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl mb-6 shrink-0">
                            <div className="text-xs font-orbitron text-gray-400 tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center justify-between">
                                <span>SCENE HISTORY</span>
                                {ttsEnabled && <span className="text-[10px] text-emerald-400 font-inter">Click 🔊 to hear a message</span>}
                            </div>
                            <div className="space-y-6">
                                {messages.map(msg => (
                                    <div key={msg.id} className="relative">
                                        <ChatBubble message={msg} insight={null} />
                                        {ttsEnabled && (
                                            <button onClick={() => speakMessage(msg)}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg transition-all hover:scale-110"
                                                style={{
                                                    background: speakingMsgId === msg.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)",
                                                    border: `1px solid ${speakingMsgId === msg.id ? "rgba(16,185,129,0.6)" : "rgba(255,255,255,0.1)"}`,
                                                    color: speakingMsgId === msg.id ? "#10b981" : "#6b7280",
                                                }}>
                                                <Volume2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {messages.length === 0 && <p className="text-gray-600 font-inter text-sm text-center py-4">No messages yet...</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scene done panel */}
                <AnimatePresence>
                    {status === "done" && (
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-5xl bg-black/90 backdrop-blur-xl p-8 rounded-3xl mb-6 border border-white/20 shrink-0"
                            style={{ boxShadow: "0 0 50px rgba(16,185,129,0.15)" }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs font-orbitron text-gray-400 tracking-widest">AND... CUT! 🎬</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>
                            <p className="text-gray-400 font-inter text-sm text-center mb-5">How did the audience feel?</p>
                            <div className="flex gap-3 justify-center mb-6">
                                {[
                                    { id: "CHEER", icon: <ThumbsUp className="w-5 h-5" />, label: "🔥 Loved it!", color: "#10b981" },
                                    { id: "NEUTRAL", icon: <Minus className="w-5 h-5" />, label: "😐 Meh", color: "#6b7280" },
                                    { id: "BOO", icon: <ThumbsDown className="w-5 h-5" />, label: "💤 Boring!", color: "#ef4444" },
                                ].map(btn => (
                                    <button key={btn.id} onClick={() => setAudienceReaction(btn.id)}
                                        className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all font-orbitron text-xs hover:scale-105"
                                        style={{
                                            background: audienceReaction === btn.id ? `${btn.color}20` : "rgba(255,255,255,0.04)",
                                            border: `2px solid ${audienceReaction === btn.id ? btn.color : "rgba(255,255,255,0.1)"}`,
                                            color: audienceReaction === btn.id ? btn.color : "#6b7280",
                                            boxShadow: audienceReaction === btn.id ? `0 0 20px ${btn.color}30` : "none",
                                        }}>
                                        {btn.icon}
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 max-w-sm mx-auto">
                                <button onClick={handleRestart}
                                    className="flex-1 py-3 rounded-xl font-orbitron text-xs border border-white/20 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                    ← Setup
                                </button>
                                <button onClick={() => handlePlayAgain(audienceReaction ?? undefined)}
                                    className="flex-1 py-3 rounded-xl font-orbitron text-xs font-black transition-all hover:scale-105 flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "white", boxShadow: "0 0 20px rgba(16,185,129,0.4)" }}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Play Again
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            {/* ── AUDIENCE DIRECTION BAR (pinned bottom) */}
            <div className="relative z-40 border-t border-white/10 bg-black/95 backdrop-blur-xl shrink-0">

                {/* Last directive tag */}
                {lastDirection && (
                    <div className="px-4 pt-2 flex items-center gap-2">
                        <span className="text-[10px] font-inter text-gray-600">Last directive:</span>
                        <span className="text-[10px] font-inter text-emerald-500/70 truncate max-w-xs">"{lastDirection}"</span>
                    </div>
                )}

                {/* Quick-pick chips */}
                <AnimatePresence>
                    {showQuickPicks && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                            className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
                            {QUICK_DIRECTIVES.map(d => (
                                <button key={d} onClick={() => handleDirectionSubmit(d)}
                                    className="text-xs font-inter px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", color: "#10b981" }}>
                                    {d}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="px-4 py-3 flex items-center gap-3">
                    <div className="flex flex-col items-center shrink-0">
                        <Megaphone className={`w-5 h-5 ${isRunning ? "text-emerald-400 animate-pulse" : "text-gray-500"}`} />
                        <span className={`text-[8px] font-orbitron mt-0.5 ${isRunning ? "text-emerald-400" : "text-gray-600"}`}>
                            DIRECT
                        </span>
                    </div>

                    <form onSubmit={e => { e.preventDefault(); handleDirectionSubmit(directionText); }}
                        className="flex-1 flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={directionText}
                                onChange={e => setDirectionText(e.target.value)}
                                onFocus={() => setShowQuickPicks(true)}
                                placeholder="Tell the characters what to talk about..."
                                className="w-full bg-white/5 border rounded-xl px-4 py-2.5 pr-10 text-white font-inter text-sm focus:outline-none transition-all placeholder:text-gray-600"
                                style={{
                                    borderColor: directionText ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)",
                                    boxShadow: directionText ? "0 0 12px rgba(16,185,129,0.15)" : "none",
                                }}
                            />
                            <button type="button" onClick={() => setShowQuickPicks(q => !q)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors">
                                <Megaphone className="w-4 h-4" />
                            </button>
                        </div>
                        <motion.button type="submit"
                            disabled={!directionText.trim()}
                            whileTap={{ scale: 0.95 }}
                            className="px-5 py-2.5 rounded-xl font-orbitron text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-30"
                            style={{
                                background: directionText.trim() ? "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))" : "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(16,185,129,0.4)",
                                color: "#10b981",
                            }}>
                            <Send className="w-4 h-4" /> DIRECT
                        </motion.button>
                    </form>
                </div>

                {/* Status dot */}
                {(isRunning || isPaused) && (
                    <div className="px-4 pb-2 flex items-center gap-2">
                        {isRunning ? (
                            [0, 1, 2].map(i => (
                                <div key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))
                        ) : (
                            <div className="w-1 h-1 rounded-full bg-yellow-500" />
                        )}
                        <span className="font-orbitron text-[10px] tracking-wider" style={{ color: isRunning ? "#10b981" : "#eab308" }}>
                            {isPaused
                                ? "⏸ Paused — press CONTINUE or read before next turn"
                                : activeRole === "fighter1" ? `${config.char1.name} is speaking...`
                                    : activeRole === "fighter2" ? `${config.char2.name} is speaking...`
                                        : "Scene in progress..."}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
