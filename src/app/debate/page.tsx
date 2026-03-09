"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Swords, ArrowLeft, Zap, KeyRound, Info, ChevronDown, Upload, ImageIcon, X } from "lucide-react";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";
import PixelCharacter from "@/components/debate/PixelCharacter";

const PRESET_TOPICS = [
    "AI will replace all human jobs within 20 years",
    "Social media does more harm than good to society",
    "Remote work is better than office work",
    "Open-source AI is more dangerous than closed-source AI",
    "Cryptocurrency will replace traditional banking",
    "Space colonization should be humanity's top priority",
    "Artificial General Intelligence is inevitable",
    "The metaverse is the future of human interaction",
];

const PROVIDERS = Object.keys(PROVIDER_CATALOGUE) as LLMProvider[];

const PROVIDER_FLOAT_DURATIONS = ["3.8s", "4.4s", "5.0s", "3.5s", "4.8s", "4.2s", "5.2s", "3.9s"];
const PROVIDER_FLOAT_DELAYS = ["0s", "0.5s", "1.1s", "1.8s", "0.3s", "0.9s", "1.5s", "2.2s"];

interface FighterConfig {
    name: string;
    provider: LLMProvider;
    model: string;
    apiKey: string;
    characterImage?: string;
}

/* ─── Image Upload Button ─── */
function ImageUploadButton({
    value, onChange, label, accentColor,
}: {
    value?: string;
    onChange: (dataUrl: string | undefined) => void;
    label: string;
    accentColor: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onChange(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    return (
        <div className="relative">
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {value ? (
                <div className="relative w-full h-28 rounded-xl overflow-hidden border-2 cursor-pointer group"
                    style={{ borderColor: accentColor }}
                    onClick={() => inputRef.current?.click()}>
                    <img src={value} alt="Character" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-inter">Change</span>
                    </div>
                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-400 transition-colors">
                        <X className="w-3 h-3 text-white" />
                    </button>
                </div>
            ) : (
                <button type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-14 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ borderColor: `${accentColor}50`, background: `${accentColor}08` }}>
                    <Upload className="w-4 h-4" style={{ color: accentColor }} />
                    <span className="text-xs font-inter" style={{ color: accentColor }}>{label}</span>
                </button>
            )}
        </div>
    );
}

/* ─── 3D tilt provider portrait card ─── */
function ProviderCard({
    provider, selected, onSelect, index,
}: {
    provider: LLMProvider;
    selected: boolean;
    onSelect: () => void;
    index: number;
}) {
    const info = PROVIDER_CATALOGUE[provider];
    const cardRef = useRef<HTMLButtonElement>(null);
    const [hovered, setHovered] = useState(false);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);
    const springX = useSpring(rotateX, { stiffness: 400, damping: 30 });
    const springY = useSpring(rotateY, { stiffness: 400, damping: 30 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        rotateY.set(dx * 14);
        rotateX.set(-dy * 14);
    };
    const handleLeave = () => { rotateX.set(0); rotateY.set(0); setHovered(false); };

    return (
        <motion.button
            ref={cardRef}
            onClick={onSelect}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={handleLeave}
            whileTap={{ scale: 0.93 }}
            className="relative p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 group"
            animate={selected ? {
                boxShadow: [`0 0 16px ${info.color}, 0 0 32px ${info.color}60`, `0 0 24px ${info.color}, 0 0 48px ${info.color}40`],
            } : {
                boxShadow: `0 0 0px transparent`,
            }}
            transition={{ duration: 0.8, repeat: selected ? Infinity : 0, repeatType: "reverse" }}
            style={{
                background: selected ? `${info.color}20` : "rgba(255,255,255,0.04)",
                border: `2px solid ${selected ? info.color : "rgba(255,255,255,0.08)"}`,
                rotateX: springX,
                rotateY: springY,
                transformStyle: "preserve-3d",
                animationName: hovered ? "none" : "card-float",
                animationDuration: PROVIDER_FLOAT_DURATIONS[index] ?? "4.5s",
                animationDelay: PROVIDER_FLOAT_DELAYS[index] ?? "0s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationFillMode: "both",
            }}
        >
            {selected && (
                <div className="absolute inset-x-0 h-px animate-scanline pointer-events-none z-10 opacity-60"
                    style={{ background: `linear-gradient(90deg, transparent, ${info.color}, transparent)` }} />
            )}

            <span className="text-3xl" style={{ filter: selected ? `drop-shadow(0 0 8px ${info.color})` : "none" }}>
                {info.avatar}
            </span>
            <span className="font-orbitron text-xs font-black text-white">{info.name}</span>

            {selected && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 -right-2 text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded"
                    style={{ background: info.color, color: "#000" }}
                >
                    ✓ SEL
                </motion.div>
            )}
        </motion.button>
    );
}

/* ─── Fighter Setup Panel ─── */
function FighterSetup({
    label, side, config, onChange,
}: {
    label: string;
    side: "FOR" | "AGAINST";
    config: FighterConfig;
    onChange: (c: FighterConfig) => void;
}) {
    const info = PROVIDER_CATALOGUE[config.provider];
    const [showKey, setShowKey] = useState(false);

    return (
        <div
            className="rounded-2xl p-6 space-y-5 relative overflow-hidden"
            style={{ border: `1px solid ${info.color}30`, background: `linear-gradient(135deg, rgba(5,5,20,0.97), ${info.color}08)` }}
        >
            {/* Top accent bar */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-0.5"
                animate={{ background: [`linear-gradient(90deg, ${info.color}, transparent)`, `linear-gradient(90deg, transparent, ${info.color}, transparent)`, `linear-gradient(90deg, transparent, ${info.color})`] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
                <motion.div
                    animate={{ boxShadow: [`0 0 10px ${info.color}40`, `0 0 20px ${info.color}80`, `0 0 10px ${info.color}40`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${info.color}15`, border: `1px solid ${info.color}40` }}
                >
                    {info.avatar}
                </motion.div>
                <div>
                    <span className="text-xs font-inter tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}>
                        {side === "FOR" ? "⚔ FOR" : "🛡 AGAINST"}
                    </span>
                    <h3 className="font-orbitron font-black text-white mt-1">{label}</h3>
                </div>
            </div>

            {/* Character Preview / Image Upload */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-2 block tracking-widest uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" /> Character Image
                </label>
                <ImageUploadButton
                    value={config.characterImage}
                    onChange={(url) => onChange({ ...config, characterImage: url })}
                    label="Upload Character Image"
                    accentColor={info.color}
                />
                {!config.characterImage && (
                    <div className="mt-2 flex justify-center py-3 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-x-0 h-px animate-scanline opacity-20 pointer-events-none"
                            style={{ background: `linear-gradient(90deg, transparent, ${info.color}80, transparent)` }} />
                        <PixelCharacter
                            type={config.model.toLowerCase().includes("gpt") ? "gpt" :
                                config.model.toLowerCase().includes("gemini") ? "gemini" :
                                    config.model.toLowerCase().includes("claude") ? "claude" : "default"}
                            isActive={true}
                            side={side === "FOR" ? "left" : "right"}
                            glowColor={info.color}
                        />
                    </div>
                )}
            </div>

            {/* Provider Select */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-2 block tracking-widest uppercase">Choose Fighter</label>
                <div className="grid grid-cols-4 gap-2" style={{ perspective: 600 }}>
                    {PROVIDERS.map((p, idx) => (
                        <ProviderCard
                            key={p}
                            provider={p}
                            index={idx}
                            selected={config.provider === p}
                            onSelect={() => {
                                const prov = PROVIDER_CATALOGUE[p];
                                const envKeyMap: Record<string, string> = {
                                    openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
                                    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "",
                                    gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
                                    deepseek: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? "",
                                    groq: process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "",
                                    cerebras: process.env.NEXT_PUBLIC_CEREBRAS_API_KEY ?? "",
                                };
                                onChange({
                                    ...config,
                                    provider: p,
                                    model: prov.models[0],
                                    name: prov.name,
                                    apiKey: envKeyMap[p] ?? "",
                                });
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Model Select */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 block">Model</label>
                <div className="relative">
                    <select
                        value={config.model}
                        onChange={(e) => onChange({ ...config, model: e.target.value })}
                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-inter focus:outline-none focus:border-white/30 transition-all"
                    >
                        {PROVIDER_CATALOGUE[config.provider].models.map((m) => (
                            <option key={m} value={m} className="bg-[#05050f]">{m}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            </div>

            {/* Fighter Name */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 block">Fighter Name</label>
                <input
                    type="text"
                    value={config.name}
                    onChange={(e) => onChange({ ...config, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-orbitron focus:outline-none focus:border-white/30 transition-all placeholder:text-gray-700 text-sm"
                    placeholder={info.name}
                />
            </div>

            {/* API Key */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3" /> API Key
                </label>
                <div className="relative">
                    <input
                        type={showKey ? "text" : "password"}
                        value={config.apiKey}
                        onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-20 text-white font-inter focus:outline-none transition-all placeholder:text-gray-700 text-sm"
                        style={{ borderColor: config.apiKey ? `${info.color}40` : undefined } as React.CSSProperties}
                        placeholder={info.keyPlaceholder}
                    />
                    <button type="button" onClick={() => setShowKey((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs font-inter">
                        {showKey ? "hide" : "show"}
                    </button>
                </div>
                {config.apiKey && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-green-400 text-xs font-inter">Key added</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DebateLobby() {
    const router = useRouter();
    const [topic, setTopic] = useState("");
    const [rounds, setRounds] = useState(5);
    const [showPresets, setShowPresets] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const [startError, setStartError] = useState<string | null>(null);

    const [fighter1, setFighter1] = useState<FighterConfig>({
        name: "GPT-4o Mini",
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
    });

    const [fighter2, setFighter2] = useState<FighterConfig>({
        name: "Gemini Flash",
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
    });

    const canStart = topic.trim() && fighter1.apiKey && fighter2.apiKey;

    const handleBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleStart = () => {
        if (!topic.trim()) {
            setStartError("Please enter a debate topic first.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (!fighter1.apiKey) {
            setStartError("Please add an API key for Fighter 1.");
            return;
        }
        if (!fighter2.apiKey) {
            setStartError("Please add an API key for Fighter 2.");
            return;
        }
        setStartError(null);
        const config = { topic: topic.trim(), rounds, fighter1, fighter2, backgroundImage };
        sessionStorage.setItem("debateConfig", JSON.stringify(config));
        router.push("/debate/room");
    };

    const f1Info = PROVIDER_CATALOGUE[fighter1.provider];
    const f2Info = PROVIDER_CATALOGUE[fighter2.provider];

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute w-[700px] h-[400px] rounded-full bg-neon-purple/10 blur-[160px] top-0 left-1/2 -translate-x-1/2" />
                <div className="absolute w-[500px] h-[300px] rounded-full bg-neon-pink/8 blur-[140px] bottom-20 right-0" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">

                {/* Nav */}
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Arena
                    </Link>
                    <span className="font-orbitron font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue">
                        LLM ARENA
                    </span>
                </div>

                {/* Title */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-inter tracking-widest uppercase mb-5">
                        <Swords className="w-3.5 h-3.5" /> Phase 2 — Fighter Select
                    </div>
                    <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-orbitron font-black text-white leading-none mb-4">
                        Choose Your{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-purple">
                            AI Fighters
                        </span>
                    </h1>
                    <p className="text-gray-400 font-inter max-w-xl mx-auto">
                        Pick a topic, select your AI combatants, and watch them debate in real time.
                    </p>
                </motion.div>

                {/* Background Image Upload */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
                    <label className="block text-gray-300 font-orbitron text-sm mb-3 tracking-wider">🖼 ARENA BACKGROUND</label>
                    <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgFile} className="hidden" />
                    {backgroundImage ? (
                        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-neon-purple/30 cursor-pointer group"
                            onClick={() => bgInputRef.current?.click()}>
                            <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Upload className="w-4 h-4 text-white" />
                                <span className="text-white text-sm font-inter">Change Background</span>
                            </div>
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); setBackgroundImage(undefined); }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-400 transition-colors">
                                <X className="w-4 h-4 text-white" />
                            </button>
                            <div className="absolute bottom-2 left-2 text-xs font-inter text-white/70 bg-black/60 px-2 py-0.5 rounded-full">
                                ✓ Custom background set
                            </div>
                        </div>
                    ) : (
                        <button type="button"
                            onClick={() => bgInputRef.current?.click()}
                            className="w-full h-16 rounded-2xl border-2 border-dashed border-neon-purple/20 flex items-center justify-center gap-3 hover:border-neon-purple/50 hover:bg-neon-purple/5 transition-all">
                            <ImageIcon className="w-5 h-5 text-neon-purple/60" />
                            <span className="text-gray-500 font-inter text-sm">Upload Arena Background Image (optional)</span>
                        </button>
                    )}
                </motion.div>

                {/* Topic input */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
                    <label className="block text-gray-300 font-orbitron text-sm mb-3 tracking-wider">⚡ DEBATE TOPIC</label>
                    <div className="relative">
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            rows={2}
                            className="w-full bg-white/5 border border-neon-purple/20 rounded-2xl px-6 py-4 text-white font-inter text-lg focus:outline-none focus:border-neon-purple/60 focus:ring-2 focus:ring-neon-purple/20 transition-all placeholder:text-gray-600 resize-none"
                            placeholder='e.g. "AI will replace all human jobs within 20 years"'
                        />
                        {!topic && (
                            <button onClick={() => setShowPresets(!showPresets)}
                                className="absolute right-4 bottom-4 flex items-center gap-1.5 text-xs font-inter text-neon-purple hover:text-white transition-colors">
                                <Zap className="w-3 h-3" /> Quick picks
                            </button>
                        )}
                    </div>
                    <AnimatePresence>
                        {showPresets && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                className="mt-3 flex flex-wrap gap-2">
                                {PRESET_TOPICS.map((t) => (
                                    <button key={t} onClick={() => { setTopic(t); setShowPresets(false); }}
                                        className="px-3 py-1.5 text-xs font-inter rounded-full bg-neon-purple/10 border border-neon-purple/20 text-gray-300 hover:border-neon-purple/60 hover:text-white transition-all text-left">
                                        {t}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Rounds */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                    <label className="block text-gray-300 font-orbitron text-sm mb-3 tracking-wider">💬 CONVERSATION LENGTH</label>
                    <div className="flex gap-3">
                        {[3, 5, 8, 12].map((r) => (
                            <button key={r} onClick={() => setRounds(r)}
                                className="flex-1 py-3 rounded-xl font-orbitron font-bold transition-all duration-200"
                                style={{
                                    background: rounds === r ? "rgba(144,0,255,0.2)" : "rgba(255,255,255,0.04)",
                                    border: `2px solid ${rounds === r ? "#90f" : "rgba(255,255,255,0.08)"}`,
                                    color: rounds === r ? "#90f" : "#9ca3af",
                                    boxShadow: rounds === r ? "0 0 16px rgba(144,0,255,0.3)" : "none",
                                }}>
                                {r === 3 ? "Short" : r === 5 ? "Medium" : r === 8 ? "Long" : "Marathon"}
                                <span className="block text-[10px] opacity-60 mt-0.5">{r} turns/side</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Fighter Setups with animated VS */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start mb-10">

                    <FighterSetup label="Fighter 1 (FOR)" side="FOR" config={fighter1} onChange={setFighter1} />

                    {/* Animated VS divider */}
                    <div className="flex flex-col items-center gap-3 px-2 mt-8">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.08, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Swords className="w-8 h-8 text-neon-purple" style={{ filter: "drop-shadow(0 0 10px #90f)" }} />
                        </motion.div>
                        <div className="font-orbitron font-black text-lg text-transparent bg-clip-text bg-gradient-to-b from-neon-pink to-neon-purple">
                            VS
                        </div>
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: f1Info.color, boxShadow: `0 0 8px ${f1Info.color}` }} />
                            <div className="w-3 h-3 rounded-full" style={{ background: f2Info.color, boxShadow: `0 0 8px ${f2Info.color}` }} />
                        </div>
                    </div>

                    <FighterSetup label="Fighter 2 (AGAINST)" side="AGAINST" config={fighter2} onChange={setFighter2} />
                </motion.div>

                {/* Info note */}
                <div className="flex items-start gap-2 p-4 rounded-xl bg-white/3 border border-white/8 mb-8">
                    <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-500 font-inter text-xs leading-relaxed">
                        API keys are sent directly to each provider and <strong>never stored on our servers</strong>.
                        For best results, use <strong>gemini-2.0-flash</strong> (free) or <strong>gpt-4o-mini</strong> (cheap) as fighters.
                    </p>
                </div>

                {/* Error message */}
                <AnimatePresence>
                    {startError && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-500/40 mb-4"
                        >
                            <span className="text-red-400 text-sm font-inter">⚠️ {startError}</span>
                            <button onClick={() => setStartError(null)} className="ml-auto text-gray-500 hover:text-white text-xs">✕</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    animate={startError ? { x: [-8, 8, -8, 8, 0] } : {}}
                    onClick={handleStart}
                    className="w-full py-5 rounded-2xl font-orbitron font-black text-xl flex items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden cursor-pointer"
                    style={{
                        background: canStart ? "linear-gradient(135deg, #f0f, #90f)" : "rgba(255,255,255,0.05)",
                        color: canStart ? "white" : "#6b7280",
                        boxShadow: canStart ? "0 0 40px rgba(240,0,255,0.3), 0 0 80px rgba(144,0,255,0.15)" : "none",
                        border: canStart ? "none" : "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    {canStart && (
                        <div className="absolute inset-x-0 h-px animate-scanline opacity-40 pointer-events-none"
                            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)" }} />
                    )}
                    <Swords className="w-6 h-6" />
                    {!fighter1.apiKey || !fighter2.apiKey
                        ? "Add API Keys to Both Fighters"
                        : !topic.trim()
                            ? "Enter a Debate Topic"
                            : "START THE DEBATE"}
                </motion.button>
            </div>
        </div>
    );
}
