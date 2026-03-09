// ─────────────────────────────────────────────────────────────────────────────
// AI Agents Mode — Core Types (adapted from The Delegation)
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentData {
    index: number;
    department: string;
    role: string;
    expertise: string[];
    mission: string;
    personality: string;
    isPlayer: boolean;
    color: string;
    emoji: string;
}

export interface AgentSet {
    id: string;
    companyName: string;
    companyType: string;
    companyDescription: string;
    color: string;
    agents: AgentData[];
}

export interface AgentTask {
    id: string;
    title: string;
    description: string;
    assignedAgentIds: number[];
    status: 'todo' | 'in_progress' | 'on_hold' | 'done';
    output?: string;
    createdAt: number;
}

export interface AgentThought {
    agentIndex: number;
    text: string;
    timestamp: number;
}

export type AgencyPhase =
    | 'idle'
    | 'briefing'
    | 'working'
    | 'awaiting_approval'
    | 'delivering'
    | 'done';

export interface LLMAgentConfig {
    provider: string;
    model: string;
    apiKey: string;
}

// 3D character animation names (must match GLB clip names)
export enum AnimationName {
    IDLE = 'Idle',
    WALK = 'Walk',
    TALK = 'Talk',
    LISTEN = 'Listen',
    SIT_DOWN = 'Sit',
    SIT_IDLE = 'Sit_Idle',
    SIT_WORK = 'Sit_Work',
    LOOK_AROUND = 'LookAround',
    HAPPY = 'Happy',
    SAD = 'Sad',
    WAVE = 'Wave',
}

export enum AgentBehavior {
    IDLE = 0,
    GOTO = 1,
    SEATED = 2,
}

export type CharacterStateKey =
    | 'idle' | 'walk' | 'talk' | 'listen'
    | 'sit_down' | 'sit_idle' | 'sit_work'
    | 'look_around' | 'happy' | 'wave';
