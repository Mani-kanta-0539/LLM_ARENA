"use client";

import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";
import { MessageSquareWarning, FolderOpen, MessageSquare, Briefcase, ChevronRight, CheckCircle2 } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

interface Props {
    onApprove: (taskId: string) => void;
    onViewFinalOutput: () => void;
}

export function InspectorPanel({ onApprove, onViewFinalOutput }: Props) {
    const { selectedNpcIndex, setSelectedNpc, tasks, thoughts, selectedAgentSetId, phase } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);

    // Hardcode Orchestrator for now as index 1 (usually the first/main agent)
    const ORCHESTRATOR_INDEX = 1;

    // If no agent selected, return a blank white panel or a placeholder
    if (selectedNpcIndex === null) {
        return (
            <div className="w-[340px] h-full bg-white border-l border-zinc-100 flex flex-col pointer-events-auto shrink-0 z-30 px-6 py-8">
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                    <Briefcase className="w-12 h-12 text-zinc-300 mb-4" strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-widest text-zinc-800">No Agent Selected</p>
                    <p className="text-xs text-zinc-500 font-medium mt-2">Click an agent in the 3D scene to view their details.</p>
                </div>
            </div>
        );
    }

    const agent = agentSet.agents.find(a => a.index === selectedNpcIndex)!;
    const isOrchestratorIdle = phase === 'idle' && agent.index === ORCHESTRATOR_INDEX;
    const isProjectReady = phase === 'done' && agent.index === ORCHESTRATOR_INDEX;

    const agentTasks = tasks.filter(t => t.assignedAgentIds.includes(agent.index));
    const onHoldTask = agentTasks.find(t => t.status === 'on_hold');
    const thought = thoughts[agent.index];

    const needsDiscussion = isOrchestratorIdle || !!onHoldTask;

    return (
        <div className="w-[340px] h-full bg-white border-l border-zinc-100 flex flex-col pointer-events-auto shrink-0 relative z-30">
            {/* Header with Role and Department */}
            <div className="p-6 pb-4 border-b border-zinc-50 bg-white">
                <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    {agent.department || "General"}
                                </p>
                            </div>
                            <h2 className="text-2xl font-black text-zinc-900 leading-tight tracking-tight">
                                {agent.role}
                            </h2>
                        </div>
                        <button onClick={() => setSelectedNpc(null)} className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 bg-zinc-50 hover:bg-zinc-100">✕</button>
                    </div>

                    {needsDiscussion ? (
                        <div className="flex flex-col gap-3 p-4 bg-zinc-50 border border-zinc-100 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-md text-white">
                                    <MessageSquare size={12} strokeWidth={3} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">Needs Discussion</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-[12px] font-bold text-zinc-900 leading-tight">
                                    {isOrchestratorIdle
                                        ? "Discuss the project briefing with the team."
                                        : `This task is waiting for your input to proceed.`}
                                </p>
                                <p className="text-[10px] text-zinc-400 italic">Waiting for your input to proceed.</p>

                                {onHoldTask && (
                                    <button
                                        onClick={() => onApprove(onHoldTask.id)}
                                        className="w-full mt-2 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white transition-all hover:bg-orange-600 bg-orange-500 shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle2 size={14} />
                                        Approve & Continue
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            {isProjectReady ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Project Ready</span>
                                    </div>
                                    <button
                                        onClick={onViewFinalOutput}
                                        className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-full shadow-sm"
                                    >
                                        <FolderOpen size={14} strokeWidth={3} />
                                        View Final Output
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Active & Working</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-white p-6 space-y-6" style={{ scrollbarWidth: 'thin' }}>

                {thought && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Thought</span>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] font-medium text-zinc-600 italic">
                            "{thought.text}"
                        </div>
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expertise</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {agent.expertise.map(exp => (
                            <span key={exp} className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-[9px] font-bold text-zinc-600 tracking-tight">
                                {exp}
                            </span>
                        ))}
                    </div>
                </div>

                {agentTasks.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Tasks</span>
                        </div>
                        <div className="space-y-2">
                            {agentTasks.map(task => (
                                <div key={task.id} className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <p className="font-bold text-[11px] text-zinc-900 leading-snug">{task.title}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none mt-0.5 ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                task.status === 'on_hold' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500'
                                            }`}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">
                                        {task.output || "Pending execution..."}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat attached to bottom */}
            <div className="border-t border-zinc-100 bg-white">
                <ChatPanel />
            </div>
        </div>
    );
}
