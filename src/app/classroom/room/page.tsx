"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, RotateCcw, Loader2, BookOpen, Send, Play, MessageSquare, Filter } from "lucide-react";
import { LLMProvider, PROVIDER_CATALOGUE } from "@/lib/llm-adapters";

// ── Dynamic import (no SSR) ────────────────────────────────────────────────────
const ClassroomScene = dynamic(() => import("@/components/classroom/ClassroomScene"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-zinc-50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
        </div>
    ),
});

// ── Types ──────────────────────────────────────────────────────────────────────
interface RoleConfig {
    name: string;
    provider: LLMProvider;
    model: string;
    apiKey: string;
}

interface ClassroomConfig {
    topic: string;
    rounds: number;
    teacher: RoleConfig;
    student: RoleConfig;
}

interface ChatMessage {
    id: string;
    role: "teacher" | "student";
    name: string;
    content: string;
    color: string;
    isStreaming?: boolean;
}

type ClassroomStatus = "idle" | "loading" | "running" | "done" | "error";

// ── Agent colors (matching agents room palette) ────────────────────────────────
const TEACHER_COLOR = "#3b82f6"; // blue
const STUDENT_COLORS = ["#f59e0b", "#10b981", "#ec4899"];

export default function ClassroomRoom() {
    const router = useRouter();
    const [config, setConfig] = useState<ClassroomConfig | null>(null);
    const [status, setStatus] = useState<ClassroomStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingMsg, setStreamingMsg] = useState<ChatMessage | null>(null);
    const [activeRole, setActiveRole] = useState<"teacher" | "student" | null>(null);
    const [agentChats, setAgentChats] = useState<{ teacher?: string; student?: string }>({});
    const [currentRound, setCurrentRound] = useState(0);
    const [chatInput, setChatInput] = useState("");
    const [logFilter, setLogFilter] = useState<"teacher" | "student" | null>(null);
    const [activeTab, setActiveTab] = useState<"logs" | "chat">("logs");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const isRunningRef = useRef(false);

    // Load config from sessionStorage
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("classroomConfig");
            if (raw) setConfig(JSON.parse(raw));
            else router.push("/classroom");
        } catch { router.push("/classroom"); }
    }, [router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingMsg]);

    // ── Stream one turn ────────────────────────────────────────────────────────
    const streamTurn = useCallback(async (
        role: "teacher" | "student",
        cfg: RoleConfig,
        history: ChatMessage[],
        systemPrompt: string,
        signal: AbortSignal
    ): Promise<string> => {
        setActiveRole(role);
        const msgId = `${role}-${Date.now()}`;
        const color = role === "teacher" ? TEACHER_COLOR : STUDENT_COLORS[0];

        const partial: ChatMessage = { id: msgId, role, name: cfg.name, content: "", color, isStreaming: true };
        setStreamingMsg(partial);

        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...history.map(m => ({ role: m.role === "teacher" ? "user" : "assistant", content: m.content })),
        ];

        const res = await fetch("/api/agents/call", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({ provider: cfg.provider, model: cfg.model, apiKey: cfg.apiKey, messages: apiMessages }),
        });

        const data = await res.json();
        const text: string = data.text ?? "(no response)";

        setStreamingMsg(null);
        const finalMsg: ChatMessage = { id: msgId, role, name: cfg.name, content: text, color };
        setMessages(prev => [...prev, finalMsg]);

        setAgentChats(prev => ({ ...prev, [role]: text.slice(0, 120) }));
        setTimeout(() => setAgentChats(prev => ({ ...prev, [role]: undefined })), 6000);

        return text;
    }, []);

    // ── Run session ───────────────────────────────────────────────────────────
    const runSession = useCallback(async () => {
        if (!config || isRunningRef.current) return;
        isRunningRef.current = true;
        setStatus("loading");
        setMessages([]);
        setCurrentRound(0);

        const abort = new AbortController();
        abortRef.current = abort;

        try {
            setStatus("running");
            const history: ChatMessage[] = [];

            for (let r = 0; r < config.rounds; r++) {
                setCurrentRound(r + 1);
                if (abort.signal.aborted) break;

                // Teacher teaches
                const teacherPrompt = `You are ${config.teacher.name}, a knowledgeable teacher explaining "${config.topic}". Round ${r + 1}/${config.rounds}. ${r === 0 ? "Start with a clear, engaging introduction." : "Continue the lesson, building on the previous exchange."}  Keep your explanation concise (3-4 sentences).`;
                const teacherText = await streamTurn("teacher", config.teacher, history, teacherPrompt, abort.signal);
                history.push({ id: "", role: "teacher", name: config.teacher.name, content: teacherText, color: TEACHER_COLOR });

                await new Promise(r => setTimeout(r, 1200));
                if (abort.signal.aborted) break;

                // Student responds
                const studentPrompt = `You are ${config.student.name}, a curious student learning about "${config.topic}". The teacher just said: "${teacherText}". ${r < config.rounds - 1 ? "Ask one focused follow-up question or show understanding." : "Summarize what you've learned in 2-3 sentences."}`;
                const studentText = await streamTurn("student", config.student, history, studentPrompt, abort.signal);
                history.push({ id: "", role: "student", name: config.student.name, content: studentText, color: STUDENT_COLORS[0] });

                await new Promise(r => setTimeout(r, 800));
            }

            setStatus("done");
        } catch (e: unknown) {
            if ((e as Error).name !== "AbortError") {
                setErrorMsg((e as Error).message ?? "Unknown error");
                setStatus("error");
            }
        } finally {
            isRunningRef.current = false;
            setActiveRole(null);
        }
    }, [config, streamTurn]);

    const handleReset = () => {
        abortRef.current?.abort();
        isRunningRef.current = false;
        setStatus("idle");
        setMessages([]);
        setStreamingMsg(null);
        setActiveRole(null);
        setCurrentRound(0);
        setAgentChats({});
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const displayedMessages = [...messages, ...(streamingMsg ? [streamingMsg] : [])];
    const filteredLogs = logFilter ? displayedMessages.filter(m => m.role === logFilter) : displayedMessages;
    const isTeaching = status === "running";

    if (!config) {
        return (
            <div className="w-screen h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-screen h-screen flex flex-col bg-zinc-50 overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="h-12 border-b border-zinc-100 flex items-center justify-between px-4 bg-white shrink-0 z-20">
                <div className="flex items-center gap-4 h-full">
                    <button onClick={() => router.push("/classroom")} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-black text-xs uppercase tracking-widest">Classroom</span>
                    </button>

                    <div className="h-4 w-px bg-zinc-200 ml-2" />

                    <div className="flex flex-col justify-center ml-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">LESSON</span>
                        <span className="font-black text-sm text-zinc-800 leading-tight truncate max-w-[260px]">{config.topic}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-full ml-4">
                        <BookOpen className="w-3 h-3 text-white" />
                        <span className="text-[10px] font-black text-white px-1 leading-none">2 AGENTS</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Phase pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-50 border-zinc-100">
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-blue-500 animate-pulse' : status === 'done' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        <span className="font-black text-[10px] tracking-wider uppercase text-zinc-600">
                            {status === 'idle' ? '⏳ READY' : status === 'loading' ? '⚡ STARTING' : status === 'running' ? `📖 ROUND ${currentRound}/${config.rounds}` : status === 'done' ? '✅ COMPLETE' : '❌ ERROR'}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-zinc-200" />
                    <button onClick={handleReset} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Main Content ──────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0">

                {/* ── Left Panel: Logs + Chat ──────────────────────────────── */}
                <div className="w-64 shrink-0 border-r border-zinc-100 flex flex-col bg-white">
                    {/* Panel header */}
                    <div className="h-12 px-5 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                        <span className="text-[11px] font-black text-zinc-900 uppercase tracking-wider">Logs</span>
                        {activeTab === "logs" && (
                            <button
                                onClick={() => setLogFilter(logFilter ? null : "teacher")}
                                className={`p-1.5 rounded transition-colors ${logFilter ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'}`}
                            >
                                <Filter size={14} />
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-zinc-100 bg-zinc-50 shrink-0">
                        {(["logs", "chat"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-white border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                {tab === "chat" && <MessageSquare size={10} />}
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Logs Content */}
                    {activeTab === "logs" && (
                        <>
                            {/* Filter buttons */}
                            {logFilter !== null && (
                                <div className="px-3 pt-2 flex gap-1 flex-wrap shrink-0">
                                    <button onClick={() => setLogFilter(null)} className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${logFilter === null ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>All</button>
                                    <button onClick={() => setLogFilter("teacher")} className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${logFilter === "teacher" ? 'text-white' : 'bg-zinc-100 text-zinc-400'}`} style={logFilter === "teacher" ? { backgroundColor: TEACHER_COLOR } : {}}>Teacher</button>
                                    <button onClick={() => setLogFilter("student")} className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${logFilter === "student" ? 'text-white' : 'bg-zinc-100 text-zinc-400'}`} style={logFilter === "student" ? { backgroundColor: STUDENT_COLORS[0] } : {}}>Student</button>
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
                                {filteredLogs.length === 0 ? (
                                    <p className="text-zinc-300 text-[10px] font-bold uppercase tracking-widest text-center py-10">No recent items</p>
                                ) : (
                                    filteredLogs.map(msg => (
                                        <div key={msg.id} className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: msg.color }} />
                                                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{msg.name}</span>
                                                </div>
                                                <span className="text-[9px] text-zinc-400 font-black uppercase">{msg.role}</span>
                                            </div>
                                            <div className="pl-3.5 border-l-2 border-zinc-50">
                                                <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                                                    {msg.content}{msg.isStreaming && <span className="inline-block w-1 h-3 bg-zinc-400 ml-1 animate-pulse" />}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </>
                    )}

                    {/* Chat Tab — direct message to teacher or student */}
                    {activeTab === "chat" && (
                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="px-4 py-2 border-b border-zinc-100 shrink-0 flex gap-1">
                                <button onClick={() => setLogFilter("teacher")} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${logFilter === "teacher" ? 'text-white' : 'bg-zinc-100 text-zinc-400'}`} style={logFilter === "teacher" ? { backgroundColor: TEACHER_COLOR } : {}}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />TEACHER
                                </button>
                                <button onClick={() => setLogFilter("student")} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${logFilter === "student" ? 'text-white' : 'bg-zinc-100 text-zinc-400'}`} style={logFilter === "student" ? { backgroundColor: STUDENT_COLORS[0] } : {}}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />STUDENT
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 min-h-0" style={{ scrollbarWidth: "thin" }}>
                                <div className="h-full flex flex-col items-center justify-center opacity-40">
                                    <MessageSquare className="w-8 h-8 text-zinc-400 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Lesson chat<br />runs automatically</p>
                                </div>
                            </div>
                            <div className="p-3 bg-white border-t border-zinc-100 shrink-0">
                                <div className="relative flex items-center">
                                    <input
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-all"
                                    />
                                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900 text-white rounded hover:bg-black active:scale-95 transition-all disabled:opacity-30">
                                        <Send size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Center: 3D Canvas + Execution Info ───────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0">
                    {/* 3D Canvas */}
                    <div className="flex-1 relative min-h-0 bg-zinc-50">
                        {status === "idle" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                <div className="bg-white border border-zinc-100 rounded-2xl px-8 py-6 shadow-sm text-center pointer-events-auto">
                                    <BookOpen className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                                    <p className="font-black text-xs uppercase tracking-widest text-zinc-500 mb-4">Ready to start</p>
                                    <button
                                        onClick={runSession}
                                        className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-sm"
                                    >
                                        <Play size={12} strokeWidth={3} /> Start Lesson
                                    </button>
                                </div>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-50 border border-red-200 rounded-xl px-5 py-3 shadow-sm text-[11px] text-red-600 font-bold">
                                {errorMsg}
                            </div>
                        )}

                        <ClassroomScene
                            isTeaching={isTeaching}
                            activeRole={activeRole}
                            teacherColor={TEACHER_COLOR}
                            studentColors={STUDENT_COLORS}
                            teacherName={config.teacher.name}
                            studentName={config.student.name}
                            agentChats={agentChats}
                        />
                    </div>

                    {/* Bottom: Round progress bar */}
                    <div className="h-12 bg-white border-t border-zinc-100 flex items-center px-5 gap-5 shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Progress</span>
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-zinc-900 rounded-full transition-all duration-700"
                                style={{ width: `${config.rounds > 0 ? (currentRound / config.rounds) * 100 : 0}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-black text-zinc-500">{currentRound}/{config.rounds}</span>

                        {status === "idle" && (
                            <button onClick={runSession} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all">
                                <Play size={10} strokeWidth={3} /> Start
                            </button>
                        )}
                        {status === "running" && (
                            <button onClick={handleReset} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all">
                                Stop
                            </button>
                        )}
                        {status === "done" && (
                            <button onClick={handleReset} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all">
                                <RotateCcw size={10} /> Restart
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Right Panel: Inspector ───────────────────────────────── */}
                <div className="w-72 shrink-0 border-l border-zinc-100 flex flex-col bg-white">
                    <div className="h-12 px-5 border-b border-zinc-100 flex items-center bg-white shrink-0">
                        <span className="text-[11px] font-black text-zinc-900 uppercase tracking-wider">Inspector</span>
                    </div>

                    {/* Teacher card */}
                    <div className="p-4 border-b border-zinc-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TEACHER_COLOR }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Teacher</span>
                            {activeRole === "teacher" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-auto" />}
                        </div>
                        <p className="font-black text-sm text-zinc-900">{config.teacher.name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{config.teacher.provider} · {config.teacher.model}</p>
                    </div>

                    {/* Student card */}
                    <div className="p-4 border-b border-zinc-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STUDENT_COLORS[0] }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Student</span>
                            {activeRole === "student" && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-auto" />}
                        </div>
                        <p className="font-black text-sm text-zinc-900">{config.student.name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{config.student.provider} · {config.student.model}</p>
                    </div>

                    {/* Topic */}
                    <div className="p-4 border-b border-zinc-100">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Topic</span>
                        <p className="font-bold text-xs text-zinc-800 leading-relaxed mt-1">{config.topic}</p>
                    </div>

                    {/* Latest exchange */}
                    <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Latest Exchange</span>
                        {displayedMessages.length === 0 ? (
                            <p className="text-[10px] text-zinc-300 font-bold italic text-center py-8">Start the lesson to see exchanges here</p>
                        ) : (
                            <div className="space-y-3">
                                {displayedMessages.slice(-4).map(msg => (
                                    <div key={msg.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: msg.color }} />
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: msg.color }}>{msg.name}</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-700 leading-relaxed">
                                            {msg.content.slice(0, 180)}{msg.content.length > 180 ? "..." : ""}
                                            {msg.isStreaming && <span className="inline-block w-1 h-3 bg-zinc-400 ml-1 animate-pulse" />}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
