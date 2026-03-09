"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";

interface ChatMessage { role: "user" | "assistant"; text: string; agentName?: string; agentColor?: string; }

// No longer accepts onClose since it's embedded within InspectorPanel permanently
export function ChatPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // We bind chat locally to the currently selected agent in the inspector,
    // or fallback to the orchestrator.
    const { selectedAgentSetId, llmConfig, selectedNpcIndex } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);

    const targetAgentIdx = selectedNpcIndex ?? agentSet.agents.find(a => !a.isPlayer)?.index ?? 1;
    const targetAgent = agentSet.agents.find(a => a.index === targetAgentIdx) ?? agentSet.agents[0];

    // Scroll chat to bottom automatically
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: "user", text: input.trim() };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const systemPrompt = `You are ${targetAgent.role} at ${agentSet.companyName}. ${targetAgent.mission} Personality: ${targetAgent.personality}. Reply in character, concisely (2-3 sentences).`;

            const res = await fetch("/api/agents/call", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: llmConfig.provider,
                    model: llmConfig.model,
                    apiKey: llmConfig.apiKey,
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
                        { role: "user", content: input.trim() },
                    ],
                }),
            });

            const data = await res.json();
            const reply = data.text ?? "I'm currently focused on my work.";

            setMessages(prev => [...prev, {
                role: "assistant",
                text: reply,
                agentName: targetAgent.role,
                agentColor: targetAgent.color,
            }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Please try again.", agentColor: "#ef4444" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[280px] bg-white border-t border-zinc-100">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50" style={{ scrollbarWidth: "thin" }}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <MessageSquare className="w-8 h-8 text-zinc-400 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Direct Message</p>
                        <p className="text-xs text-zinc-400 font-medium text-center mt-1">Start a conversation with {targetAgent.role}</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                            {msg.role === 'assistant' && (
                                <span className="text-[9px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: msg.agentColor ?? '#52525b' }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: msg.agentColor ?? '#52525b' }} />
                                    {msg.agentName}
                                </span>
                            )}
                            <div className={`p-3 rounded-xl text-[11px] font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-zinc-900 text-white rounded-br-sm'
                                : 'bg-white text-zinc-800 border border-zinc-100 rounded-tl-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex items-center gap-2 text-zinc-400 p-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Typing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-zinc-100 shrink-0">
                <div className="relative flex items-center">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder={`Message ${targetAgent.role}...`}
                        className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-300 focus:bg-white transition-all shadow-inner"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900 text-white rounded cursor-pointer hover:bg-black active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-zinc-900"
                    >
                        <Send size={12} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
