// ─────────────────────────────────────────────────────────────────────────────
// Agent Sets — Adapted from The Delegation's agents.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentSet, AgentData } from './agent-types';

export const PLAYER_INDEX = 0;
export const NPC_START_INDEX = 1;
export const DEFAULT_AGENT_SET_ID = 'marketing-agency';

export const AGENT_SETS: AgentSet[] = [
    // ── 1. Marketing Agency ───────────────────────────────────────
    {
        id: 'marketing-agency',
        companyName: 'LLM Arena Agency',
        companyType: 'Creative & Strategy Agency',
        companyDescription: 'A full-service creative agency covering branding, design, development and go-to-market strategy.',
        color: '#4387E2',
        agents: [
            {
                index: 0, department: 'Client', role: 'Client', emoji: '🧑‍💼',
                expertise: ['Vision', 'Idea', 'Requirements'],
                mission: 'Obtain a solid and viable proposal for my business idea.',
                personality: 'Demanding but open to professional suggestions.',
                isPlayer: true, color: '#7EACEA',
            },
            {
                index: 1, department: 'Coordination', role: 'Account Manager', emoji: '📋',
                expertise: ['Orchestration', 'Project Management', 'Communication'],
                mission: "Break down the client's request into actionable missions for the team.",
                personality: 'Organized, efficient, and central orchestrator.',
                isPlayer: false, color: '#4387E2',
            },
            {
                index: 2, department: 'UX/UI', role: 'Designer', emoji: '🎨',
                expertise: ['UI/UX', 'Aesthetics', 'Branding'],
                mission: 'Ensure the aesthetics and user experience are exceptional.',
                personality: 'Creative, detail-oriented, and focused on visual harmony.',
                isPlayer: false, color: '#eab308',
            },
            {
                index: 3, department: 'Engineering', role: 'Developer', emoji: '💻',
                expertise: ['Architecture', 'Technical Feasibility', 'Tech Stack'],
                mission: 'Evaluate technical feasibility and define the necessary architecture.',
                personality: 'Pragmatic, technical, and focused on robustness.',
                isPlayer: false, color: '#22c55e',
            },
            {
                index: 4, department: 'Marketing', role: 'Marketing Expert', emoji: '📣',
                expertise: ['Market Analysis', 'Target Audience', 'Narrative'],
                mission: 'Analyze the target audience and build the sales narrative.',
                personality: 'Strategic, persuasive, and market-savvy.',
                isPlayer: false, color: '#EF52BA',
            },
            {
                index: 5, department: 'Business', role: 'Sales Lead', emoji: '💰',
                expertise: ['Profitability', 'Business Viability', 'Sales'],
                mission: 'Act as the final filter, ensuring the plan is profitable and viable.',
                personality: 'Critical, realistic, and focused on return on investment.',
                isPlayer: false, color: '#ef4444',
            },
        ],
    },

    // ── 2. Game Studio ────────────────────────────────────────────
    {
        id: 'game-studio',
        companyName: 'Pixel Forge Studio',
        companyType: 'Indie Game Development Studio',
        companyDescription: 'A fresh indie game studio focused on innovative gameplay mechanics and immersive worlds.',
        color: '#a855f7',
        agents: [
            {
                index: 0, department: 'Client', role: 'Publisher', emoji: '🎮',
                expertise: ['Game Concepts', 'Market Trends', 'Budget'],
                mission: 'Commission a compelling game concept that will sell.',
                personality: 'Results-focused but excited about creativity.',
                isPlayer: true, color: '#c084fc',
            },
            {
                index: 1, department: 'Production', role: 'Producer', emoji: '🎬',
                expertise: ['Orchestration', 'Scoping', 'Timeline'],
                mission: 'Coordinate the team to produce a solid game design document.',
                personality: 'Calm, structured, balances creativity with deadlines.',
                isPlayer: false, color: '#a855f7',
            },
            {
                index: 2, department: 'Design', role: 'Game Designer', emoji: '🕹️',
                expertise: ['Game Mechanics', 'Player Experience', 'Systems Design'],
                mission: 'Design the core gameplay loops and player experience.',
                personality: 'Creative, player-centric, loves emergent gameplay.',
                isPlayer: false, color: '#f59e0b',
            },
            {
                index: 3, department: 'Engineering', role: 'Lead Programmer', emoji: '⚙️',
                expertise: ['Game Engine', 'Performance', 'Technical Design'],
                mission: 'Define the technical architecture and engine requirements.',
                personality: 'Precise, performance-obsessed, practical.',
                isPlayer: false, color: '#10b981',
            },
            {
                index: 4, department: 'Art', role: 'Art Director', emoji: '🖼️',
                expertise: ['Visual Style', 'Character Design', 'World Art'],
                mission: 'Define the visual identity and art direction of the game.',
                personality: 'Visionary, detail-obsessed, passionate about aesthetics.',
                isPlayer: false, color: '#f43f5e',
            },
        ],
    },

    // ── 3. Research Lab ───────────────────────────────────────────
    {
        id: 'research-lab',
        companyName: 'Neural Research Institute',
        companyType: 'AI Research Laboratory',
        companyDescription: 'A cutting-edge research lab exploring the frontiers of artificial intelligence and machine learning.',
        color: '#06b6d4',
        agents: [
            {
                index: 0, department: 'Sponsor', role: 'Research Sponsor', emoji: '🔬',
                expertise: ['Research Questions', 'Funding Goals', 'Impact'],
                mission: 'Commission impactful AI research that advances the field.',
                personality: 'Curious, ambitious, and quality-focused.',
                isPlayer: true, color: '#67e8f9',
            },
            {
                index: 1, department: 'Coordination', role: 'Research Lead', emoji: '🧠',
                expertise: ['Research Direction', 'Team Coordination', 'Methodology'],
                mission: 'Decompose the research question into parallel investigations.',
                personality: 'Methodical, rigorous, encourages deep thinking.',
                isPlayer: false, color: '#06b6d4',
            },
            {
                index: 2, department: 'Analysis', role: 'Data Scientist', emoji: '📊',
                expertise: ['Data Analysis', 'Statistics', 'Experimentation'],
                mission: 'Conduct quantitative analysis and validate hypotheses with data.',
                personality: 'Data-driven, skeptical, loves patterns.',
                isPlayer: false, color: '#8b5cf6',
            },
            {
                index: 3, department: 'Writing', role: 'Research Writer', emoji: '✍️',
                expertise: ['Academic Writing', 'Clarity', 'Literature Review'],
                mission: 'Synthesize findings into clear, publishable research sections.',
                personality: 'Articulate, precise, bridges technical and accessible.',
                isPlayer: false, color: '#f59e0b',
            },
            {
                index: 4, department: 'Review', role: 'Peer Reviewer', emoji: '🧪',
                expertise: ['Critical Analysis', 'Quality Assurance', 'Logic Checking'],
                mission: 'Challenge assumptions and ensure scientific rigor.',
                personality: 'Critical but constructive, focused on reproducibility.',
                isPlayer: false, color: '#ef4444',
            },
        ],
    },
];

export function getAgentSet(id: string): AgentSet {
    return AGENT_SETS.find(s => s.id === id) ?? AGENT_SETS[0];
}

export function getAgent(setId: string, agentIndex: number): AgentData | undefined {
    return getAgentSet(setId).agents.find(a => a.index === agentIndex);
}
