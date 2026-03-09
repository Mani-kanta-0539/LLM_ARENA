"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { MessageAnalysis } from "./DebateReport";

export interface ChatBubbleMessage {
    id: string;
    fighter: "fighter1" | "fighter2" | "player";
    fighterName: string;
    side: "FOR" | "AGAINST" | "PLAYER";
    content: string;
    isStreaming?: boolean;
    avatar: string;
    color: string;
    turn: number;
}

interface ChatBubbleProps {
    message: ChatBubbleMessage;
    insight?: MessageAnalysis | null;
}

const WHY_TIPS: Record<string, string[]> = {
    FOR: [
        "Opening with a strong claim captures attention early.",
        "Using concrete examples makes abstract points land harder.",
        "Framing around benefits pushes the emotional high ground.",
        "Anticipating counter-arguments shows depth of thinking.",
        "Referencing real-world evidence adds credibility instantly.",
    ],
    AGAINST: [
        "Directly rebutting the opponent leaves no room to dodge.",
        "Finding flaws in logic is more persuasive than adding new claims.",
        "Flipping the opponent's own argument is a classic debate move.",
        "Questioning assumptions forces the opponent to defend their base.",
        "Short, sharp rebuttals are easier for the audience to follow.",
    ],
    PLAYER: ["You challenged the AIs — they must now respond to your point!"],
};

function getWhyTip(side: string, index: number): string {
    const tips = WHY_TIPS[side] ?? WHY_TIPS["FOR"];
    return tips[index % tips.length];
}

export default function ChatBubble({ message, insight }: ChatBubbleProps) {
    const [showWhy, setShowWhy] = useState(false);
    const isLeft = message.fighter === "fighter1";
    const isPlayer = message.fighter === "player";

    if (isPlayer) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center my-4"
            >
                <div className="max-w-[70%] text-center">
                    <div className="text-xs font-orbitron text-yellow-400 tracking-widest uppercase mb-2 flex items-center justify-center gap-2">
                        <span>⚡</span>
                        <span>YOU CHALLENGED</span>
                        <span>⚡</span>
                    </div>
                    <div
                        className="px-5 py-3 rounded-2xl font-inter text-sm text-white leading-relaxed"
                        style={{
                            background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))",
                            border: "1px solid rgba(234,179,8,0.4)",
                        }}
                    >
                        {message.content}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: isLeft ? -20 : 20, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`flex items-start gap-3 ${isLeft ? "flex-row" : "flex-row-reverse"} group`}
        >
            {/* Avatar */}
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-1"
                style={{
                    background: `${message.color}18`,
                    border: `2px solid ${message.color}50`,
                    boxShadow: message.isStreaming ? `0 0 14px ${message.color}60` : "none",
                    transition: "box-shadow 0.3s",
                }}
            >
                {message.avatar}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} max-w-[72%]`}>
                {/* Name + Side Badge */}
                <div className={`flex items-center gap-2 mb-1.5 ${isLeft ? "" : "flex-row-reverse"}`}>
                    <span
                        className="text-xs font-orbitron font-black tracking-wider"
                        style={{ color: message.color }}
                    >
                        {message.fighterName.toUpperCase()}
                    </span>
                    <span
                        className="text-[10px] font-inter px-2 py-0.5 rounded-full uppercase tracking-widest"
                        style={{
                            background: `${message.color}18`,
                            border: `1px solid ${message.color}40`,
                            color: message.color,
                        }}
                    >
                        {message.side === "FOR" ? "⚔ FOR" : "🛡 AGAINST"}
                    </span>
                    <span className="text-[10px] font-inter text-gray-600">Turn {message.turn}</span>
                </div>

                {/* Content Bubble */}
                <div className="relative">
                    <div
                        className="px-5 py-4 rounded-2xl font-inter text-sm text-gray-100 leading-relaxed shadow-lg"
                        style={{
                            background: isLeft
                                ? `linear-gradient(135deg, rgba(15,15,35,0.95), ${message.color}10)`
                                : `linear-gradient(135deg, ${message.color}10, rgba(15,15,35,0.95))`,
                            border: `1px solid ${message.color}35`,
                            boxShadow: message.isStreaming
                                ? `0 0 20px ${message.color}25, inset 0 0 20px ${message.color}08`
                                : "none",
                            transition: "box-shadow 0.3s",
                            borderRadius: isLeft
                                ? "4px 18px 18px 18px"
                                : "18px 4px 18px 18px",
                        }}
                    >
                        {message.content || <span className="opacity-0">.</span>}

                        {/* Streaming cursor */}
                        {message.isStreaming && (
                            <span
                                className="inline-block w-0.5 h-4 ml-1 align-middle animate-pulse rounded-full"
                                style={{ backgroundColor: message.color }}
                            />
                        )}
                    </div>

                    {/* Why? Button — visible on group hover when not streaming */}
                    {!message.isStreaming && message.content && (
                        <div className={`absolute top-2 ${isLeft ? "-right-9" : "-left-9"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                                onClick={() => setShowWhy((v) => !v)}
                                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                style={{
                                    background: `${message.color}20`,
                                    border: `1px solid ${message.color}50`,
                                }}
                                title="Why did it say this?"
                            >
                                <HelpCircle className="w-3.5 h-3.5" style={{ color: message.color }} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Why tooltip */}
                {showWhy && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="mt-2 max-w-xs"
                    >
                        <div
                            className="p-3 rounded-xl text-xs font-inter leading-relaxed text-gray-300 space-y-2"
                            style={{
                                background: "rgba(5,5,20,0.97)",
                                border: `1px solid ${message.color}30`,
                            }}
                        >
                            {insight ? (
                                <>
                                    <div>
                                        <span className="font-bold block mb-0.5" style={{ color: message.color }}>
                                            🎯 {insight.technique}
                                        </span>
                                        <span className="text-gray-300">{insight.insight}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/8">
                                        <div>
                                            <span className="text-green-400 font-bold text-[10px] block">✅ STRENGTH</span>
                                            <span className="text-gray-400 text-[10px]">{insight.strength}</span>
                                        </div>
                                        <div>
                                            <span className="text-red-400 font-bold text-[10px] block">⚠ WEAKNESS</span>
                                            <span className="text-gray-400 text-[10px]">{insight.weakness}</span>
                                        </div>
                                    </div>
                                    <div className="pt-1 border-t border-white/8 flex items-center gap-1.5">
                                        <span className="font-orbitron text-[10px]" style={{ color: message.color }}>Logic Score:</span>
                                        <span className="font-orbitron font-black text-white text-[10px]">{insight.logicScore}/10</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="font-bold block mb-1" style={{ color: message.color }}>
                                        💡 Debate Strategy
                                    </span>
                                    {getWhyTip(message.side, message.turn)}
                                    <span className="block text-gray-600 text-[10px] mt-1">Full AI analysis available in the Report Card below.</span>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
