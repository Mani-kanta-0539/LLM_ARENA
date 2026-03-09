"use client";

import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";
import { LayoutGrid } from "lucide-react";

const STATUS_CONFIG = {
    todo: { label: "Scheduled", color: "text-zinc-500", dot: "bg-zinc-400" },
    in_progress: { label: "In Progress", color: "text-blue-500", dot: "bg-blue-500" },
    on_hold: { label: "On Hold", color: "text-orange-500", dot: "bg-orange-500" },
    done: { label: "Done", color: "text-emerald-500", dot: "bg-emerald-500" },
};

export function KanbanPanel() {
    const { tasks, selectedAgentSetId } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);

    const columns: Array<{ key: keyof typeof STATUS_CONFIG }> = [
        { key: "todo" },
        { key: "in_progress" },
        { key: "on_hold" },
        { key: "done" },
    ];

    const getAgent = (ids: number[]) => agentSet.agents.find(a => a.index === ids[0]);

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="h-8 px-5 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50 shrink-0">
                <LayoutGrid size={12} className="text-zinc-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Execution Plan</span>
            </div>

            <div className="flex-1 min-h-0 flex px-2 py-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                <div className="flex min-w-[800px] w-full gap-4 px-3">
                    {columns.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.key);
                        const cfg = STATUS_CONFIG[col.key];

                        return (
                            <div key={col.key} className="flex-1 flex flex-col min-w-[200px] max-w-[300px] bg-zinc-50/50 rounded-xl p-3 border border-zinc-100/80 shadow-sm relative">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${col.key === 'in_progress' ? 'animate-pulse' : ''} ${cfg.dot}`} />
                                        <h3 className={`text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>
                                            {cfg.label}
                                        </h3>
                                    </div>
                                    <span className="text-[9px] font-black w-4 h-4 flex items-center justify-center bg-white border border-zinc-200 rounded text-zinc-400">
                                        {colTasks.length}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 overflow-y-auto min-h-[40px] px-1" style={{ scrollbarWidth: 'none' }}>
                                    {colTasks.map(task => {
                                        const agent = getAgent(task.assignedAgentIds);
                                        return (
                                            <div
                                                key={task.id}
                                                className="p-3 rounded-lg bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-default"
                                            >
                                                {col.key === "in_progress" && (
                                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-100">
                                                        <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: "40%" }} />
                                                    </div>
                                                )}

                                                <p className="font-bold text-[11px] text-zinc-800 leading-snug mb-1">
                                                    {task.title}
                                                </p>

                                                <div className="flex items-center gap-1.5 mt-2">
                                                    {agent ? (
                                                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-zinc-50 rounded border border-zinc-100">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                                                            <span className="text-[9px] font-bold text-zinc-600 tracking-tight">{agent.role}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-zinc-400">Unassigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {colTasks.length === 0 && (
                                        <div className="text-[10px] text-zinc-400 font-medium italic text-center py-4 border-2 border-dashed border-zinc-200 rounded-lg">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
