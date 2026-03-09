"use client";

import { useState, useRef, useEffect } from "react";
import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";
import { Filter, Zap, MessageSquare, Send, Loader2 } from "lucide-react";

// ── Inline Chat Component (for the left panel) ───────────────────────────────
function QuickChat() {
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; agentName?: string; color?: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [targetIdx, setTargetIdx] = useState<number | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    const { selectedAgentSetId, llmConfig } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);
    const npcs = agentSet.agents.filter(a => !a.isPlayer);
    const effectiveIdx = targetIdx ?? npcs[0]?.index ?? 1;
    const targetAgent = agentSet.agents.find(a => a.index === effectiveIdx) ?? npcs[0];

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async () => {
        if (!input.trim() || isLoading || !targetAgent) return;
        const text = input.trim();
        setMessages(prev => [...prev, { role: "user", text }]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/agents/call", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: llmConfig.provider,
                    model: llmConfig.model,
                    apiKey: llmConfig.apiKey,
                    messages: [
                        { role: "system", content: `You are ${targetAgent.role} at ${agentSet.companyName}. ${targetAgent.mission} Personality: ${targetAgent.personality}. Reply in character, concisely (2-3 sentences).` },
                        ...messages.map(m => ({ role: m.role, content: m.text })),
                        { role: "user", content: text },
                    ],
                }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: "assistant", text: data.text ?? "...", agentName: targetAgent.role, color: targetAgent.color }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", text: "Connection error.", color: "#ef4444" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Agent Selector */}
            <div className="px-4 py-2 border-b border-zinc-100 shrink-0">
                <div className="flex gap-1 flex-wrap">
                    {npcs.map(a => (
                        <button
                            key={a.index}
                            onClick={() => setTargetIdx(a.index)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${effectiveIdx === a.index ? 'text-white shadow-sm' : 'text-zinc-400 bg-zinc-100 hover:bg-zinc-200'}`}
                            style={effectiveIdx === a.index ? { backgroundColor: a.color } : {}}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {a.role.split(/[-(]/)[0].trim()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 min-h-0" style={{ scrollbarWidth: "thin" }}>
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <MessageSquare className="w-8 h-8 text-zinc-400 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">
                            Chat with {targetAgent?.role ?? 'Agent'}
                        </p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                        {msg.role === 'assistant' && msg.agentName && (
                            <span className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: msg.color }}>
                                {msg.agentName}
                            </span>
                        )}
                        <div className={`px-3 py-2 rounded-xl text-[11px] font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-zinc-900 text-white rounded-br-sm'
                                : 'bg-white text-zinc-800 border border-zinc-100 rounded-tl-sm'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-zinc-400 p-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Typing...</span>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-zinc-100 shrink-0">
                <div className="relative flex items-center">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                        placeholder={`Message ${targetAgent?.role?.split(/[-(]/)[0].trim() ?? 'agent'}...`}
                        className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-all shadow-inner"
                    />
                    <button
                        onClick={send}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900 text-white rounded cursor-pointer hover:bg-black active:scale-95 transition-all disabled:opacity-30"
                    >
                        <Send size={12} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main ActionLogPanel ────────────────────────────────────────────────────────
export function ActionLogPanel() {
    const { actionLog, selectedAgentSetId } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);

    const [activeTab, setActiveTab] = useState<'activity' | 'technical' | 'chat'>('activity');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterAgentIndex, setFilterAgentIndex] = useState<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [actionLog]);

    const displayLogs = actionLog
        .filter(log => filterAgentIndex === null || log.agentIndex === filterAgentIndex)
        .reverse();

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="h-12 px-5 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0 z-10 w-full">
                <span className="text-[11px] font-black text-zinc-900 uppercase tracking-wider">Logs</span>

                {activeTab !== 'chat' && (
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`p-1.5 rounded transition-colors ${isFilterOpen || filterAgentIndex !== null ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'}`}
                        >
                            <Filter size={14} />
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-100 rounded-xl shadow-xl z-30 py-1.5 overflow-hidden">
                                    <button
                                        onClick={() => { setFilterAgentIndex(null); setIsFilterOpen(false); }}
                                        className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 transition-colors ${filterAgentIndex === null ? 'text-zinc-900' : 'text-zinc-400'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${filterAgentIndex === null ? 'bg-zinc-900' : 'bg-transparent border border-zinc-200'}`} />
                                        All Agents
                                    </button>
                                    <div className="h-px bg-zinc-50 my-1" />
                                    {agentSet.agents.filter(a => !a.isPlayer).map((agent) => (
                                        <button
                                            key={agent.index}
                                            onClick={() => { setFilterAgentIndex(agent.index); setIsFilterOpen(false); }}
                                            className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 transition-colors ${filterAgentIndex === agent.index ? 'text-zinc-900' : 'text-zinc-400'}`}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                                            {agent.role}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-100 bg-zinc-50 shrink-0">
                {(['activity', 'technical', 'chat'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-white border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        {tab === 'chat' && <MessageSquare size={10} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Chat Tab */}
            {activeTab === 'chat' && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <QuickChat />
                </div>
            )}

            {/* Log Tabs */}
            {activeTab !== 'chat' && (
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 max-h-full" style={{ scrollbarWidth: "thin" }}>
                    {displayLogs.length === 0 ? (
                        <p className="text-zinc-300 text-[10px] font-bold uppercase tracking-widest text-center py-16">No recent items</p>
                    ) : (
                        displayLogs.map(entry => {
                            const agent = agentSet.agents.find(a => a.index === entry.agentIndex);
                            return (
                                <div key={entry.id} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent?.color ?? '#e4e4e7' }} />
                                            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest leading-none">
                                                {agent?.role ?? 'System'}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-medium text-zinc-400 font-mono">
                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="pl-3.5 flex flex-col gap-1.5 border-l-2 border-zinc-50">
                                        {activeTab === 'activity' ? (
                                            <p className="text-xs text-zinc-600 leading-relaxed font-medium">{entry.summary}</p>
                                        ) : (
                                            <div className="flex flex-col gap-1 inline-block">
                                                <span className="flex w-fit items-center gap-1 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shadow-sm">
                                                    <Zap size={8} />
                                                    {entry.toolName}()
                                                </span>
                                                <pre className="text-[9px] font-mono text-zinc-500 overflow-x-hidden text-ellipsis bg-zinc-50 p-1.5 rounded line-clamp-2 mt-1">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    {(entry as any).toolInput || entry.summary}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
