"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Cpu, Zap, Eye, GitBranch } from "lucide-react";

// ─── Agent Definitions (inspired by The Delegation's embodied agents) ─────────
const AGENTS = [
    {
        id: "researcher",
        name: "Researcher",
        role: "Data Analyst",
        emoji: "🔍",
        color: "#00ccff",
        glow: "rgba(0,204,255,0.4)",
        status: "working",
        thought: "Scanning 847 papers for relevant citations...",
        x: 20, y: 25,
    },
    {
        id: "writer",
        name: "Writer",
        role: "Content Agent",
        emoji: "✍️",
        color: "#f0f",
        glow: "rgba(255,0,255,0.4)",
        status: "thinking",
        thought: "Drafting executive summary with key insights...",
        x: 65, y: 20,
    },
    {
        id: "coder",
        name: "Coder",
        role: "Dev Agent",
        emoji: "💻",
        color: "#10b981",
        glow: "rgba(16,185,129,0.4)",
        status: "running",
        thought: "Generating code samples and benchmarks...",
        x: 20, y: 68,
    },
    {
        id: "reviewer",
        name: "Reviewer",
        role: "QA Agent",
        emoji: "🧪",
        color: "#f59e0b",
        glow: "rgba(245,158,11,0.4)",
        status: "idle",
        thought: "Waiting for Writer to complete draft...",
        x: 65, y: 65,
    },
];

// ─── Kanban Tasks ─────────────────────────────────────────────────────────────
const KANBAN_COLS = [
    {
        id: "todo", label: "📋 Queue", color: "#6b7280",
        tasks: ["Define scope", "Gather sources"],
    },
    {
        id: "progress", label: "⚡ Running", color: "#00ccff",
        tasks: ["Literature review", "Code generation"],
    },
    {
        id: "done", label: "✅ Done", color: "#10b981",
        tasks: ["Topic analysis", "Data collection", "Outline draft"],
    },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
    working: { label: "WORKING", color: "#00ccff", pulse: true },
    thinking: { label: "THINKING", color: "#f0f", pulse: true },
    running: { label: "RUNNING", color: "#10b981", pulse: true },
    idle: { label: "IDLE", color: "#6b7280", pulse: false },
};

// ─── Neural Connection Lines (SVG) ────────────────────────────────────────────
function NeuralConnections() {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
            <defs>
                <linearGradient id="conn1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ccff" stopOpacity="0" />
                    <stop offset="50%" stopColor="#00ccff" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#f0f" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="conn2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00ccff" stopOpacity="0" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="conn3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f0f" stopOpacity="0" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="conn4" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Researcher → Writer */}
            <motion.line x1="27%" y1="32%" x2="68%" y2="27%"
                stroke="url(#conn1)" strokeWidth="1.5" strokeDasharray="4 6"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear" }} />
            {/* Researcher → Coder */}
            <motion.line x1="27%" y1="38%" x2="27%" y2="62%"
                stroke="url(#conn2)" strokeWidth="1.5" strokeDasharray="4 6"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, repeat: Infinity, repeatType: "loop", ease: "linear", delay: 0.5 }} />
            {/* Writer → Reviewer */}
            <motion.line x1="68%" y1="32%" x2="68%" y2="60%"
                stroke="url(#conn3)" strokeWidth="1.5" strokeDasharray="4 6"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "loop", ease: "linear", delay: 1 }} />
            {/* Coder → Reviewer */}
            <motion.line x1="32%" y1="75%" x2="62%" y2="72%"
                stroke="url(#conn4)" strokeWidth="1.5" strokeDasharray="4 6"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "loop", ease: "linear", delay: 1.5 }} />

            {/* Animated data packets traveling along paths */}
            {[
                { cx: "27%", cy: "32%", targetX: "68%", targetY: "27%", color: "#00ccff", dur: 2 },
                { cx: "27%", cy: "38%", targetX: "27%", targetY: "62%", color: "#10b981", dur: 2.5 },
                { cx: "68%", cy: "32%", targetX: "68%", targetY: "60%", color: "#f0f", dur: 3 },
            ].map((p, i) => (
                <motion.circle key={i} r="3" fill={p.color}
                    filter={`drop-shadow(0 0 4px ${p.color})`}
                    animate={{
                        cx: [p.cx, p.targetX],
                        cy: [p.cy, p.targetY],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{ duration: p.dur, repeat: Infinity, repeatDelay: 0.5, ease: "linear", delay: i * 0.8 }}
                />
            ))}
        </svg>
    );
}

// ─── Single Agent Node ─────────────────────────────────────────────────────────
function AgentNode({ agent, isActive, onClick }: {
    agent: typeof AGENTS[0]; isActive: boolean; onClick: () => void;
}) {
    const status = STATUS_CONFIG[agent.status];
    return (
        <motion.div
            className="absolute cursor-pointer"
            style={{ left: `${agent.x}%`, top: `${agent.y}%`, transform: "translate(-50%, -50%)" }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
        >
            {/* Outer glow ring */}
            <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ background: agent.glow }}
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Card */}
            <motion.div
                className="relative rounded-2xl p-3 backdrop-blur-md border"
                style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
                    borderColor: isActive ? agent.color : `${agent.color}50`,
                    boxShadow: isActive ? `0 0 24px ${agent.glow}, 0 0 8px ${agent.glow}` : `0 0 12px ${agent.glow}50`,
                    minWidth: 110,
                }}
            >
                {/* Emoji avatar */}
                <div className="flex items-center gap-2 mb-1.5">
                    <motion.span className="text-2xl"
                        animate={{ rotate: agent.status === "thinking" ? [0, -5, 5, 0] : 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}>
                        {agent.emoji}
                    </motion.span>
                    <div>
                        <p className="font-orbitron text-[10px] font-black text-white">{agent.name}</p>
                        <p className="font-inter text-[9px] text-gray-500">{agent.role}</p>
                    </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-1.5">
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: status.color }}
                        animate={status.pulse ? { opacity: [1, 0.3, 1], scale: [1, 1.4, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="font-orbitron text-[8px] tracking-wider" style={{ color: status.color }}>
                        {status.label}
                    </span>
                </div>
            </motion.div>

            {/* Speech bubble on hover */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.9 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-40 w-48 p-2.5 rounded-xl text-[10px] font-inter text-gray-300 leading-relaxed"
                        style={{
                            background: "rgba(8,8,26,0.95)",
                            border: `1px solid ${agent.color}50`,
                            boxShadow: `0 0 16px ${agent.glow}`,
                            backdropFilter: "blur(12px)",
                        }}
                    >
                        <span style={{ color: agent.color }}>💭 </span>{agent.thought}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
function KanbanBoard() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(v => v + 1), 3000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="grid grid-cols-3 gap-2 h-full">
            {KANBAN_COLS.map((col, ci) => (
                <div key={col.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                        <span className="font-orbitron text-[9px] tracking-wider" style={{ color: col.color }}>{col.label}</span>
                    </div>
                    {col.tasks.map((task, ti) => (
                        <motion.div
                            key={task}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ci * 0.1 + ti * 0.08 }}
                            className="px-2 py-1.5 rounded-lg text-[9px] font-inter text-gray-300 relative overflow-hidden"
                            style={{
                                background: `${col.color}12`,
                                border: `1px solid ${col.color}30`,
                            }}
                        >
                            {task}
                            {col.id === "progress" && (
                                <motion.div
                                    className="absolute bottom-0 left-0 h-0.5"
                                    style={{ background: col.color }}
                                    animate={{ width: ["0%", "100%"] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: ti * 1.5 }}
                                />
                            )}
                        </motion.div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── 3D Mouse-Reactive Card ───────────────────────────────────────────────────
function ThreeDCard({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 30 });

    const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    }, [x, y]);

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function AIAgentsSection() {
    const [activeAgent, setActiveAgent] = useState<string | null>(null);
    const [phase, setPhase] = useState(0); // cycle through: 0=briefing, 1=working, 2=review, 3=done

    useEffect(() => {
        const t = setInterval(() => setPhase(p => (p + 1) % 4), 4000);
        return () => clearInterval(t);
    }, []);

    const phaseLabels = ["📋 BRIEFING", "⚡ EXECUTING", "🔄 REVIEWING", "✅ DELIVERED"];
    const phaseColors = ["#6b7280", "#00ccff", "#f59e0b", "#10b981"];

    return (
        <section className="py-24 px-4 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute w-[800px] h-[500px] rounded-full bg-purple-500/6 blur-[200px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute w-[400px] h-[300px] rounded-full bg-cyan-500/8 blur-[150px] top-0 left-0" />
                <div className="absolute w-[300px] h-[300px] rounded-full bg-pink-500/6 blur-[120px] bottom-0 right-0" />
            </div>

            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-inter tracking-widest uppercase mb-6">
                        <Cpu className="w-3 h-3 animate-pulse" />
                        Inspired by The Delegation
                    </div>
                    <h2 className="text-[clamp(2rem,5vw,4rem)] font-orbitron font-black text-white leading-tight mb-5">
                        AI Agents{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                            in Action
                        </span>
                    </h2>
                    <p className="text-gray-400 font-inter text-lg max-w-2xl mx-auto leading-relaxed">
                        Autonomous multi-agent workflows — watch AI characters collaborate, delegate tasks,
                        and deliver results in a living simulation.
                    </p>
                </motion.div>

                {/* ─── Main 3D Card Platform ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <ThreeDCard>
                        <div
                            className="relative rounded-3xl overflow-hidden border border-white/10"
                            style={{
                                background: "linear-gradient(135deg, rgba(8,8,26,0.98), rgba(12,12,32,0.95))",
                                boxShadow: "0 0 80px rgba(0,204,255,0.08), 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
                            }}
                        >
                            {/* Top header bar */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        {["#ef4444", "#f59e0b", "#10b981"].map(c => (
                                            <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                                        ))}
                                    </div>
                                    <span className="font-orbitron text-xs text-gray-500 tracking-widest">AI AGENT WORKSPACE</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Phase indicator */}
                                    <div className="flex items-center gap-2">
                                        <motion.div className="w-2 h-2 rounded-full"
                                            style={{ background: phaseColors[phase] }}
                                            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }} />
                                        <motion.span
                                            key={phase}
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="font-orbitron text-[10px] tracking-widest"
                                            style={{ color: phaseColors[phase] }}>
                                            {phaseLabels[phase]}
                                        </motion.span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                                        <Eye className="w-3 h-3 text-gray-500" />
                                        <span className="font-inter text-[10px] text-gray-500">4 agents</span>
                                    </div>
                                </div>
                            </div>

                            {/* Main workspace — left: agent map, right: panels */}
                            <div className="grid lg:grid-cols-[1fr_320px] gap-0">

                                {/* ─── Agent Map ─── */}
                                <div className="relative" style={{ height: 380 }}>
                                    {/* Grid pattern overlay */}
                                    <div className="absolute inset-0 opacity-[0.04]"
                                        style={{
                                            backgroundImage: "linear-gradient(rgba(0,204,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,255,0.5) 1px, transparent 1px)",
                                            backgroundSize: "40px 40px",
                                        }} />

                                    {/* Ambient glow spots */}
                                    <div className="absolute w-32 h-32 rounded-full bg-cyan-500/8 blur-3xl" style={{ left: "20%", top: "20%" }} />
                                    <div className="absolute w-28 h-28 rounded-full bg-pink-500/8 blur-3xl" style={{ left: "60%", top: "15%" }} />
                                    <div className="absolute w-24 h-24 rounded-full bg-emerald-500/8 blur-3xl" style={{ left: "18%", top: "62%" }} />
                                    <div className="absolute w-24 h-24 rounded-full bg-amber-500/8 blur-3xl" style={{ left: "62%", top: "60%" }} />

                                    {/* SVG Neural connections */}
                                    <NeuralConnections />

                                    {/* Agent nodes */}
                                    {AGENTS.map(agent => (
                                        <AgentNode
                                            key={agent.id}
                                            agent={agent}
                                            isActive={activeAgent === agent.id}
                                            onClick={() => setActiveAgent(a => a === agent.id ? null : agent.id)}
                                        />
                                    ))}

                                    {/* Center label */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <motion.div
                                            animate={{ opacity: [0.15, 0.35, 0.15] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="font-orbitron text-xs tracking-[0.4em] text-white/20 uppercase">
                                            Multi-Agent Network
                                        </motion.div>
                                    </div>

                                    {/* Hint */}
                                    <div className="absolute bottom-3 left-3 font-inter text-[9px] text-gray-600 flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> Click any agent to inspect
                                    </div>
                                </div>

                                {/* ─── Right Panels ─── */}
                                <div className="border-l border-white/5 flex flex-col">

                                    {/* Kanban board */}
                                    <div className="p-4 border-b border-white/5 flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                                            <span className="font-orbitron text-[10px] text-gray-400 tracking-widest">TASK BOARD</span>
                                        </div>
                                        <KanbanBoard />
                                    </div>

                                    {/* Live thought feed */}
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                            <span className="font-orbitron text-[10px] text-gray-400 tracking-widest">AGENT THOUGHTS</span>
                                        </div>
                                        <div className="space-y-2 overflow-hidden" style={{ maxHeight: 120 }}>
                                            {AGENTS.filter(a => a.status !== "idle").map((agent, i) => (
                                                <motion.div
                                                    key={agent.id}
                                                    initial={{ opacity: 0, x: 12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.15 }}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span className="text-sm flex-shrink-0 mt-0.5">{agent.emoji}</span>
                                                    <div>
                                                        <span className="font-orbitron text-[8px]" style={{ color: agent.color }}>{agent.name}</span>
                                                        <p className="font-inter text-[9px] text-gray-500 leading-tight mt-0.5">{agent.thought}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom status bar */}
                            <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {AGENTS.map(a => (
                                        <div key={a.id} className="flex items-center gap-1.5">
                                            <motion.div className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: STATUS_CONFIG[a.status].color }}
                                                animate={STATUS_CONFIG[a.status].pulse ? { opacity: [1, 0.3, 1] } : {}}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: AGENTS.indexOf(a) * 0.3 }} />
                                            <span className="font-inter text-[9px] text-gray-600">{a.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="font-orbitron text-[9px] text-gray-600 tracking-widest">
                                    POWERED BY LLM ARENA
                                </div>
                            </div>
                        </div>
                    </ThreeDCard>
                </motion.div>

                {/* ─── Feature Cards Row ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    className="grid md:grid-cols-3 gap-6 mt-12"
                >
                    {[
                        {
                            icon: "🤖", title: "Autonomous Agents", color: "#00ccff",
                            desc: "LLM-powered characters that propose tasks, request approvals, and collaborate without human prompting.",
                        },
                        {
                            icon: "🧠", title: "Embodied Intelligence", color: "#f0f",
                            desc: "Agents navigate shared workspace, claim workstations, and express state through animations.",
                        },
                        {
                            icon: "📊", title: "Real-time Kanban", color: "#10b981",
                            desc: "Live task tracking with complete transparency into the agency's progress and tool calls.",
                        },
                    ].map((feat, i) => (
                        <motion.div
                            key={feat.title}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="relative p-6 rounded-2xl border overflow-hidden group"
                            style={{
                                background: `linear-gradient(135deg, ${feat.color}08, transparent)`,
                                borderColor: `${feat.color}25`,
                            }}
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{ background: `radial-gradient(circle at 30% 30%, ${feat.color}10, transparent 60%)` }} />
                            <div className="text-3xl mb-3">{feat.icon}</div>
                            <h3 className="font-orbitron font-bold text-white text-sm mb-2">{feat.title}</h3>
                            <p className="font-inter text-gray-500 text-xs leading-relaxed">{feat.desc}</p>
                            <div className="mt-4 w-8 h-0.5 rounded-full" style={{ background: feat.color }} />
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-4 mt-10"
                >
                    <Link href="/classroom"
                        className="group flex items-center gap-2 px-6 py-3 rounded-xl font-orbitron font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300">
                        Enter Classroom Mode
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="/automation"
                        className="group flex items-center gap-2 px-6 py-3 rounded-xl font-orbitron font-bold text-sm text-cyan-400 border border-cyan-400/40 bg-cyan-400/5 hover:bg-cyan-400/10 hover:border-cyan-400 transition-all duration-300">
                        Automation Tools
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
