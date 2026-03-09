"use client";

import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";
import { RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
    idle: { label: "⏳ IDLE", color: "#6b7280" },
    briefing: { label: "📋 BRIEFING", color: "#a855f7" },
    working: { label: "⚡ WORKING", color: "#00ccff" },
    awaiting_approval: { label: "⏸️ APPROVAL", color: "#f59e0b" },
    delivering: { label: "📦 DELIVERING", color: "#10b981" },
    done: { label: "✅ DELIVERED", color: "#10b981" },
};

interface Props {
    onReset: () => void;
}

export function Header({ onReset }: Props) {
    const { phase, selectedAgentSetId } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);
    const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.idle;

    return (
        <div className="h-12 border-b border-zinc-100 flex items-center justify-between px-4 bg-white shrink-0 z-20">
            <div className="flex items-center gap-4 h-full">
                {/* Logo / back */}
                <Link href="/agents" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-black text-xs uppercase tracking-widest">AI Agents</span>
                </Link>

                <div className="h-4 w-px bg-zinc-200 ml-2" />

                <div className="flex flex-col justify-center ml-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{agentSet.companyType}</span>
                    <span className="font-black text-sm text-zinc-800 leading-tight">{agentSet.companyName}</span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500 rounded-full ml-4">
                    <span className="text-[10px] font-black text-white px-1 leading-none">{agentSet.agents.filter(a => !a.isPlayer).length} AGENTS</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Phase */}
                <motion.div
                    key={phase}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-50"
                    style={{ borderColor: `${phaseCfg.color}30` }}
                >
                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: phaseCfg.color }}
                        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                    <span className="font-black text-[10px] tracking-wider uppercase text-zinc-600">{phaseCfg.label}</span>
                </motion.div>

                <div className="h-4 w-px bg-zinc-200" />

                {/* Reset */}
                <button onClick={onReset}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
