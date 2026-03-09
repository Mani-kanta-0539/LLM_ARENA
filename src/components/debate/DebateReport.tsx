"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain, Zap, Trophy, Star, ChevronDown, ChevronUp,
    Loader2, Send, Target, TrendingUp, Lightbulb, CheckCircle
} from "lucide-react";
import { ChatBubbleMessage } from "./ChatBubble";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface MessageAnalysis {
    id: string;
    logicScore: number;
    technique: string;
    insight: string;
    strength: string;
    weakness: string;
}

export interface DebateAnalysis {
    perMessage: MessageAnalysis[];
    bestComebackId: string;
    bestComebackReason: string;
    winner: string;
    winnerReason: string;
    f1AvgScore: number;
    f2AvgScore: number;
    summary: string;
}

export interface GradeResult {
    score: number;
    verdict: string;
    whatWorked: string;
    improvement: string;
    modelAnswer: string;
    debateTip: string;
}

interface DebateReportProps {
    analysis: DebateAnalysis | null;
    isAnalyzing: boolean;
    messages: ChatBubbleMessage[];
    topic: string;
    fighter1Name: string;
    fighter2Name: string;
    f1Color: string;
    f2Color: string;
    f1Avatar: string;
    f2Avatar: string;
    onGrade: (argument: string, side: "FOR" | "AGAINST") => Promise<GradeResult | null>;
}

// ─── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const fill = (score / 10) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={`${fill} ${circumference}`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dasharray 1s ease" }}
                />
            </svg>
            <span className="absolute font-orbitron font-black text-white"
                style={{ fontSize: size * 0.28 }}>
                {score}
            </span>
        </div>
    );
}

// ─── Argument Score Cards ──────────────────────────────────────────────────────
function ArgumentScores({
    messages, analysis, f1Color, f2Color
}: {
    messages: ChatBubbleMessage[];
    analysis: DebateAnalysis;
    f1Color: string;
    f2Color: string;
}) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const debateMessages = messages.filter((m) => m.fighter !== "player");

    return (
        <div className="space-y-3">
            {debateMessages.map((msg) => {
                const info = analysis.perMessage.find((p) => p.id === msg.id);
                if (!info) return null;
                const color = msg.fighter === "fighter1" ? f1Color : f2Color;
                const isBestComeback = msg.id === analysis.bestComebackId;
                const isExpanded = expanded === msg.id;

                return (
                    <motion.div key={msg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl overflow-hidden cursor-pointer"
                        style={{ border: `1px solid ${isBestComeback ? "#eab308" : `${color}30`}` }}
                        onClick={() => setExpanded(isExpanded ? null : msg.id)}
                    >
                        {/* Header row */}
                        <div className="flex items-center gap-3 p-3"
                            style={{ background: isBestComeback ? "rgba(234,179,8,0.08)" : `${color}08` }}>
                            <ScoreRing score={info.logicScore} color={color} size={44} />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-orbitron text-xs font-black" style={{ color }}>
                                        {msg.fighterName}
                                    </span>
                                    <span className="text-[10px] font-inter px-2 py-0.5 rounded-full"
                                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                                        {info.technique}
                                    </span>
                                    {isBestComeback && (
                                        <span className="text-[10px] font-inter px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 flex items-center gap-1">
                                            <Zap className="w-2.5 h-2.5" /> BEST COMEBACK
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 font-inter text-xs mt-0.5 truncate">{msg.content}</p>
                            </div>

                            {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                : <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />}
                        </div>

                        {/* Expanded detail */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden border-t"
                                    style={{ borderColor: `${color}20` }}
                                >
                                    <div className="p-4 space-y-3" style={{ background: `${color}05` }}>
                                        <div>
                                            <p className="text-[10px] font-orbitron tracking-widest mb-1" style={{ color }}>💡 DEBATE INSIGHT</p>
                                            <p className="text-gray-300 font-inter text-xs leading-relaxed">{info.insight}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] font-orbitron text-green-400 tracking-widest mb-1">✅ STRENGTH</p>
                                                <p className="text-gray-400 font-inter text-xs leading-relaxed">{info.strength}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-orbitron text-red-400 tracking-widest mb-1">⚠ WEAKNESS</p>
                                                <p className="text-gray-400 font-inter text-xs leading-relaxed">{info.weakness}</p>
                                            </div>
                                        </div>
                                        {isBestComeback && (
                                            <div className="p-2 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                                                <p className="text-yellow-400 font-inter text-xs"><span className="font-bold">Why best comeback: </span>{analysis.bestComebackReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ─── Your Turn Section ─────────────────────────────────────────────────────────
function YourTurnSection({
    topic, onGrade, messages
}: {
    topic: string;
    onGrade: (argument: string, side: "FOR" | "AGAINST") => Promise<GradeResult | null>;
    messages: ChatBubbleMessage[];
}) {
    const [playerText, setPlayerText] = useState("");
    const [side, setSide] = useState<"FOR" | "AGAINST">("FOR");
    const [grading, setGrading] = useState(false);
    const [result, setResult] = useState<GradeResult | null>(null);

    const handleSubmit = async () => {
        if (!playerText.trim()) return;
        setGrading(true);
        setResult(null);
        const res = await onGrade(playerText.trim(), side);
        setResult(res);
        setGrading(false);
    };

    const scoreColor = result
        ? result.score >= 8 ? "#4ade80"
            : result.score >= 5 ? "#eab308"
                : "#f87171"
        : "#90f";

    return (
        <div className="rounded-2xl border border-neon-purple/20 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(5,5,20,0.95), rgba(144,0,255,0.05))" }}>
            <div className="p-5 border-b border-white/8">
                <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-neon-purple" />
                    <h3 className="font-orbitron font-black text-white text-sm tracking-wider">YOUR TURN</h3>
                </div>
                <p className="text-gray-500 font-inter text-xs">Write your own argument on this topic — the AI will judge it like a real debate coach.</p>
            </div>

            <div className="p-5 space-y-4">
                {/* Side selector */}
                <div>
                    <p className="text-gray-500 font-inter text-xs mb-2">Pick your side:</p>
                    <div className="flex gap-3">
                        <button onClick={() => setSide("FOR")}
                            className="flex-1 py-2 rounded-xl font-orbitron text-xs font-bold transition-all"
                            style={{
                                background: side === "FOR" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
                                border: `2px solid ${side === "FOR" ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
                                color: side === "FOR" ? "#4ade80" : "#6b7280",
                            }}>
                            ⚔ FOR
                        </button>
                        <button onClick={() => setSide("AGAINST")}
                            className="flex-1 py-2 rounded-xl font-orbitron text-xs font-bold transition-all"
                            style={{
                                background: side === "AGAINST" ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
                                border: `2px solid ${side === "AGAINST" ? "#f87171" : "rgba(255,255,255,0.1)"}`,
                                color: side === "AGAINST" ? "#f87171" : "#6b7280",
                            }}>
                            🛡 AGAINST
                        </button>
                    </div>
                </div>

                {/* Text input */}
                <div>
                    <textarea
                        value={playerText}
                        onChange={(e) => setPlayerText(e.target.value)}
                        rows={3}
                        placeholder={`Write your argument ${side === "FOR" ? "for" : "against"} "${topic}"...`}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-inter text-sm focus:outline-none focus:border-neon-purple/50 transition-all placeholder:text-gray-600 resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-600 font-inter text-xs">{playerText.length} characters</span>
                        <button
                            onClick={handleSubmit}
                            disabled={!playerText.trim() || grading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron text-xs font-bold transition-all disabled:opacity-40"
                            style={{
                                background: "linear-gradient(135deg, #90f, #60a5fa)",
                                color: "white",
                                boxShadow: playerText.trim() ? "0 0 16px rgba(144,0,255,0.3)" : "none",
                            }}
                        >
                            {grading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {grading ? "GRADING..." : "GET FEEDBACK"}
                        </button>
                    </div>
                </div>

                {/* Result card */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 pt-2"
                        >
                            {/* Score + Verdict */}
                            <div className="flex items-center gap-4 p-4 rounded-xl"
                                style={{ background: `${scoreColor}08`, border: `1px solid ${scoreColor}30` }}>
                                <ScoreRing score={result.score} color={scoreColor} size={60} />
                                <div>
                                    <p className="font-orbitron font-black text-lg" style={{ color: scoreColor }}>{result.verdict}</p>
                                    <p className="text-gray-500 font-inter text-xs">Your debate score</p>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 rounded-xl bg-green-400/5 border border-green-400/20">
                                    <p className="text-green-400 font-orbitron text-[10px] tracking-widest mb-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> WHAT WORKED
                                    </p>
                                    <p className="text-gray-300 font-inter text-xs leading-relaxed">{result.whatWorked}</p>
                                </div>

                                <div className="p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
                                    <p className="text-yellow-400 font-orbitron text-[10px] tracking-widest mb-1 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> IMPROVEMENT
                                    </p>
                                    <p className="text-gray-300 font-inter text-xs leading-relaxed">{result.improvement}</p>
                                </div>

                                <div className="p-3 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
                                    <p className="text-neon-purple font-orbitron text-[10px] tracking-widest mb-1 flex items-center gap-1">
                                        <Star className="w-3 h-3" /> HOW AN EXPERT WOULD SAY IT
                                    </p>
                                    <p className="text-gray-200 font-inter text-xs leading-relaxed italic">"{result.modelAnswer}"</p>
                                </div>

                                <div className="p-3 rounded-xl bg-blue-400/5 border border-blue-400/20">
                                    <p className="text-blue-400 font-orbitron text-[10px] tracking-widest mb-1 flex items-center gap-1">
                                        <Lightbulb className="w-3 h-3" /> DEBATE TIP
                                    </p>
                                    <p className="text-gray-300 font-inter text-xs leading-relaxed">{result.debateTip}</p>
                                </div>
                            </div>

                            {/* Try again */}
                            <button
                                onClick={() => { setResult(null); setPlayerText(""); }}
                                className="w-full py-2.5 rounded-xl font-orbitron text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                            >
                                TRY ANOTHER ARGUMENT
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Main DebateReport ─────────────────────────────────────────────────────────
export default function DebateReport({
    analysis, isAnalyzing, messages, topic,
    fighter1Name, fighter2Name, f1Color, f2Color, f1Avatar, f2Avatar, onGrade
}: DebateReportProps) {
    const [activeTab, setActiveTab] = useState<"overview" | "scores" | "yourturn">("overview");

    const tabs = [
        { id: "overview" as const, label: "Overview", icon: Trophy },
        { id: "scores" as const, label: "Argument Scores", icon: Brain },
        { id: "yourturn" as const, label: "Your Turn", icon: Target },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-2xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-md"
        >
            {/* Tab bar */}
            <div className="flex border-b border-white/8">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-4 font-orbitron text-xs transition-all"
                            style={{
                                color: active ? "#fff" : "#6b7280",
                                borderBottom: active ? "2px solid #90f" : "2px solid transparent",
                                background: active ? "rgba(144,0,255,0.08)" : "transparent",
                            }}>
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Loading state */}
                {isAnalyzing && (
                    <div className="flex flex-col items-center gap-4 py-12">
                        <div className="relative">
                            <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
                            <Brain className="w-5 h-5 text-neon-purple absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="font-orbitron text-neon-purple text-sm animate-pulse tracking-widest">ANALYZING DEBATE...</p>
                        <p className="text-gray-600 font-inter text-xs text-center max-w-xs">
                            The AI is judging every argument: logic, rhetoric, counter-attacks...
                        </p>
                    </div>
                )}

                {/* Overview tab */}
                {!isAnalyzing && analysis && activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Winner */}
                        <div className="text-center p-5 rounded-2xl"
                            style={{
                                background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03))",
                                border: "1px solid rgba(234,179,8,0.25)"
                            }}>
                            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                            <p className="text-gray-500 font-inter text-xs mb-1">DEBATE WINNER (AI JUDGE)</p>
                            <p className="font-orbitron font-black text-yellow-400 text-2xl mb-2">{analysis.winner}</p>
                            <p className="text-gray-400 font-inter text-sm leading-relaxed max-w-md mx-auto">{analysis.winnerReason}</p>
                        </div>

                        {/* Score comparison */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { name: fighter1Name, score: analysis.f1AvgScore, color: f1Color, avatar: f1Avatar, side: "FOR" },
                                { name: fighter2Name, score: analysis.f2AvgScore, color: f2Color, avatar: f2Avatar, side: "AGAINST" },
                            ].map((f) => (
                                <div key={f.name} className="p-4 rounded-xl text-center"
                                    style={{ background: `${f.color}08`, border: `1px solid ${f.color}25` }}>
                                    <div className="text-2xl mb-2">{f.avatar}</div>
                                    <p className="font-orbitron text-xs font-black mb-1 truncate" style={{ color: f.color }}>{f.name}</p>
                                    <p className="text-[10px] text-gray-600 font-inter mb-3">{f.side === "FOR" ? "⚔ FOR" : "🛡 AGAINST"}</p>
                                    <ScoreRing score={analysis.f1AvgScore === f.score && f.side === "FOR" ? analysis.f1AvgScore : analysis.f2AvgScore} color={f.color} size={56} />
                                    <p className="text-gray-500 font-inter text-[10px] mt-2">avg logic score</p>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                            <p className="text-[10px] font-orbitron text-gray-500 tracking-widest mb-2">📋 DEBATE SUMMARY</p>
                            <p className="text-gray-300 font-inter text-sm leading-relaxed">{analysis.summary}</p>
                        </div>

                        {/* Best Comeback hero */}
                        {analysis.bestComebackId && (() => {
                            const bestMsg = messages.find((m) => m.id === analysis.bestComebackId);
                            if (!bestMsg) return null;
                            const color = bestMsg.fighter === "fighter1" ? f1Color : f2Color;
                            return (
                                <div className="p-4 rounded-xl"
                                    style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.25)" }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        <p className="font-orbitron text-xs text-yellow-400 tracking-widest font-black">BEST COMEBACK</p>
                                    </div>
                                    <p className="text-gray-400 font-inter text-xs mb-2 leading-relaxed"
                                        style={{ borderLeft: `2px solid ${color}`, paddingLeft: "12px" }}>
                                        "{bestMsg.content.slice(0, 200)}{bestMsg.content.length > 200 ? "..." : ""}"
                                    </p>
                                    <p className="text-gray-500 font-inter text-xs">
                                        <span className="font-bold" style={{ color }}>{bestMsg.fighterName}</span> — {analysis.bestComebackReason}
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Scores tab */}
                {!isAnalyzing && analysis && activeTab === "scores" && (
                    <ArgumentScores
                        messages={messages}
                        analysis={analysis}
                        f1Color={f1Color}
                        f2Color={f2Color}
                    />
                )}

                {/* Your Turn tab */}
                {activeTab === "yourturn" && (
                    <YourTurnSection topic={topic} onGrade={onGrade} messages={messages} />
                )}

                {/* No analysis yet */}
                {!isAnalyzing && !analysis && (activeTab === "overview" || activeTab === "scores") && (
                    <div className="text-center py-12">
                        <Brain className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-600 font-inter text-sm">Analysis not available.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
