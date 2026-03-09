"use client";

import { motion } from "framer-motion";
import { ChatBubbleMessage } from "./ChatBubble";
import { MessageAnalysis } from "./DebateReport";
import { useEffect, useState, useRef } from "react";

interface ComicBubbleProps {
    message: ChatBubbleMessage;
    insight?: MessageAnalysis | null;
}

export default function ComicChatBubble({ message, insight }: ComicBubbleProps) {
    const isLeft = message.fighter === "fighter1";
    const isPlayer = message.fighter === "player";
    const isStreaming = message.isStreaming ?? false;

    // For completed messages show full text immediately.
    // For streaming messages, animate character by character.
    const [displayed, setDisplayed] = useState(() => isStreaming ? "" : message.content);
    const indexRef = useRef(isStreaming ? 0 : message.content.length);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isStreaming) {
            // Message is done — show everything immediately
            setDisplayed(message.content);
            indexRef.current = message.content.length;
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        // Message is still streaming — reveal new chars as they arrive
        if (message.content.length > indexRef.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                if (indexRef.current < message.content.length) {
                    indexRef.current += 1;
                    setDisplayed(message.content.slice(0, indexRef.current));
                } else {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                }
            }, 25);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [message.content, isStreaming]);

    if (isPlayer) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center my-4 w-full"
            >
                <div className="relative max-w-md">
                    <div className="absolute inset-0 bg-yellow-400 rotate-2 translate-x-1 translate-y-1"></div>
                    <div className="relative bg-white border-2 border-black/20 px-5 py-3 rounded-xl shadow-lg">
                        <div className="text-xs text-gray-800">{message.content}</div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Logic for POW/LOGIC effects
    const showEffect = insight && insight.logicScore >= 8;
    const effectText = showEffect ? (insight.logicScore >= 9 ? "LOGIC!" : "POW!") : null;

    const bubbleBg = isLeft
        ? "linear-gradient(135deg, #fffef8 0%, #f0f4ff 100%)"
        : "linear-gradient(135deg, #fff8fe 0%, #f5f0ff 100%)";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`flex w-full ${isLeft ? "justify-start pl-2" : "justify-end pr-2"} mb-4 relative`}
        >
            {effectText && (
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1.2, rotate: isLeft ? -10 : 10 }}
                    className="absolute z-0 pointer-events-none"
                    style={{
                        top: "-24px",
                        [isLeft ? "left" : "right"]: "-10px",
                        fontFamily: "Impact, sans-serif",
                        color: "#ff0000",
                        textShadow: "3px 3px 0 #000",
                        fontSize: "2.2rem",
                        WebkitTextStroke: "1px black"
                    }}
                >
                    {effectText}
                </motion.div>
            )}

            <div className="relative max-w-[72%] z-10">
                {/* Comic shadow */}
                <div className="absolute inset-0 bg-black/70 translate-x-1.5 translate-y-1.5 rounded-xl" />

                {/* Main bubble */}
                <div
                    className="relative border-2 border-black/80 rounded-xl px-3 py-2.5 shadow-xl"
                    style={{ background: bubbleBg }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                            className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded text-white"
                            style={{
                                background: isLeft
                                    ? "linear-gradient(90deg, #4285f4, #34a853)"
                                    : "linear-gradient(90deg, #ea4335, #9c27b0)",
                                letterSpacing: "0.05em"
                            }}
                        >
                            {message.fighterName}
                        </span>
                        <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wide">
                            {message.side}
                        </span>
                    </div>

                    {/* Text content */}
                    <div className="text-[11px] text-gray-900 leading-snug font-medium min-h-[1em]">
                        {displayed}
                        {isStreaming && (
                            <span className="inline-block w-0.5 h-3 bg-gray-600 ml-0.5 animate-pulse align-middle" />
                        )}
                    </div>

                    {/* Tail */}
                    <div className={`absolute -bottom-[10px] ${isLeft ? "left-5" : "right-5"} w-0 h-0
                        border-l-[10px] border-l-transparent
                        border-r-[10px] border-r-transparent
                        border-t-[10px] border-t-black/80
                    `}></div>
                    <div className={`absolute -bottom-[8px] ${isLeft ? "left-[21px]" : "right-[21px]"} w-0 h-0
                        border-l-[8px] border-l-transparent
                        border-r-[8px] border-r-transparent
                        border-t-[8px] border-t-amber-50
                    `}></div>
                </div>
            </div>
        </motion.div>
    );
}
