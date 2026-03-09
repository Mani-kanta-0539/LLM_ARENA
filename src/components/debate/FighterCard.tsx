"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";

interface FighterCardProps {
    side: "fighter1" | "fighter2";
    name: string;
    provider: LLMProvider;
    model: string;
    isActive: boolean;
    streamText: string;
    score: number;
    isTyping: boolean;
    roundsWon: number;
}

export default function FighterCard({
    side,
    name,
    provider,
    model,
    isActive,
    streamText,
    score,
    isTyping,
    roundsWon,
}: FighterCardProps) {
    const info = PROVIDER_CATALOGUE[provider];
    const isLeft = side === "fighter1";

    return (
        <motion.div
            animate={{
                boxShadow: isActive
                    ? `0 0 30px ${info.color}60, 0 0 60px ${info.color}20`
                    : "0 0 10px rgba(255,255,255,0.05)",
            }}
            transition={{ duration: 0.4 }}
            className="relative flex flex-col rounded-2xl border overflow-hidden"
            style={{
                borderColor: isActive ? info.color : "rgba(255,255,255,0.08)",
                background: `linear-gradient(135deg, rgba(5,5,20,0.95) 0%, ${info.color}08 100%)`,
            }}
        >
            {/* Active indicator bar */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        className="absolute top-0 left-0 right-0 h-1 origin-left"
                        style={{ background: `linear-gradient(90deg, ${info.color}, transparent)` }}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center gap-4 p-5 border-b border-white/5">
                {/* Avatar */}
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 relative"
                    style={{
                        background: `${info.color}15`,
                        border: `1px solid ${info.color}40`,
                        boxShadow: isActive ? `0 0 16px ${info.color}60` : "none",
                    }}
                >
                    {info.avatar}
                    {isActive && (
                        <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                            style={{ background: info.color }}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-xs font-inter px-2 py-0.5 rounded-full"
                            style={{ background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}
                        >
                            {isLeft ? "⚔ FOR" : "🛡 AGAINST"}
                        </span>
                    </div>
                    <h3 className="font-orbitron font-black text-white text-base truncate">{name}</h3>
                    <p className="text-gray-500 font-inter text-xs mt-0.5">{model}</p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                    <div
                        className="text-2xl font-orbitron font-black"
                        style={{ color: info.color, textShadow: `0 0 10px ${info.color}` }}
                    >
                        {score}
                    </div>
                    <div className="text-gray-600 text-xs font-inter">pts</div>
                </div>
            </div>

            {/* Speech bubble */}
            <div className="flex-1 p-5 min-h-[160px]">
                {streamText ? (
                    <div className="font-inter text-sm text-gray-200 leading-relaxed">
                        {streamText}
                        {isTyping && (
                            <span
                                className="inline-block w-0.5 h-4 ml-1 align-middle animate-typing-cursor"
                                style={{ background: info.color }}
                            />
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-gray-600 font-inter text-sm italic">
                            {isActive ? "Thinking..." : "Waiting for turn..."}
                        </p>
                    </div>
                )}
            </div>

            {/* Rounds won indicator */}
            {roundsWon > 0 && (
                <div
                    className="px-5 pb-4 flex items-center gap-1"
                >
                    {Array.from({ length: roundsWon }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full"
                            style={{ background: info.color, boxShadow: `0 0 6px ${info.color}` }}
                        />
                    ))}
                    <span className="text-gray-500 text-xs font-inter ml-1">rounds won</span>
                </div>
            )}
        </motion.div>
    );
}
