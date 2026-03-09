"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";
import { useAgencyOrchestrator } from "@/hooks/useAgencyOrchestrator";
import { Header } from "@/components/agents/Header";
import { ActionLogPanel } from "@/components/agents/ActionLogPanel";
import { KanbanPanel } from "@/components/agents/KanbanPanel";
import { InspectorPanel } from "@/components/agents/InspectorPanel";
import { PartyPopper, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { AgentSceneManager } from "@/lib/agent-scene";

// Dynamic import: Three.js cannot run on SSR
const SimulationCanvas = dynamic(
    () => import("@/components/agents/SimulationCanvas").then(m => ({ default: m.SimulationCanvas })),
    {
        ssr: false, loading: () => (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-orbitron text-sm font-bold text-zinc-800 tracking-widest uppercase">Initializing Simulator</p>
                </div>
            </div>
        )
    }
);

export default function AgentsRoomPage() {
    const sceneRef = useRef<AgentSceneManager | null>(null);
    const { startProject, approveTask, reset } = useAgencyOrchestrator();

    const { phase, selectedAgentSetId, finalOutput } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);

    const [brief, setBrief] = useState("");
    const [showBrief, setShowBrief] = useState(phase === "idle");
    const [showFinal, setShowFinal] = useState(false);

    const handleStartProject = () => {
        if (!brief.trim()) return;
        setShowBrief(false);
        startProject(brief, sceneRef as React.MutableRefObject<unknown>);
    };

    const handleApprove = (taskId: string) => {
        approveTask(taskId, sceneRef as React.MutableRefObject<unknown>);
    };

    return (
        <div className="w-screen h-screen bg-white overflow-hidden flex flex-col font-inter">
            {/* Top Header */}
            <Header onReset={reset} />

            <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden">
                {/* Left: Log panel */}
                <div className="w-[320px] h-full shrink-0 border-r border-zinc-100 flex flex-col overflow-hidden bg-white">
                    <ActionLogPanel />
                </div>

                {/* Center: Canvas + Kanban */}
                <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-zinc-50">
                    <div className="flex-1 min-h-0 relative">
                        <SimulationCanvas sceneRef={sceneRef} />
                    </div>

                    {/* Locked Kanban at the bottom of the center view */}
                    <div className="h-[220px] bg-zinc-50 border-t border-zinc-200 shrink-0">
                        <KanbanPanel />
                    </div>
                </div>

                {/* Right: Inspector */}
                <InspectorPanel onApprove={handleApprove} onViewFinalOutput={() => setShowFinal(true)} />
            </div>

            {/* Modals overlaid on top of everything */}
            <AnimatePresence>
                {(phase === "idle" || showBrief) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-zinc-900/40 backdrop-blur-sm pointer-events-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
                            className="w-[500px] rounded-2xl p-8 bg-white border border-zinc-200 shadow-2xl flex flex-col"
                        >
                            <div className="text-center mb-6">
                                <div className="text-4xl mb-3">{agentSet.agents[0].emoji}</div>
                                <h2 className="font-black text-2xl text-zinc-900 mb-1 uppercase tracking-tight">Brief Your Team</h2>
                                <p className="text-zinc-500 text-sm font-medium">{agentSet.companyName} · {agentSet.companyType}</p>
                            </div>

                            <textarea
                                value={brief}
                                onChange={e => setBrief(e.target.value)}
                                placeholder={`Describe your project for the ${agentSet.companyName} team...\n\nExample: "Create a go-to-market strategy for a new AI productivity app targeting remote teams."`}
                                className="w-full h-32 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 resize-none transition-all shadow-inner"
                            />

                            <div className="flex gap-3 mt-6">
                                <Link href="/agents" className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-zinc-500 border border-zinc-200 text-center hover:bg-zinc-50 hover:text-zinc-700 transition-all">
                                    Cancel
                                </Link>
                                <button
                                    onClick={handleStartProject}
                                    disabled={!brief.trim()}
                                    className="flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 bg-zinc-900 hover:bg-black shadow-lg"
                                >
                                    Deploy Team
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {phase === "done" && !showFinal && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
                    >
                        <button
                            onClick={() => setShowFinal(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
                            style={{ background: "#10b981" }}
                        >
                            <PartyPopper className="w-4 h-4" /> View Final Deliverable
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFinal && finalOutput && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto bg-zinc-900/40 backdrop-blur-sm"
                        onClick={() => setShowFinal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                            onClick={e => e.stopPropagation()}
                            className="w-[680px] max-h-[85vh] rounded-2xl flex flex-col bg-white overflow-hidden shadow-2xl border border-emerald-100"
                        >
                            <div className="px-8 py-5 border-b border-zinc-100 flex items-center gap-3 bg-white relative z-10">
                                <PartyPopper className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-black text-base text-zinc-900 uppercase tracking-widest">Final Deliverable</h3>
                                <div className="ml-auto text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded uppercase">{agentSet.companyName}</div>
                                <button onClick={() => setShowFinal(false)} className="w-7 h-7 ml-2 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 shadow-inner">
                                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                                    <pre className="font-mono text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{finalOutput}</pre>
                                </div>
                            </div>
                            <div className="px-8 py-4 border-t border-zinc-100 flex gap-3 bg-white relative z-10">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(finalOutput); }}
                                    className="px-5 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                                >Copy</button>
                                <button onClick={reset}
                                    className="ml-auto px-5 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest text-zinc-500 border border-zinc-200 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all flex items-center">
                                    <RotateCcw className="w-3 h-3 mr-1.5" />New Project
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
