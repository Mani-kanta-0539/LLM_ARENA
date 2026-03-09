// ─────────────────────────────────────────────────────────────────────────────
// Agency Store — Zustand state for the Agents mode
// Adapted from The Delegation's agencyStore.ts
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { AgencyPhase, AgentTask, AgentThought, LLMAgentConfig } from './agent-types';
import { DEFAULT_AGENT_SET_ID } from './agent-sets';

interface ActionLogEntry {
    id: string;
    timestamp: number;
    agentIndex: number;
    toolName: string;
    summary: string;
    type: 'propose' | 'complete' | 'approval' | 'message' | 'deliver';
}

interface AgencyState {
    // Config
    selectedAgentSetId: string;
    llmConfig: LLMAgentConfig;
    projectBrief: string;

    // Runtime
    phase: AgencyPhase;
    tasks: AgentTask[];
    thoughts: Record<number, AgentThought>;
    actionLog: ActionLogEntry[];
    finalOutput: string | null;
    isPaused: boolean;

    // UI
    selectedNpcIndex: number | null;
    npcScreenPositions: Record<number, { x: number; y: number }>;
    hoveredNpcIndex: number | null;
    hoveredPoiId: string | null;
    hoveredPoiLabel: string | null;
    hoverPosition: { x: number; y: number } | null;

    // Setters
    setAgentSet: (id: string) => void;
    setLlmConfig: (cfg: Partial<LLMAgentConfig>) => void;
    setProjectBrief: (brief: string) => void;
    setPhase: (phase: AgencyPhase) => void;
    setPaused: (paused: boolean) => void;
    setFinalOutput: (output: string) => void;
    setSelectedNpc: (index: number | null) => void;
    setNpcScreenPosition: (index: number, pos: { x: number; y: number }) => void;
    setHoveredNpc: (index: number | null, pos: { x: number; y: number } | null) => void;
    setHoveredPoi: (id: string | null, label: string | null, pos: { x: number; y: number } | null) => void;

    // Task mutations
    addTask: (task: AgentTask) => void;
    updateTask: (id: string, updates: Partial<AgentTask>) => void;
    removeTask: (id: string) => void;
    clearTasks: () => void;

    // Thoughts
    setThought: (agentIndex: number, text: string) => void;
    clearThought: (agentIndex: number) => void;

    // Action log
    addLogEntry: (entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => void;

    // Reset
    reset: () => void;
}

const DEFAULT_LLM: LLMAgentConfig = { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: '' };

export const useAgencyStore = create<AgencyState>((set) => ({
    selectedAgentSetId: DEFAULT_AGENT_SET_ID,
    llmConfig: DEFAULT_LLM,
    projectBrief: '',
    phase: 'idle',
    tasks: [],
    thoughts: {},
    actionLog: [],
    finalOutput: null,
    isPaused: false,
    selectedNpcIndex: null,
    npcScreenPositions: {},
    hoveredNpcIndex: null,
    hoveredPoiId: null,
    hoveredPoiLabel: null,
    hoverPosition: null,

    setAgentSet: (id) => set({ selectedAgentSetId: id }),
    setLlmConfig: (cfg) => set(s => ({ llmConfig: { ...s.llmConfig, ...cfg } })),
    setProjectBrief: (brief) => set({ projectBrief: brief }),
    setPhase: (phase) => set({ phase }),
    setPaused: (isPaused) => set({ isPaused }),
    setFinalOutput: (finalOutput) => set({ finalOutput, phase: 'done' }),
    setSelectedNpc: (index) => set({ selectedNpcIndex: index }),
    setNpcScreenPosition: (index, pos) =>
        set(s => ({ npcScreenPositions: { ...s.npcScreenPositions, [index]: pos } })),
    setHoveredNpc: (index, pos) => set({ hoveredNpcIndex: index, hoverPosition: pos }),
    setHoveredPoi: (id, label, pos) => set({ hoveredPoiId: id, hoveredPoiLabel: label, hoverPosition: pos }),

    addTask: (task) => set(s => ({ tasks: [...s.tasks, task] })),
    updateTask: (id, updates) =>
        set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) })),
    removeTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
    clearTasks: () => set({ tasks: [] }),

    setThought: (agentIndex, text) =>
        set(s => ({ thoughts: { ...s.thoughts, [agentIndex]: { agentIndex, text, timestamp: Date.now() } } })),
    clearThought: (agentIndex) =>
        set(s => { const t = { ...s.thoughts }; delete t[agentIndex]; return { thoughts: t }; }),

    addLogEntry: (entry) =>
        set(s => ({
            actionLog: [
                { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
                ...s.actionLog.slice(0, 49),
            ],
        })),

    reset: () => set({
        phase: 'idle', tasks: [], thoughts: {}, actionLog: [],
        finalOutput: null, isPaused: false, selectedNpcIndex: null,
        npcScreenPositions: {}, projectBrief: '',
    }),
}));
