"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Users, Cpu } from "lucide-react";
import { useAgencyStore } from "@/lib/agent-store";
import { AGENT_SETS } from "@/lib/agent-sets";
import { PROVIDER_CATALOGUE } from "@/lib/llm-adapters";

const ENV_KEYS: Record<string, string> = {
    openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "",
    gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
    deepseek: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? "",
    groq: process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "",
    cerebras: process.env.NEXT_PUBLIC_CEREBRAS_API_KEY ?? "",
    scaleway: process.env.NEXT_PUBLIC_SCALEWAY_API_KEY ?? "",
};

export default function AgentsLobbyPage() {
    const router = useRouter();
    const { setAgentSet, setLlmConfig, selectedAgentSetId } = useAgencyStore();

    const [selectedSet, setSelectedSet] = useState(selectedAgentSetId);
    const [provider, setProvider] = useState("gemini");
    const [model, setModel] = useState("gemini-2.0-flash");
    const [apiKey, setApiKey] = useState(ENV_KEYS["gemini"]);

    const catalogue = PROVIDER_CATALOGUE as Record<string, { name: string; color: string; avatar: string; models: string[]; keyPlaceholder: string }>;

    const handleProviderChange = (p: string) => {
        setProvider(p);
        const models = catalogue[p]?.models ?? [];
        setModel(models[0] ?? "");
        setApiKey(ENV_KEYS[p] ?? "");
    };

    const handleDeploy = () => {
        setAgentSet(selectedSet);
        setLlmConfig({ provider, model, apiKey });
        router.push("/agents/room");
    };

    const agentSet = AGENT_SETS.find(s => s.id === selectedSet) ?? AGENT_SETS[0];

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 overflow-x-hidden flex flex-col items-center justify-center px-4 py-16 relative">

            {/* Background glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/8 blur-[180px] top-0 left-1/2 -translate-x-1/2" />
                <div className="absolute w-[400px] h-[300px] rounded-full bg-purple-500/6 blur-[150px] bottom-0 right-0" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl">

                {/* Back nav */}
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm font-inter transition-colors mb-10">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Arena
                </Link>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-inter tracking-widest uppercase mb-6">
                        <Cpu className="w-3 h-3 animate-pulse" />
                        Inspired by The Delegation
                    </div>
                    <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-black font-orbitron leading-none tracking-tighter text-white mb-4">
                        AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Agents</span>
                    </h1>
                    <p className="text-gray-400 font-inter text-lg max-w-xl mx-auto">
                        Assemble a team of autonomous AI agents, give them a project brief, and watch them collaborate in a living 3D workspace.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-6">

                    {/* ── Step 1: Choose Agent Set ───────────────── */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="rounded-2xl p-6 space-y-4"
                        style={{ background: "rgba(8,8,26,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>

                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <h2 className="font-orbitron text-sm font-bold text-white">Choose Your Team</h2>
                        </div>

                        {AGENT_SETS.map(set => (
                            <button key={set.id} onClick={() => setSelectedSet(set.id)}
                                className="w-full p-4 rounded-xl text-left transition-all relative overflow-hidden group"
                                style={{
                                    background: selectedSet === set.id ? `${set.color}15` : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${selectedSet === set.id ? set.color + "50" : "rgba(255,255,255,0.06)"}`,
                                    boxShadow: selectedSet === set.id ? `0 0 20px ${set.color}15` : "none",
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">{set.agents[1].emoji}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-orbitron text-sm font-bold text-white mb-0.5">{set.companyName}</p>
                                        <p className="text-xs font-inter text-gray-500 mb-2">{set.companyType}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {set.agents.filter(a => !a.isPlayer).slice(0, 4).map(a => (
                                                <span key={a.index} className="text-[9px] px-1.5 py-0.5 rounded-full font-inter"
                                                    style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30` }}>
                                                    {a.emoji} {a.role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {selectedSet === set.id && (
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ background: set.color }}>
                                            <span className="text-[10px]">✓</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </motion.div>

                    {/* ── Step 2: Choose AI Model ────────────────── */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="rounded-2xl p-6 space-y-4 flex flex-col"
                        style={{ background: "rgba(8,8,26,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>

                        <div className="flex items-center gap-2 mb-4">
                            <Cpu className="w-4 h-4 text-purple-400" />
                            <h2 className="font-orbitron text-sm font-bold text-white">Configure AI</h2>
                        </div>

                        {/* Provider */}
                        <div>
                            <label className="font-orbitron text-[10px] text-gray-500 tracking-wider mb-2 block">PROVIDER</label>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(catalogue).map(([key, p]) => (
                                    <button key={key} onClick={() => handleProviderChange(key)}
                                        className="py-2 px-1 rounded-xl text-center transition-all relative overflow-hidden"
                                        style={{
                                            background: provider === key ? `${p.color}20` : "rgba(255,255,255,0.03)",
                                            border: `1px solid ${provider === key ? p.color + "50" : "rgba(255,255,255,0.06)"}`,
                                        }}
                                    >
                                        <div className="text-lg mb-0.5">{p.avatar}</div>
                                        <span className="font-orbitron text-[8px] text-gray-400">{p.name.split(" ")[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Model */}
                        <div>
                            <label className="font-orbitron text-[10px] text-gray-500 tracking-wider mb-2 block">MODEL</label>
                            <select value={model} onChange={e => setModel(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-inter text-white focus:outline-none focus:border-cyan-400 transition-colors">
                                {(catalogue[provider]?.models ?? []).map(m => (
                                    <option key={m} value={m} style={{ background: "#0d0d1a" }}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* API Key */}
                        <div>
                            <label className="font-orbitron text-[10px] text-gray-500 tracking-wider mb-2 block">API KEY</label>
                            <input
                                type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                                placeholder={catalogue[provider]?.keyPlaceholder ?? "sk-..."}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-inter text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors"
                            />
                            {apiKey && <p className="text-emerald-400 text-[9px] mt-1 font-inter">✓ Key loaded from environment</p>}
                        </div>

                        {/* Team Preview */}
                        <div className="mt-auto pt-4 border-t border-white/5">
                            <p className="font-orbitron text-[10px] text-gray-600 mb-2">TEAM PREVIEW</p>
                            <div className="flex gap-2">
                                {agentSet.agents.filter(a => !a.isPlayer).map(a => (
                                    <div key={a.index} className="flex flex-col items-center gap-1">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                                            style={{ background: `${a.color}20`, border: `1px solid ${a.color}40` }}>
                                            {a.emoji}
                                        </div>
                                        <span className="text-[7px] font-inter text-gray-600 text-center leading-tight w-10">{a.role.split(" ")[0]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── Deploy button ───────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mt-8 flex justify-center">
                    <button
                        onClick={handleDeploy}
                        disabled={!apiKey.trim()}
                        className="group flex items-center gap-3 px-10 py-4 rounded-2xl font-orbitron font-black text-lg text-white transition-all duration-300 hover:scale-105 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #00aaff, #a855f7)", boxShadow: "0 0 40px rgba(0,170,255,0.25)" }}
                    >
                        🚀 DEPLOY TEAM
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                <p className="text-center text-gray-700 text-xs font-inter mt-4">
                    Requires WebGPU-compatible browser (Chrome 113+ / Edge 113+) for best experience
                </p>
            </div>
        </div>
    );
}
