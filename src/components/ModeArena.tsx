"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
    MessageSquare, Brain, Cpu, Gamepad2, Play, Settings, FileText,
    ChevronLeft, ChevronRight, Zap, Star, LogIn, Lock, Users
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

interface ModeData {
    id: string;
    phase: string;
    title: string;
    color: string;        // primary neon colour
    colorAlt: string;     // secondary accent
    borderGlow: string;   // CSS box-shadow pulse
    icon: React.ReactNode;
    href: string;
    // pixel-art card labels
    sceneLabel: string;
    // data-block items
    dataRows: { label: string; value: string }[];
    matchup: string;
}

const MODES: ModeData[] = [
    {
        id: "debate",
        phase: "Phase 1",
        title: "DEBATING ROOM",
        color: "#00d4ff",
        colorAlt: "#ff00ff",
        borderGlow: "0 0 20px #00d4ff88, 0 0 60px #00d4ff44, inset 0 0 20px #00d4ff22",
        icon: <MessageSquare className="w-7 h-7" />,
        href: "/debate",
        sceneLabel: "Grand Hall · Dual Podiums",
        dataRows: [
            { label: "Topic", value: "Should AI replace creative writing?" },
            { label: "Winner", value: "Audience Vote — 67% vs 33%" },
            { label: "Next Debate", value: "Gemini vs. Claude" },
        ],
        matchup: "GPT-4o  ⚔️  Claude 3.5",
    },
    {
        id: "classroom",
        phase: "Phase 2",
        title: "CLASSROOM MODE",
        color: "#ffaa00",
        colorAlt: "#ff6600",
        borderGlow: "0 0 20px #ffaa0088, 0 0 60px #ffaa0044, inset 0 0 20px #ffaa0022",
        icon: <Brain className="w-7 h-7" />,
        href: "/classroom",
        sceneLabel: "Futuristic Classroom · Open Book",
        dataRows: [
            { label: "Subject", value: "Quantum Computing Basics" },
            { label: "Student (User)", value: "Active doubt session" },
            { label: "LLMs", value: "GPT & Claude teaching session" },
        ],
        matchup: "GPT-4o  📖  Claude 3.5",
    },
    {
        id: "automation",
        phase: "Phase 3",
        title: "AUTOMATION MODE",
        color: "#00ff66",
        colorAlt: "#00ffcc",
        borderGlow: "0 0 20px #00ff6688, 0 0 60px #00ff6644, inset 0 0 20px #00ff6622",
        icon: <Cpu className="w-7 h-7" />,
        href: "/automation",
        sceneLabel: "Server Lab · Robotic Arms",
        dataRows: [
            { label: "Project", value: "Research Paper — Content Creator" },
            { label: "LLMs", value: "DeepSeek & Gemini (agentic work)" },
            { label: "Status", value: "78%" },
        ],
        matchup: "DeepSeek  ⚡  Gemini",
    },
    {
        id: "play",
        phase: "What-If",
        title: "PLAY MODE",
        color: "#cc44ff",
        colorAlt: "#ff2288",
        borderGlow: "0 0 20px #cc44ff88, 0 0 60px #cc44ff44, inset 0 0 20px #cc44ff22",
        icon: <Gamepad2 className="w-7 h-7" />,
        href: "/play",
        sceneLabel: "Theatrical Stage · Mask & Costumes",
        dataRows: [
            { label: "Choose Role", value: "Historical Figure — Sci-Fi Hero" },
            { label: "Scenario", value: "What if Tesla met Einstein in 2025?" },
            { label: "LLMs", value: "Claude & DeepSeek as characters" },
        ],
        matchup: "Claude  🎭  DeepSeek",
    },
    {
        id: "agents",
        phase: "Multi-Agent",
        title: "AI AGENTS MODE",
        color: "#00e5ff",
        colorAlt: "#a855f7",
        borderGlow: "0 0 20px #00e5ff88, 0 0 60px #00e5ff44, inset 0 0 20px #a855f744",
        icon: <Users className="w-7 h-7" />,
        href: "/agents",
        sceneLabel: "3D Office · Autonomous Multi-Agent Simulation",
        dataRows: [
            { label: "Team", value: "Account Manager · Designer · Developer · Marketing" },
            { label: "Brief", value: "Client gives a project → Agents collaborate" },
            { label: "Output", value: "Live Kanban board + Final deliverable" },
        ],
        matchup: "Orchestrator  🤖  Specialist Agents",
    },
];

const AUTO_ADVANCE_MS = 6000;

/* ═══════════════════════════════════════════════════════════════
   PIXEL-ART SCENE COMPONENTS (pure CSS)
   ═══════════════════════════════════════════════════════════════ */

/* ── Debate Scene ── */
function DebateScene({ active }: { active: boolean }) {
    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Background hall */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#0d0d3a] to-[#05051a]" />
            {/* Floor tiles */}
            <div className="absolute bottom-0 inset-x-0 h-[35%]"
                style={{ background: "repeating-linear-gradient(90deg, #1a1a4a 0px, #1a1a4a 20px, #12123a 20px, #12123a 40px)" }} />
            {/* Left podium */}
            <motion.div
                animate={active ? { y: 0, opacity: 1 } : { y: 20, opacity: 0.5 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute bottom-[30%] left-[15%] w-[22%] h-[28%]"
            >
                <div className="w-full h-full bg-gradient-to-t from-[#00d4ff55] to-[#00d4ff11] border border-[#00d4ff44] rounded-t-lg"
                    style={{ boxShadow: active ? "0 0 20px #00d4ff66" : "none" }} />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#00d4ff] animate-pulse" />
            </motion.div>
            {/* Right podium */}
            <motion.div
                animate={active ? { y: 0, opacity: 1 } : { y: 20, opacity: 0.5 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                className="absolute bottom-[30%] right-[15%] w-[22%] h-[28%]"
            >
                <div className="w-full h-full bg-gradient-to-t from-[#ff00ff55] to-[#ff00ff11] border border-[#ff00ff44] rounded-t-lg"
                    style={{ boxShadow: active ? "0 0 20px #ff00ff66" : "none" }} />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#ff00ff] animate-pulse" />
            </motion.div>
            {/* Argument streams */}
            {active && (
                <>
                    <motion.div
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="absolute top-[15%] left-[20%] w-[2px] h-[30%] origin-bottom"
                        style={{ background: "linear-gradient(to top, #00d4ff88, transparent)" }}
                    />
                    <motion.div
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                        transition={{ duration: 1, delay: 0.7 }}
                        className="absolute top-[15%] right-[20%] w-[2px] h-[30%] origin-bottom"
                        style={{ background: "linear-gradient(to top, #ff00ff88, transparent)" }}
                    />
                </>
            )}
            {/* Audience figures */}
            <div className="absolute bottom-[10%] left-[10%] right-[10%] flex justify-around">
                {[...Array(7)].map((_, i) => (
                    <motion.div key={i}
                        animate={active ? { y: [0, -3, 0] } : {}}
                        transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                        className="w-2.5 h-4 rounded-t-full"
                        style={{ background: i % 2 === 0 ? "#00d4ff66" : "#ff00ff66" }}
                    />
                ))}
            </div>
            {/* Voting icons above audience */}
            {active && (
                <div className="absolute bottom-[18%] left-[10%] right-[10%] flex justify-around">
                    {[...Array(5)].map((_, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: [0, 1, 0], y: [10, -5, -15] }}
                            transition={{ duration: 2, delay: 1 + i * 0.3, repeat: Infinity }}
                            className="text-[8px]"
                        >
                            {i % 2 === 0 ? "👍" : "⭐"}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Classroom Scene ── */
function ClassroomScene({ active }: { active: boolean }) {
    return (
        <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1206] via-[#1a1510] to-[#0a0806]" />
            {/* Desks */}
            {[0, 1, 2].map((row) => (
                <div key={row} className="absolute left-[10%] right-[10%] flex justify-around"
                    style={{ bottom: `${20 + row * 12}%` }}>
                    {[0, 1, 2].map((col) => (
                        <div key={col} className="w-[20%] h-3 bg-[#ffaa0022] border border-[#ffaa0015] rounded-sm" />
                    ))}
                </div>
            ))}
            {/* Central glowing book */}
            <motion.div
                className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[40%] h-[30%]"
                animate={active ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 3, repeat: Infinity }}
            >
                {/* Book body */}
                <div className="w-full h-full relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ffaa0044] to-[#ff660022] rounded-lg border border-[#ffaa0044]"
                        style={{ boxShadow: active ? "0 0 30px #ffaa0055" : "none" }} />
                    {/* Page flip animation */}
                    {active && (
                        <motion.div
                            className="absolute top-[10%] right-[10%] w-[40%] h-[80%] origin-left"
                            animate={{ rotateY: [0, -180, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            style={{ background: "linear-gradient(90deg, #ffaa0033, #ffaa0011)", borderRadius: "0 4px 4px 0" }}
                        />
                    )}
                    {/* Glowing text lines */}
                    <div className="absolute top-[20%] left-[15%] right-[15%] flex flex-col gap-1.5">
                        {[60, 80, 50, 70].map((w, i) => (
                            <motion.div key={i}
                                animate={active ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.3 }}
                                transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                                className="h-[2px] rounded-full"
                                style={{ width: `${w}%`, background: "#ffaa00" }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
            {/* Student NPCs with ? icons */}
            {active && (
                <div className="absolute bottom-[12%] left-[15%] right-[15%] flex justify-around">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <motion.span
                                animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
                                transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                                className="text-[10px] text-[#ffaa00]"
                            >?</motion.span>
                            <div className="w-2.5 h-3.5 rounded-t-full bg-[#ffaa0055]" />
                        </div>
                    ))}
                </div>
            )}
            {/* Data scroll unspooling */}
            {active && (
                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "40%" }}
                    transition={{ duration: 2, delay: 0.5 }}
                    className="absolute top-[10%] right-[5%] w-[3px] overflow-hidden"
                    style={{ background: "linear-gradient(to bottom, #ffaa0099, #ffaa0033, transparent)" }}
                />
            )}
        </div>
    );
}

/* ── Automation Scene ── */
function AutomationScene({ active }: { active: boolean }) {
    return (
        <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#061a0e] via-[#0a1a10] to-[#040f08]" />
            {/* Server racks */}
            {[0, 1, 2].map((col) => (
                <div key={col} className="absolute top-[10%] h-[50%] w-[18%]"
                    style={{ left: `${15 + col * 28}%` }}>
                    <div className="w-full h-full bg-[#00ff6612] border border-[#00ff6622] rounded-sm">
                        {/* Server lights */}
                        {[...Array(4)].map((_, i) => (
                            <motion.div key={i}
                                animate={active ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.3 }}
                                transition={{ duration: 1.5, delay: i * 0.3 + col * 0.2, repeat: Infinity }}
                                className="w-[60%] h-[3px] mx-auto mt-2 rounded-full bg-[#00ff66]"
                            />
                        ))}
                    </div>
                </div>
            ))}
            {/* Robotic arm */}
            {active && (
                <motion.div
                    className="absolute bottom-[25%] left-[50%] origin-bottom"
                    animate={{ rotate: [-15, 15, -15] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="w-[3px] h-16 bg-gradient-to-t from-[#00ff6688] to-[#00ff6633]" />
                    <div className="w-4 h-2 bg-[#00ff6666] rounded-sm -ml-[6px] -mt-px" />
                </motion.div>
            )}
            {/* Workflow chart */}
            <div className="absolute bottom-[15%] left-[10%] right-[10%] h-[15%]">
                {active && (
                    <svg className="w-full h-full" viewBox="0 0 200 30" fill="none">
                        <motion.path
                            d="M10,15 L50,15 L60,5 L90,5 L100,15 L140,15 L150,25 L190,25"
                            stroke="#00ff6666"
                            strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        {[10, 60, 100, 150, 190].map((cx, i) => (
                            <motion.circle key={i} cx={cx} cy={i % 2 === 0 ? 15 : i === 1 ? 5 : 25} r="3"
                                fill="#00ff6688"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }} />
                        ))}
                    </svg>
                )}
            </div>
            {/* n8n badge */}
            <motion.div
                animate={active ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.3 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-[5%] right-[8%] px-2 py-0.5 rounded text-[8px] font-orbitron font-bold text-[#00ff66] border border-[#00ff6644] bg-[#00ff6611]"
            >
                ⚡ n8n
            </motion.div>
        </div>
    );
}

/* ── Play Scene ── */
function PlayScene({ active }: { active: boolean }) {
    return (
        <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a0628] via-[#150520] to-[#0a0312]" />
            {/* Stage floor */}
            <div className="absolute bottom-0 inset-x-0 h-[20%]"
                style={{ background: "linear-gradient(to top, #cc44ff22, transparent)" }} />
            {/* Curtain sides */}
            <div className="absolute top-0 left-0 w-[12%] h-[70%]"
                style={{ background: "linear-gradient(to right, #cc44ff33, transparent)" }} />
            <div className="absolute top-0 right-0 w-[12%] h-[70%]"
                style={{ background: "linear-gradient(to left, #ff228833, transparent)" }} />
            {/* Curtain top */}
            <div className="absolute top-0 inset-x-0 h-[8%]"
                style={{ background: "linear-gradient(to bottom, #cc44ff44, transparent)" }} />
            {/* Rotating mask */}
            <motion.div
                className="absolute top-[20%] left-1/2 -translate-x-1/2 text-4xl"
                animate={active ? {
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 3, repeat: Infinity }}
            >
                🎭
            </motion.div>
            {/* Costume racks */}
            <div className="absolute bottom-[22%] left-[15%] right-[15%] flex justify-around">
                {["🎩", "👑", "🗡️", "🧙", "🎪"].map((item, i) => (
                    <motion.div key={i}
                        animate={active ? { y: [0, -4, 0] } : {}}
                        transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                        className="text-lg"
                    >
                        {item}
                    </motion.div>
                ))}
            </div>
            {/* Spotlight beams */}
            {active && (
                <>
                    <motion.div
                        className="absolute top-0 left-[30%] w-[2px] h-[60%]"
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ background: "linear-gradient(to bottom, #cc44ff88, transparent)" }}
                    />
                    <motion.div
                        className="absolute top-0 right-[30%] w-[2px] h-[60%]"
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        style={{ background: "linear-gradient(to bottom, #ff228888, transparent)" }}
                    />
                </>
            )}
        </div>
    );
}

/* ── Agents Scene ── */
function AgentsScene({ active }: { active: boolean }) {
    const agents = [
        { color: "#4387E2", x: 20, delay: 0 },
        { color: "#eab308", x: 38, delay: 0.3 },
        { color: "#22c55e", x: 56, delay: 0.6 },
        { color: "#EF52BA", x: 74, delay: 0.9 },
    ];
    return (
        <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#04040e] via-[#060614] to-[#020210]" />
            {/* Grid floor */}
            <div className="absolute bottom-0 inset-x-0 h-[30%]" style={{ background: "repeating-linear-gradient(90deg, #0d0d2a 0px, #0d0d2a 16px, #080820 16px, #080820 32px), repeating-linear-gradient(0deg, #0d0d2a 0px, #0d0d2a 16px, #080820 16px, #080820 32px)" }} />
            {/* Neural network lines */}
            {active && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {[[20, 60, 38, 55], [38, 55, 56, 58], [56, 58, 74, 52], [38, 55, 56, 38], [20, 60, 74, 52]].map(([x1, y1, x2, y2], i) => (
                        <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#00e5ff" strokeWidth="0.4" strokeOpacity="0.4"
                            animate={{ strokeOpacity: [0.1, 0.5, 0.1] }}
                            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }} />
                    ))}
                </svg>
            )}
            {/* Agent nodes */}
            {agents.map((a, i) => (
                <motion.div key={i}
                    className="absolute w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{ left: `${a.x}%`, top: "50%", background: `${a.color}30`, borderColor: `${a.color}80` }}
                    animate={active ? { y: [0, -8, 0], scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 2, delay: a.delay, repeat: Infinity }}
                >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
                </motion.div>
            ))}
            {/* Kanban columns at bottom */}
            <div className="absolute bottom-[5%] left-[8%] right-[8%] flex gap-1">
                {["QUEUE", "WORK", "DONE"].map((col, i) => (
                    <div key={col} className="flex-1 rounded-sm p-1" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${i === 2 ? "#22c55e40" : i === 1 ? "#00e5ff40" : "#ffffff15"}` }}>
                        <div className="text-[5px] font-orbitron mb-0.5" style={{ color: i === 2 ? "#22c55e" : i === 1 ? "#00e5ff" : "#6b7280" }}>{col}</div>
                        {active && [...Array(i === 2 ? 1 : i === 1 ? 2 : 3)].map((_, j) => (
                            <motion.div key={j} className="h-0.5 w-full rounded-full mb-0.5" style={{ background: i === 2 ? "#22c55e" : i === 1 ? "#00e5ff" : "#ffffff20" }}
                                animate={i === 1 ? { opacity: [0.3, 1, 0.3] } : {}}
                                transition={{ duration: 1.5, delay: j * 0.3, repeat: Infinity }} />
                        ))}
                    </div>
                ))}
            </div>
            {/* Moving data packets */}
            {active && agents.map((a, i) => (
                <motion.div key={`pk-${i}`}
                    className="absolute w-1 h-1 rounded-full"
                    style={{ background: a.color, top: "50%" }}
                    animate={{ left: ["20%", "74%", "20%"] }}
                    transition={{ duration: 3 + i * 0.5, delay: i * 0.8, repeat: Infinity, ease: "linear" }}
                />
            ))}
        </div>
    );
}

const SCENE_MAP: Record<string, React.FC<{ active: boolean }>> = {
    debate: DebateScene,
    classroom: ClassroomScene,
    automation: AutomationScene,
    play: PlayScene,
    agents: AgentsScene,
};

/* ═══════════════════════════════════════════════════════════════
   DATA BLOCK PANEL (slides in under active card)
   ═══════════════════════════════════════════════════════════════ */
function DataBlockPanel({ mode }: { mode: ModeData }) {
    return (
        <motion.div
            key={mode.id}
            initial={{ opacity: 0, y: 30, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: 20, scaleY: 0.8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 p-4 rounded-xl border backdrop-blur-md w-full max-w-lg mx-auto"
            style={{
                background: `linear-gradient(135deg, ${mode.color}12, rgba(5,5,15,0.95))`,
                borderColor: `${mode.color}30`,
                boxShadow: `0 0 20px ${mode.color}15`,
            }}
        >
            <div className="flex flex-col gap-2.5">
                {mode.dataRows.map((row, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <span className="text-[10px] font-orbitron font-bold tracking-wider uppercase shrink-0 mt-0.5"
                            style={{ color: mode.color }}>{row.label}:</span>
                        {row.label === "Status" ? (
                            <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full overflow-hidden"
                                    style={{ background: `${mode.color}22` }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: "0%" }}
                                        animate={{ width: row.value }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                        style={{ background: `linear-gradient(90deg, ${mode.color}88, ${mode.color})` }}
                                    />
                                </div>
                                <span className="text-xs font-orbitron font-bold" style={{ color: mode.color }}>{row.value}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-300 font-inter leading-relaxed">{row.value}</span>
                        )}
                    </div>
                ))}
            </div>
            {/* Matchup ticker */}
            <div className="mt-3 pt-2.5 border-t flex items-center justify-center"
                style={{ borderColor: `${mode.color}20` }}>
                <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xs font-orbitron font-bold tracking-wider"
                    style={{ color: mode.color }}
                >
                    {mode.matchup}
                </motion.span>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SIDE TERMINAL PANEL
   ═══════════════════════════════════════════════════════════════ */
function TerminalPanel({ side, children, color }: {
    side: "left" | "right"; children: React.ReactNode; color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: side === "left" ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="hidden xl:flex flex-col gap-3 p-4 rounded-xl border backdrop-blur-sm w-48 shrink-0"
            style={{
                background: `linear-gradient(180deg, ${color}08, rgba(5,5,15,0.9))`,
                borderColor: `${color}30`,
                animation: "terminal-pulse 3s ease-in-out infinite",
                ["--terminal-color" as string]: `${color}40`,
            }}
        >
            {children}
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND LAYERS
   ═══════════════════════════════════════════════════════════════ */
function ParallaxBackground({ activeColor }: { activeColor: string }) {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Deep grid layer */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] animate-parallax-drift" />
            {/* Volumetric glow behind active card */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-[150px]"
                animate={{ background: `${activeColor}15`, scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Secondary glow */}
            <div className="absolute w-[400px] h-[400px] rounded-full bg-neon-purple/8 blur-[120px] top-0 left-[10%]" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-neon-pink/6 blur-[100px] bottom-0 right-[10%]" />
            {/* Floating star particles */}
            {[...Array(12)].map((_, i) => (
                <motion.div key={i}
                    className="absolute"
                    style={{
                        left: `${8 + (i * 7.5) % 85}%`,
                        top: `${10 + (i * 13) % 75}%`,
                    }}
                    animate={{
                        y: [0, -15, 0],
                        opacity: [0.15, 0.45, 0.15],
                    }}
                    transition={{
                        duration: 4 + (i % 3),
                        delay: i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <Star className="w-2.5 h-2.5 text-white/20 fill-white/10" />
                </motion.div>
            ))}
            {/* Holographic schematics lines */}
            {[...Array(5)].map((_, i) => (
                <motion.div key={`line-${i}`}
                    className="absolute h-[1px]"
                    style={{
                        top: `${20 + i * 15}%`,
                        left: 0,
                        right: 0,
                        background: `linear-gradient(90deg, transparent, ${activeColor}12, transparent)`,
                    }}
                    animate={{ opacity: [0, 0.4, 0] }}
                    transition={{ duration: 6, delay: i * 1.2, repeat: Infinity }}
                />
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MODE ARENA COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function ModeArena() {
    const [activeIdx, setActiveIdx] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const active = MODES[activeIdx];

    /* Auto-advance timer */
    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % MODES.length);
        }, AUTO_ADVANCE_MS);
    }, []);

    useEffect(() => {
        resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resetTimer]);

    const selectCard = (idx: number) => {
        setActiveIdx(idx);
        resetTimer();
    };

    const prev = () => selectCard((activeIdx - 1 + MODES.length) % MODES.length);
    const next = () => selectCard((activeIdx + 1) % MODES.length);

    return (
        <section id="modes" className="relative py-16 px-4 min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
            <ParallaxBackground activeColor={active.color} />

            {/* ── HEADER ── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative z-10 text-center mb-10"
            >
                <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-orbitron font-black tracking-widest animate-neon-flicker">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue">
                        LLM ARENA
                    </span>
                    <span className="text-white/80 ml-3">:</span>
                    <span className="text-white/90 ml-3">Choose Your Phase</span>
                </h2>
                <motion.p
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-gray-500 font-inter text-sm mt-2 tracking-wider"
                >
                    ▸ Auto-cycling • Click a card to lock in ▸
                </motion.p>
            </motion.div>

            {/* ── MAIN LAYOUT: Terminal | Carousel | Terminal ── */}
            <div className="relative z-10 w-full max-w-7xl flex items-start justify-center gap-6">

                {/* Config Terminal (left) */}
                <TerminalPanel side="left" color="#0ff">
                    <div className="flex items-center gap-2 text-[10px] font-orbitron font-bold text-[#0ff] tracking-widest">
                        <Settings className="w-3.5 h-3.5" /> CONFIG
                    </div>
                    <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #0ff33, transparent)" }} />
                    <Link href="/dashboard/config"
                        className="flex items-center gap-2 text-[10px] font-inter text-gray-400 hover:text-[#0ff] transition-colors">
                        <Lock className="w-3 h-3" /> API Keys
                    </Link>
                    <Link href="/dashboard/config"
                        className="flex items-center gap-2 text-[10px] font-inter text-gray-400 hover:text-[#0ff] transition-colors">
                        <Cpu className="w-3 h-3" /> Model Select
                    </Link>
                    <div className="mt-auto">
                        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                            className="text-[8px] font-mono text-[#0ff44]">
                            SYS:ONLINE ●
                        </motion.div>
                    </div>
                </TerminalPanel>

                {/* ── CAROUSEL AREA ── */}
                <div className="flex-1 flex flex-col items-center min-w-0 max-w-4xl">

                    {/* Phase indicator dots */}
                    <div className="flex gap-3 mb-6">
                        {MODES.map((m, i) => (
                            <button key={m.id} onClick={() => selectCard(i)}
                                className="relative group"
                            >
                                <motion.div
                                    animate={i === activeIdx ? {
                                        scale: [1, 1.3, 1], boxShadow: `0 0 12px ${m.color}88`
                                    } : { scale: 1, boxShadow: "none" }}
                                    transition={{ duration: 1.5, repeat: i === activeIdx ? Infinity : 0 }}
                                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                                    style={{
                                        background: i === activeIdx ? m.color : `${m.color}40`,
                                        border: `1px solid ${m.color}60`,
                                    }}
                                />
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-orbitron whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: m.color }}
                                >{m.phase}</span>
                            </button>
                        ))}
                    </div>

                    {/* Cards row */}
                    <div className="relative w-full flex items-center justify-center gap-3 md:gap-5"
                        style={{ minHeight: 400 }}>

                        {/* Prev arrow */}
                        <button onClick={prev}
                            className="absolute left-0 z-20 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm">
                            <ChevronLeft className="w-5 h-5 text-white/60" />
                        </button>

                        {/* All 4 cards */}
                        <div className="flex items-center justify-center gap-2 md:gap-4 w-full px-10">
                            {MODES.map((mode, i) => {
                                const isActive = i === activeIdx;
                                const Scene = SCENE_MAP[mode.id];
                                return (
                                    <motion.div
                                        key={mode.id}
                                        onClick={() => selectCard(i)}
                                        layout
                                        animate={{
                                            scale: isActive ? 1 : 0.78,
                                            opacity: isActive ? 1 : 0.5,
                                            filter: isActive ? "blur(0px) brightness(1)" : "blur(2px) brightness(0.5)",
                                            zIndex: isActive ? 10 : 1,
                                        }}
                                        transition={{ duration: 0.6, ease: "easeInOut" }}
                                        className="relative rounded-2xl overflow-hidden cursor-pointer select-none shrink-0"
                                        style={{
                                            width: isActive ? "clamp(280px, 38vw, 420px)" : "clamp(100px, 14vw, 160px)",
                                            height: isActive ? "clamp(320px, 42vw, 440px)" : "clamp(180px, 24vw, 260px)",
                                            boxShadow: isActive ? mode.borderGlow : `0 0 8px ${mode.color}15`,
                                            border: `1px solid ${isActive ? `${mode.color}80` : `${mode.color}20`}`,
                                        }}
                                    >
                                        {/* Pixel-art scene */}
                                        <Scene active={isActive} />

                                        {/* Pulsing border overlay */}
                                        {isActive && (
                                            <motion.div
                                                className="absolute inset-0 rounded-2xl pointer-events-none"
                                                animate={{
                                                    boxShadow: [
                                                        `inset 0 0 15px ${mode.color}30, 0 0 25px ${mode.color}44`,
                                                        `inset 0 0 25px ${mode.color}50, 0 0 50px ${mode.color}66`,
                                                        `inset 0 0 15px ${mode.color}30, 0 0 25px ${mode.color}44`,
                                                    ],
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            />
                                        )}

                                        {/* Card overlay info */}
                                        <div className="absolute inset-0 flex flex-col justify-end p-3"
                                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}>
                                            <div className="flex items-center gap-2 mb-1" style={{ color: mode.color }}>
                                                {mode.icon}
                                                <span className="text-[9px] font-orbitron font-bold tracking-widest opacity-70">{mode.phase}</span>
                                            </div>
                                            <h3 className={`font-orbitron font-black text-white leading-tight ${isActive ? "text-lg md:text-xl" : "text-[10px] md:text-xs"}`}>
                                                {mode.title}
                                            </h3>
                                            {isActive && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 0.7 }}
                                                    className="text-[10px] font-inter text-gray-400 mt-1 leading-relaxed"
                                                >
                                                    {mode.sceneLabel}
                                                </motion.p>
                                            )}
                                        </div>

                                        {/* Scanline on active */}
                                        {isActive && (
                                            <div className="absolute inset-x-0 h-[1px] animate-scanline pointer-events-none z-20"
                                                style={{ background: `linear-gradient(90deg, transparent, ${mode.color}80, transparent)` }} />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Next arrow */}
                        <button onClick={next}
                            className="absolute right-0 z-20 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm">
                            <ChevronRight className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Mode name labels below each card position */}
                    <div className="flex items-center justify-center gap-2 md:gap-4 w-full px-10 mt-3">
                        {MODES.map((mode, i) => (
                            <motion.button
                                key={mode.id}
                                onClick={() => selectCard(i)}
                                animate={{ opacity: i === activeIdx ? 1 : 0.35, scale: i === activeIdx ? 1 : 0.85 }}
                                transition={{ duration: 0.4 }}
                                className="font-orbitron font-bold tracking-wider text-center transition-colors"
                                style={{
                                    color: mode.color,
                                    fontSize: i === activeIdx ? "clamp(10px, 1.2vw, 14px)" : "clamp(7px, 0.8vw, 9px)",
                                    width: i === activeIdx ? "clamp(280px, 38vw, 420px)" : "clamp(100px, 14vw, 160px)",
                                    textShadow: i === activeIdx ? `0 0 12px ${mode.color}66` : "none",
                                }}
                            >
                                {mode.title}
                            </motion.button>
                        ))}
                    </div>

                    {/* ── DATA BLOCK SLIDE-IN ── */}
                    <AnimatePresence mode="wait">
                        <DataBlockPanel key={active.id} mode={active} />
                    </AnimatePresence>

                    {/* ── ACTION BUTTONS ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex items-center justify-center gap-4 mt-5"
                    >
                        <Link href={active.href}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-orbitron font-bold text-xs text-white transition-all duration-300 hover:scale-105"
                            style={{
                                background: `linear-gradient(135deg, ${active.color}44, ${active.color}22)`,
                                border: `1px solid ${active.color}60`,
                                boxShadow: `0 0 15px ${active.color}30`,
                            }}
                        >
                            <Play className="w-3.5 h-3.5" fill="currentColor" /> Start Phase
                        </Link>
                        <Link href="/dashboard/config"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-orbitron font-bold text-xs text-gray-300 bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 transition-all duration-300"
                        >
                            <Settings className="w-3.5 h-3.5" /> Model Config
                        </Link>
                        <button
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-orbitron font-bold text-xs text-gray-300 bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 transition-all duration-300"
                        >
                            <FileText className="w-3.5 h-3.5" /> Project Logs
                        </button>
                    </motion.div>

                    {/* Collective work loop description */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 }}
                        className="mt-10 text-center max-w-xl mx-auto"
                    >
                        <p className="text-[10px] font-inter text-gray-600 leading-relaxed tracking-wide">
                            <span className="text-neon-purple font-bold">DEBATE</span> validates ideas →{" "}
                            <span className="text-[#ffaa00] font-bold">CLASSROOM</span> teaches the concepts →{" "}
                            <span className="text-neon-green font-bold">AUTOMATION</span> executes the tasks →{" "}
                            <span className="text-[#cc44ff] font-bold">PLAY</span> explores what-ifs →{" "}
                            <span className="text-gray-500">cycle repeats ∞</span>
                        </p>
                    </motion.div>
                </div>

                {/* Login Terminal (right) */}
                <TerminalPanel side="right" color="#f0f">
                    <div className="flex items-center gap-2 text-[10px] font-orbitron font-bold text-neon-pink tracking-widest">
                        <LogIn className="w-3.5 h-3.5" /> ACCESS
                    </div>
                    <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #f0f33, transparent)" }} />
                    <Link href="/login"
                        className="flex items-center gap-2 text-[10px] font-inter text-gray-400 hover:text-neon-pink transition-colors">
                        <LogIn className="w-3 h-3" /> Login
                    </Link>
                    <Link href="/signup"
                        className="flex items-center gap-2 text-[10px] font-inter text-gray-400 hover:text-neon-pink transition-colors">
                        <Star className="w-3 h-3" /> Sign Up
                    </Link>
                    <div className="mt-auto">
                        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                            className="text-[8px] font-mono text-neon-pink/40">
                            AUTH:READY ●
                        </motion.div>
                    </div>
                </TerminalPanel>
            </div>
        </section>
    );
}
