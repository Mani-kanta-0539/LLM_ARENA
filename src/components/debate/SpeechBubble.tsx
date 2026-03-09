"use client";

import { motion } from "framer-motion";

interface SpeechBubbleProps {
    text: string;
    side: "left" | "right";
    color: string;
    isStreaming: boolean;
}

export default function SpeechBubble({ text, side, color, isStreaming }: SpeechBubbleProps) {
    if (!text) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute -top-40 ${side === "left" ? "left-0" : "right-0"} max-w-[280px] z-20`}
            style={{ transform: side === "right" ? "scaleX(-1)" : "scaleX(1)" }} // Flip if on right
        >
            <div
                className="bg-white p-4 rounded-xl border-4 shadow-xl text-black font-inter text-sm leading-tight relative"
                style={{
                    borderColor: color,
                    clipPath: `polygon(
            0% 0%, 100% 0%, 100% 85%, 
            ${side === "left" ? "20%" : "80%"} 85%, 
            ${side === "left" ? "10%" : "90%"} 100%, 
            ${side === "left" ? "25%" : "75%"} 85%, 
            0% 85%
          )`,
                    transform: side === "right" ? "scaleX(-1)" : "scaleX(1)" // Flip text back
                }}
            >
                <p className="font-bold mb-1" style={{ color }}>{side === "left" ? "FIGHTER 1" : "FIGHTER 2"}</p>
                <span className="break-words">
                    {text}
                    {isStreaming && <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-1" />}
                </span>
            </div>
        </motion.div>
    );
}
