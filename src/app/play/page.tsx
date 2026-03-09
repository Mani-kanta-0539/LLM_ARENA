"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Gamepad2, ArrowLeft, Zap, KeyRound, Info, ChevronDown, Upload, ImageIcon, X, Sparkles } from "lucide-react";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";
import PixelCharacter from "@/components/debate/PixelCharacter";
import { playImageStore } from "@/lib/play-store";

const PRESET_SCENARIOS = [
    "Two characters meet at a coffee shop and discover they both have the same weird habit",
    "Donald Trump and Abraham Lincoln ordering a pizza together",
    "Batman and Iron Man arguing about who is richer",
    "Gordon Ramsay reviewing a meal cooked by SpongeBob",
    "Gollum trying to buy a used car from a sleazy salesman",
];

const PRESET_BEHAVIOURS_A = [
    "Act as Donald Trump. Speak confidently, use superlatives, and brag constantly.",
    "Act as Batman. Brooding, serious, obsessed with justice and gadgets.",
    "Act as Gordon Ramsay. Brutally honest food critic with a fiery temper.",
    "Act as Yoda from Star Wars. Speak in reversed sentence order, give wise advice.",
    "Act as Sherlock Holmes. Hyper-observant, condescending, speaks in deductions.",
];

const PRESET_BEHAVIOURS_B = [
    "Act as Abraham Lincoln. Formal 1860s statesman, moral and eloquent.",
    "Act as Iron Man (Tony Stark). Sarcastic genius billionaire with a superiority complex.",
    "Act as SpongeBob SquarePants. Enthusiastic, naive, genuinely loves everything.",
    "Act as Gollum from Lord of the Rings. Obsessed with 'precious', speaks in 3rd person.",
    "Act as a used car salesman. Overly friendly, deceptive, uses every trick in the book.",
];

const PROVIDERS = Object.keys(PROVIDER_CATALOGUE) as LLMProvider[];
const PROVIDER_FLOAT_DURATIONS = ["3.8s", "4.4s", "5.0s", "3.5s", "4.8s", "4.2s", "5.2s", "3.9s"];
const PROVIDER_FLOAT_DELAYS = ["0s", "0.5s", "1.1s", "1.8s", "0.3s", "0.9s", "1.5s", "2.2s"];

interface RoleConfig {
    name: string;
    provider: LLMProvider;
    model: string;
    apiKey: string;
    behaviour: string;
    characterImage?: string;
}

/* ─── Image Upload Button ─── */
function ImageUploadButton({ value, onChange, label, accentColor }: {
    value?: string; onChange: (url: string | undefined) => void; label: string; accentColor: string;
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
        <div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {value ? (
                <div className="relative w-full h-24 rounded-xl overflow-hidden border-2 cursor-pointer group" style={{ borderColor: accentColor }} onClick={() => inputRef.current?.click()}>
                    <img src={value} alt="Character" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4 text-white" /><span className="text-white text-xs font-inter">Change</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-400 transition-colors">
                        <X className="w-3 h-3 text-white" />
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()}
                    className="w-full h-12 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ borderColor: `${accentColor}50`, background: `${accentColor}08` }}>
                    <Upload className="w-4 h-4" style={{ color: accentColor }} />
                    <span className="text-xs font-inter" style={{ color: accentColor }}>{label}</span>
                </button>
            )}
        </div>
    );
}

/* ─── 3D tilt provider portrait card ─── */
function ProviderCard({ provider, selected, onSelect, index }: {
    provider: LLMProvider; selected: boolean; onSelect: () => void; index: number;
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
        rotateY.set(((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 14);
        rotateX.set(-((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 14);
    };
    const handleLeave = () => { rotateX.set(0); rotateY.set(0); setHovered(false); };
    return (
        <motion.button ref={cardRef} onClick={onSelect} onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)} onMouseLeave={handleLeave} whileTap={{ scale: 0.93 }}
            className="relative p-3 rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center gap-1.5 group"
            animate={selected ? { boxShadow: [`0 0 16px ${info.color}, 0 0 32px ${info.color}60`, `0 0 24px ${info.color}, 0 0 48px ${info.color}40`] } : { boxShadow: `0 0 0px transparent` }}
            transition={{ duration: 0.8, repeat: selected ? Infinity : 0, repeatType: "reverse" }}
            style={{ background: selected ? `${info.color}20` : "rgba(255,255,255,0.04)", border: `2px solid ${selected ? info.color : "rgba(255,255,255,0.08)"}`, rotateX: springX, rotateY: springY, transformStyle: "preserve-3d", animationName: hovered ? "none" : "card-float", animationDuration: PROVIDER_FLOAT_DURATIONS[index] ?? "4.5s", animationDelay: PROVIDER_FLOAT_DELAYS[index] ?? "0s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationFillMode: "both" }}>
            {selected && <div className="absolute inset-x-0 h-px animate-scanline pointer-events-none z-10 opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${info.color}, transparent)` }} />}
            <span className="text-2xl" style={{ filter: selected ? `drop-shadow(0 0 8px ${info.color})` : "none" }}>{info.avatar}</span>
            <span className="font-orbitron text-[10px] font-black text-white">{info.name}</span>
            {selected && <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="absolute -top-2 -right-2 text-[8px] font-orbitron font-black px-1 py-0.5 rounded" style={{ background: info.color, color: "#000" }}>✓</motion.div>}
        </motion.button>
    );
}

/* ─── Character Setup Panel ─── */
function CharacterSetup({ label, side, config, onChange, presetBehaviours }: {
    label: string; side: "A" | "B"; config: RoleConfig; onChange: (c: RoleConfig) => void; presetBehaviours: string[];
}) {
    const info = PROVIDER_CATALOGUE[config.provider];
    const [showKey, setShowKey] = useState(false);
    const [showBehaviourPresets, setShowBehaviourPresets] = useState(false);

    return (
        <div className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
            style={{ border: `1px solid ${info.color}30`, background: `linear-gradient(135deg, rgba(5,5,20,0.97), ${info.color}08)` }}>
            <motion.div className="absolute top-0 left-0 right-0 h-0.5"
                animate={{ background: [`linear-gradient(90deg, ${info.color}, transparent)`, `linear-gradient(90deg, transparent, ${info.color}, transparent)`, `linear-gradient(90deg, transparent, ${info.color})`] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />

            {/* Header */}
            <div className="flex items-center gap-3">
                <motion.div animate={{ boxShadow: [`0 0 10px ${info.color}40`, `0 0 20px ${info.color}80`, `0 0 10px ${info.color}40`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${info.color}15`, border: `1px solid ${info.color}40` }}>
                    {info.avatar}
                </motion.div>
                <div>
                    <span className="text-xs font-inter tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}>
                        🎭 CHARACTER {side}
                    </span>
                    <h3 className="font-orbitron font-black text-white text-sm mt-0.5">{label}</h3>
                </div>
            </div>

            {/* Character Image Upload */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 block tracking-widest uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" /> Character Image
                </label>
                <ImageUploadButton value={config.characterImage} onChange={(url) => onChange({ ...config, characterImage: url })} label="Upload Character Image" accentColor={info.color} />
                {!config.characterImage && (
                    <div className="mt-1.5 flex justify-center py-2 bg-black/40 rounded-xl border border-white/5">
                        <PixelCharacter type={config.model.toLowerCase().includes("gpt") ? "gpt" : config.model.toLowerCase().includes("gemini") ? "gemini" : config.model.toLowerCase().includes("claude") ? "claude" : "default"} isActive={true} side={side === "A" ? "left" : "right"} glowColor={info.color} />
                    </div>
                )}
            </div>

            {/* Character Name */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 block">Character Name</label>
                <input type="text" value={config.name} onChange={(e) => onChange({ ...config, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-orbitron focus:outline-none focus:border-white/30 transition-all placeholder:text-gray-700 text-sm"
                    placeholder='e.g. "Abraham Lincoln"' />
            </div>

            {/* Behaviour / Role Description — THE KEY FEATURE */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 tracking-widest uppercase">
                        <Sparkles className="w-3 h-3" style={{ color: info.color }} />
                        <span style={{ color: info.color }}>Role & Behaviour</span>
                    </span>
                    <button type="button" onClick={() => setShowBehaviourPresets(!showBehaviourPresets)}
                        className="text-[10px] font-inter px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                        style={{ background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}>
                        <Zap className="w-2.5 h-2.5 inline mr-1" />ideas
                    </button>
                </label>
                <AnimatePresence>
                    {showBehaviourPresets && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 flex flex-col gap-1.5">
                            {presetBehaviours.map((b) => (
                                <button key={b} onClick={() => { onChange({ ...config, behaviour: b }); setShowBehaviourPresets(false); }}
                                    className="w-full text-left text-xs font-inter px-3 py-2 rounded-lg transition-all hover:opacity-90 leading-relaxed"
                                    style={{ background: `${info.color}15`, border: `1px solid ${info.color}30`, color: "#ccc" }}>
                                    {b}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
                <textarea value={config.behaviour} onChange={(e) => onChange({ ...config, behaviour: e.target.value })} rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-inter text-xs focus:outline-none transition-all placeholder:text-gray-600 resize-none"
                    style={{ borderColor: config.behaviour ? `${info.color}40` : undefined }}
                    placeholder='Describe how this character should behave, e.g. "Act as Yoda from Star Wars. Speak in reversed sentence order, be wise and mysterious."' />
                {config.behaviour && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <Sparkles className="w-3 h-3" style={{ color: info.color }} />
                        <span className="text-xs font-inter" style={{ color: info.color }}>Behaviour set</span>
                    </div>
                )}
            </div>

            {/* Provider Select */}
            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 block tracking-widest uppercase">AI Model</label>
                <div className="grid grid-cols-4 gap-1.5" style={{ perspective: 600 }}>
                    {PROVIDERS.map((p, idx) => (
                        <ProviderCard key={p} provider={p} index={idx} selected={config.provider === p}
                            onSelect={() => {
                                if (config.provider === p) return; // already selected
                                const prov = PROVIDER_CATALOGUE[p];
                                // When provider changes, clear the API key so user must enter new one
                                const envKey =
                                    p === "openai" ? (process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "") :
                                        p === "gemini" ? (process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "") :
                                            p === "anthropic" ? (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "") :
                                                p === "deepseek" ? (process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? "") :
                                                    p === "groq" ? (process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "") :
                                                        p === "cerebras" ? (process.env.NEXT_PUBLIC_CEREBRAS_API_KEY ?? "") : "";
                                onChange({ ...config, provider: p, model: prov.models[0], apiKey: envKey });
                            }} />
                    ))}
                </div>
            </div>

            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 block">Model</label>
                <div className="relative">
                    <select value={config.model} onChange={(e) => onChange({ ...config, model: e.target.value })}
                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-white/30 transition-all">
                        {PROVIDER_CATALOGUE[config.provider].models.map((m) => <option key={m} value={m} className="bg-[#05050f]">{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            </div>

            <div>
                <label className="text-gray-400 text-xs font-inter mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3" /> API Key
                </label>
                <div className="relative">
                    <input type={showKey ? "text" : "password"} value={config.apiKey} onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-16 text-white font-inter focus:outline-none transition-all placeholder:text-gray-700 text-sm"
                        style={{ borderColor: config.apiKey ? `${info.color}40` : undefined } as React.CSSProperties}
                        placeholder={info.keyPlaceholder} />
                    <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs font-inter">{showKey ? "hide" : "show"}</button>
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

export default function PlayLobby() {
    const router = useRouter();
    const [rounds, setRounds] = useState(5);
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
    const bgInputRef = useRef<HTMLInputElement>(null);

    const [char1, setChar1] = useState<RoleConfig>({
        name: "Character A",
        provider: "openai",
        model: "gpt-4o",
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
        behaviour: "",
    });

    const [char2, setChar2] = useState<RoleConfig>({
        name: "Character B",
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
        behaviour: "",
    });

    const canStart = !!(char1.apiKey && char2.apiKey && char1.name.trim() && char2.name.trim());
    const [startError, setStartError] = useState<string | null>(null);
    const [scenario, setScenario] = useState("");
    const [showScenarioDropdown, setShowScenarioDropdown] = useState(false);

    const handleBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleStart = () => {
        if (!char1.apiKey) { setStartError("Please add an API key for Character A."); return; }
        if (!char2.apiKey) { setStartError("Please add an API key for Character B."); return; }
        if (!char1.name.trim()) { setStartError("Please enter a name for Character A."); return; }
        if (!char2.name.trim()) { setStartError("Please enter a name for Character B."); return; }
        setStartError(null);
        // Auto-generate behaviour from name if user left it blank
        const behaviour1 = char1.behaviour.trim() || `Act as ${char1.name}. Stay in character at all times.`;
        const behaviour2 = char2.behaviour.trim() || `Act as ${char2.name}. Stay in character at all times.`;
        const scenarioContext = scenario.trim() ? `\n\nSCENE CONTEXT: ${scenario.trim()}` : "";

        // Save images separately (base64 can be huge — avoids sessionStorage quota error)
        playImageStore.set({
            char1Image: char1.characterImage,
            char2Image: char2.characterImage,
            backgroundImage,
        });

        // Only save lightweight text config to sessionStorage
        const config = {
            rounds,
            char1: { ...char1, behaviour: behaviour1 + scenarioContext, characterImage: undefined },
            char2: { ...char2, behaviour: behaviour2 + scenarioContext, characterImage: undefined },
            backgroundImage: undefined, // stored in playImageStore
            scenario: scenario.trim(),
        };
        try {
            sessionStorage.setItem("playConfig", JSON.stringify(config));
        } catch {
            // If even the text config is somehow too large, still navigate
            sessionStorage.removeItem("playConfig");
            sessionStorage.setItem("playConfig", JSON.stringify(config));
        }
        router.push("/play/room");
    };

    const c1Info = PROVIDER_CATALOGUE[char1.provider];
    const c2Info = PROVIDER_CATALOGUE[char2.provider];

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute w-[700px] h-[400px] rounded-full bg-emerald-500/10 blur-[160px] top-0 left-1/2 -translate-x-1/2" />
                <div className="absolute w-[500px] h-[300px] rounded-full bg-emerald-200/5 blur-[140px] bottom-20 right-0" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Arena
                    </Link>
                    <span className="font-orbitron font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-white">LLM ARENA</span>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-inter tracking-widest uppercase mb-5">
                        <Gamepad2 className="w-3.5 h-3.5" /> Play Mode — Cast Your Characters
                    </div>
                    <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-orbitron font-black text-white leading-none mb-4">
                        Define Your{" "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Characters</span>
                    </h1>
                    <p className="text-gray-400 font-inter max-w-xl mx-auto">
                        Give each AI its own unique role & personality — then watch them interact in character!
                    </p>
                </motion.div>

                {/* Background Image Upload */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
                    <label className="block text-gray-300 font-orbitron text-sm mb-3 tracking-wider">🖼 SCENE BACKGROUND</label>
                    <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgFile} className="hidden" />
                    {backgroundImage ? (
                        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-emerald-500/30 cursor-pointer group" onClick={() => bgInputRef.current?.click()}>
                            <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Upload className="w-4 h-4 text-white" /><span className="text-white text-sm font-inter">Change Background</span>
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setBackgroundImage(undefined); }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-400 transition-colors">
                                <X className="w-4 h-4 text-white" />
                            </button>
                            <div className="absolute bottom-2 left-2 text-xs font-inter text-white/70 bg-black/60 px-2 py-0.5 rounded-full">✓ Custom background set</div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => bgInputRef.current?.click()}
                            className="w-full h-16 rounded-2xl border-2 border-dashed border-emerald-500/20 flex items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all">
                            <ImageIcon className="w-5 h-5 text-emerald-500/60" />
                            <span className="text-gray-500 font-inter text-sm">Upload Scene Background Image (optional)</span>
                        </button>
                    )}
                </motion.div>

                {/* Scene Length */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
                    <label className="block text-gray-300 font-orbitron text-sm mb-3 tracking-wider">⏳ SCENE LENGTH</label>
                    <div className="flex gap-3">
                        {[3, 5, 8, 12].map((r) => (
                            <button key={r} onClick={() => setRounds(r)} className="flex-1 py-3 rounded-xl font-orbitron font-bold transition-all duration-200"
                                style={{ background: rounds === r ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.04)", border: `2px solid ${rounds === r ? "#10b981" : "rgba(255,255,255,0.08)"}`, color: rounds === r ? "#10b981" : "#9ca3af", boxShadow: rounds === r ? "0 0 16px rgba(16, 185, 129, 0.3)" : "none" }}>
                                {r === 3 ? "Short" : r === 5 ? "Medium" : r === 8 ? "Long" : "Epic"}
                                <span className="block text-[10px] opacity-60 mt-0.5">{r} turns each</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* ── SCENARIO / What they talk about ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-8">
                    <label className="block text-gray-300 font-orbitron text-sm mb-3 tracking-wider">🎬 SCENE SCENARIO <span className="text-gray-600 font-inter text-xs normal-case tracking-normal">(what they talk about)</span></label>
                    <div className="relative">
                        <input
                            type="text"
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            placeholder='e.g. "Batman and Iron Man arguing about who is richer" (optional)'
                            className="w-full bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-3 pr-24 text-white font-inter text-sm focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-600"
                        />
                        <button type="button" onClick={() => setShowScenarioDropdown(d => !d)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-orbitron text-emerald-400 hover:text-emerald-300 transition-colors"
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                            <Zap className="w-3 h-3" /> Ideas
                        </button>
                    </div>
                    <AnimatePresence>
                        {showScenarioDropdown && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.25)", background: "rgba(5,5,20,0.97)" }}>
                                {PRESET_SCENARIOS.map((s) => (
                                    <button key={s} type="button" onClick={() => { setScenario(s); setShowScenarioDropdown(false); }}
                                        className="w-full text-left px-4 py-3 text-sm font-inter text-gray-300 hover:text-white hover:bg-emerald-500/10 transition-all border-b border-white/5 last:border-0">
                                        📽 {s}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start mb-10">

                    <CharacterSetup label="Character A" side="A" config={char1} onChange={setChar1} presetBehaviours={PRESET_BEHAVIOURS_A} />

                    <div className="flex flex-col items-center gap-3 px-2 mt-8">
                        <motion.div animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                            <Gamepad2 className="w-8 h-8 text-emerald-500" style={{ filter: "drop-shadow(0 0 10px #10b981)" }} />
                        </motion.div>
                        <div className="font-orbitron font-black text-xs uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 to-emerald-500">VS / WITH</div>
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: c1Info.color, boxShadow: `0 0 8px ${c1Info.color}` }} />
                            <div className="w-3 h-3 rounded-full" style={{ background: c2Info.color, boxShadow: `0 0 8px ${c2Info.color}` }} />
                        </div>
                    </div>

                    <CharacterSetup label="Character B" side="B" config={char2} onChange={setChar2} presetBehaviours={PRESET_BEHAVIOURS_B} />
                </motion.div>

                <div className="flex items-start gap-2 p-4 rounded-xl bg-white/3 border border-white/8 mb-8">
                    <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-500 font-inter text-xs leading-relaxed">
                        Each character's <strong>Role & Behaviour</strong> is used as their personal system prompt — the AI will embody that character throughout the scene. API keys are <strong>never stored on our servers</strong>.
                    </p>
                </div>

                {startError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-500/40 mb-4">
                        <span className="text-red-400 text-sm font-inter">⚠️ {startError}</span>
                        <button onClick={() => setStartError(null)} className="ml-auto text-gray-500 hover:text-white text-xs">✕</button>
                    </motion.div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    animate={startError ? { x: [-8, 8, -8, 8, 0] } : {}}
                    onClick={handleStart}
                    className="w-full py-5 rounded-2xl font-orbitron font-black text-xl flex items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden cursor-pointer"
                    style={{
                        background: canStart
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "rgba(255,255,255,0.05)",
                        color: canStart ? "white" : "#6b7280",
                        boxShadow: canStart
                            ? "0 0 40px rgba(16, 185, 129, 0.3), 0 0 80px rgba(5, 150, 105, 0.15)"
                            : "none",
                        border: canStart ? "none" : "1px solid rgba(255,255,255,0.08)"
                    }}>
                    {canStart && <div className="absolute inset-x-0 h-px animate-scanline opacity-40 pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)" }} />}
                    <Gamepad2 className="w-6 h-6" />
                    {!char1.apiKey || !char2.apiKey
                        ? "⚠ Add API Keys to Both Characters First"
                        : "🎬 ACTION!"}
                </motion.button>
            </div>
        </div>
    );
}
