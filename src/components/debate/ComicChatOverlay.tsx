"use client";

import { AnimatePresence } from "framer-motion";
import { ChatBubbleMessage } from "./ChatBubble";
import { MessageAnalysis } from "./DebateReport";
import ComicChatBubble from "./ComicChatBubble";

interface ComicChatOverlayProps {
    messages: ChatBubbleMessage[];
    streamingMsg: ChatBubbleMessage | null;
    insightMap?: Record<string, MessageAnalysis>;
}

export default function ComicChatOverlay({ messages, streamingMsg, insightMap = {} }: ComicChatOverlayProps) {
    // IMPORTANT: Never show streamingMsg AND completed messages at the same time.
    // While a turn is streaming → show only that bubble.
    // When idle → show last 2 completed messages (faded older one).
    const displayMsgs: ChatBubbleMessage[] = streamingMsg
        ? [streamingMsg]
        : messages.slice(-2);

    return (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end px-8 pb-32">
            <div className="flex-1 w-full flex flex-col justify-end p-4">
                <AnimatePresence mode="popLayout">
                    {displayMsgs.map((msg, idx) => {
                        const isOld = displayMsgs.length === 2 && idx === 0;
                        return (
                            <div
                                key={msg.id + (msg.isStreaming ? "-stream" : "")}
                                className="w-full flex justify-center transition-all duration-500"
                                style={{
                                    opacity: isOld ? 0.4 : 1,
                                    transform: `scale(${isOld ? 0.92 : 1})`,
                                }}
                            >
                                <div className="w-full max-w-5xl">
                                    <ComicChatBubble
                                        message={msg}
                                        insight={insightMap[msg.id] ?? null}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
