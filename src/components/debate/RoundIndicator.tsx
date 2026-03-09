"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";

interface RoundIndicatorProps {
    currentRound: number;
    totalRounds: number;
    activeFighter: "fighter1" | "fighter2" | null;
    status: "idle" | "running" | "done";
}

export default function RoundIndicator({
    currentRound,
    totalRounds,
    activeFighter,
    status,
}: RoundIndicatorProps) {
    return (
        <div className="flex flex-col items-center gap-4 py-4">
            {/* Central VS Badge with animated swords */}
            <motion.div
                animate={
                    status === "running"
                        ? { rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }
                        : {}
                }
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="relative"
            >
                <div className="w-16 h-16 rounded-full bg-[rgba(5,5,20,0.95)] border-2 border-neon-purple/40 flex items-center justify-center"
                    style={{ boxShadow: "0 0 20px rgba(144,0,255,0.3)" }}
                >
                    <Swords className="w-7 h-7 text-neon-purple" />
                </div>
                {status === "running" && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                        className="absolute -inset-1 rounded-full border-2 border-transparent border-t-neon-purple/60"
                    />
                )}
            </motion.div>

            {/* Round label */}
            <div className="text-center">
                <div className="font-orbitron text-xs text-gray-500 tracking-widest uppercase mb-1">
                    {status === "done" ? "Debate Complete" : status === "idle" ? "Ready" : `Round ${currentRound} of ${totalRounds}`}
                </div>

                {/* Round dots */}
                <div className="flex gap-2 justify-center mt-2">
                    {Array.from({ length: totalRounds }).map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: i === currentRound - 1 && status === "running" ? [1, 1.3, 1] : 1,
                            }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                                background:
                                    i < currentRound - 1
                                        ? "#90f"
                                        : i === currentRound - 1 && status === "running"
                                            ? "#f0f"
                                            : "rgba(255,255,255,0.1)",
                                boxShadow:
                                    i === currentRound - 1 && status === "running"
                                        ? "0 0 8px #f0f"
                                        : i < currentRound - 1
                                            ? "0 0 6px #90f"
                                            : "none",
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Active fighter label */}
            {activeFighter && status === "running" && (
                <motion.div
                    key={activeFighter}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-inter text-gray-500"
                >
                    {activeFighter === "fighter1" ? "⚔ FOR is arguing..." : "🛡 AGAINST is arguing..."}
                </motion.div>
            )}
        </div>
    );
}
