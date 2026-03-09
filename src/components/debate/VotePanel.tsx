"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ThumbsUp } from "lucide-react";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";

interface VotePanelProps {
    fighter1Name: string;
    fighter1Provider: LLMProvider;
    fighter2Name: string;
    fighter2Provider: LLMProvider;
    votes1: number;
    votes2: number;
    hasVoted: boolean;
    winner: "fighter1" | "fighter2" | null;
    onVote: (fighter: "fighter1" | "fighter2") => void;
}

export default function VotePanel({
    fighter1Name,
    fighter1Provider,
    fighter2Name,
    fighter2Provider,
    votes1,
    votes2,
    hasVoted,
    winner,
    onVote,
}: VotePanelProps) {
    const info1 = PROVIDER_CATALOGUE[fighter1Provider];
    const info2 = PROVIDER_CATALOGUE[fighter2Provider];
    const total = votes1 + votes2 || 1;
    const pct1 = Math.round((votes1 / total) * 100);
    const pct2 = 100 - pct1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-[rgba(5,5,20,0.95)] overflow-hidden"
        >
            {/* Winner Banner */}
            <AnimatePresence>
                {winner && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="p-4 text-center"
                        style={{
                            background: `linear-gradient(135deg, ${winner === "fighter1" ? info1.color : info2.color}20, transparent)`,
                            borderBottom: `1px solid ${winner === "fighter1" ? info1.color : info2.color}30`,
                        }}
                    >
                        <div className="flex items-center justify-center gap-3">
                            <Trophy
                                className="w-6 h-6"
                                style={{ color: winner === "fighter1" ? info1.color : info2.color }}
                            />
                            <span className="font-orbitron font-black text-white text-lg">
                                {winner === "fighter1" ? fighter1Name : fighter2Name} WINS!
                            </span>
                            <Trophy
                                className="w-6 h-6"
                                style={{ color: winner === "fighter1" ? info1.color : info2.color }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-6">
                <h3 className="text-center font-orbitron text-gray-300 text-sm tracking-widest uppercase mb-6">
                    {hasVoted ? "Audience Verdict" : "Cast Your Vote"}
                </h3>

                {/* Vote Buttons */}
                {!hasVoted && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onVote("fighter1")}
                            className="flex items-center justify-center gap-3 py-4 rounded-xl font-orbitron font-bold text-white transition-all duration-300"
                            style={{
                                background: `${info1.color}20`,
                                border: `2px solid ${info1.color}`,
                                boxShadow: `0 0 20px ${info1.color}30`,
                            }}
                        >
                            <ThumbsUp className="w-5 h-5" style={{ color: info1.color }} />
                            <span style={{ color: info1.color }}>{fighter1Name}</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onVote("fighter2")}
                            className="flex items-center justify-center gap-3 py-4 rounded-xl font-orbitron font-bold transition-all duration-300"
                            style={{
                                background: `${info2.color}20`,
                                border: `2px solid ${info2.color}`,
                                boxShadow: `0 0 20px ${info2.color}30`,
                                color: info2.color,
                            }}
                        >
                            <ThumbsUp className="w-5 h-5" />
                            {fighter2Name}
                        </motion.button>
                    </div>
                )}

                {/* Vote Bar */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-inter text-gray-400 w-20 truncate">{fighter1Name}</span>
                        <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct1}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ background: info1.color, boxShadow: `0 0 8px ${info1.color}` }}
                            />
                        </div>
                        <span className="text-sm font-orbitron font-bold w-10 text-right" style={{ color: info1.color }}>
                            {pct1}%
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-inter text-gray-400 w-20 truncate">{fighter2Name}</span>
                        <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct2}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ background: info2.color, boxShadow: `0 0 8px ${info2.color}` }}
                            />
                        </div>
                        <span className="text-sm font-orbitron font-bold w-10 text-right" style={{ color: info2.color }}>
                            {pct2}%
                        </span>
                    </div>
                </div>

                {hasVoted && (
                    <p className="text-center text-gray-600 font-inter text-xs mt-4">
                        {votes1 + votes2} vote{votes1 + votes2 !== 1 ? "s" : ""} cast
                    </p>
                )}
            </div>
        </motion.div>
    );
}
