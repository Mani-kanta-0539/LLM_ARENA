// ─────────────────────────────────────────────────────────────────────────────
// Agent Prompts — Adapted from The Delegation's agentPrompts.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentData, AgentSet } from './agent-types';
import type { AgentTask } from './agent-types';

export function buildOrchestratorPrompt(agentSet: AgentSet, projectBrief: string): string {
    const teamList = agentSet.agents
        .filter(a => !a.isPlayer)
        .filter(a => a.index !== 1) // exclude AM itself
        .map(a => `  - Agent ${a.index} (${a.role}, ${a.department}): ${a.mission}`)
        .join('\n');

    return `You are the ${agentSet.agents[1].role} at ${agentSet.companyName}, a ${agentSet.companyType}.
${agentSet.companyDescription}

YOUR ROLE: You are the central orchestrator. You receive a client brief and decompose it into specific, actionable tasks for your team.

YOUR TEAM:
${teamList}

CLIENT BRIEF: "${projectBrief}"

INSTRUCTIONS:
- Call propose_task() for each distinct work item you want a team member to execute.
- Assign tasks to specific agents using their index number.
- Each task should have a clear title and description.
- After proposing all tasks, call briefing_complete() to signal the work phase starts.
- Be concise. Max 5 tasks total.
- DO NOT do the work yourself — delegate everything.

Respond ONLY with function calls. No prose.`;
}

export function buildAgentWorkPrompt(agent: AgentData, agentSet: AgentSet, task: AgentTask, projectBrief: string): string {
    return `You are ${agent.role} (${agent.department}) at ${agentSet.companyName}.

YOUR MISSION: ${agent.mission}
YOUR PERSONALITY: ${agent.personality}
YOUR EXPERTISE: ${agent.expertise.join(', ')}

PROJECT BRIEF: "${projectBrief}"

YOUR ASSIGNED TASK:
Title: ${task.title}
Description: ${task.description}

INSTRUCTIONS:
- Do the work described in your task using your expertise.
- If you need client input or approval before proceeding, call request_client_approval() with a specific question.
- When your work is complete, call complete_task() with your output — make it detailed and useful.
- Be concise but thorough in your output (200-400 words).

Respond ONLY with function calls. No prose.`;
}

export function buildDeliveryPrompt(agentSet: AgentSet, taskOutputs: string, projectBrief: string): string {
    return `You are the ${agentSet.agents[1].role} at ${agentSet.companyName}.

PROJECT BRIEF: "${projectBrief}"

TEAM OUTPUTS:
${taskOutputs}

INSTRUCTIONS:
Assemble the final comprehensive deliverable for the client by combining all team outputs.
Then call notify_client_project_ready() with the complete assembled document.

Make the final output professional, well-structured, and ready to present to the client.`;
}

export function buildAgentResponsePrompt(agent: AgentData, agentSet: AgentSet, playerMessage: string): string {
    return `You are ${agent.role} (${agent.department}) at ${agentSet.companyName}.
YOUR MISSION: ${agent.mission}
YOUR PERSONALITY: ${agent.personality}

The client says: "${playerMessage}"

Respond in character, concisely (2-3 sentences). Stay in your role.`;
}

// Tool definitions for LLM function calling
export const ORCHESTRATOR_TOOLS = [
    {
        name: 'propose_task',
        description: 'Propose a task for a team member to execute',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Short task title (max 8 words)' },
                description: { type: 'string', description: 'Detailed task description and expected output' },
                assignedAgentIndex: { type: 'number', description: 'Agent index to assign this task to' },
            },
            required: ['title', 'description', 'assignedAgentIndex'],
        },
    },
    {
        name: 'briefing_complete',
        description: 'Signal that all tasks have been proposed and the team should start working',
        parameters: { type: 'object', properties: {}, required: [] },
    },
];

export const AGENT_WORK_TOOLS = [
    {
        name: 'complete_task',
        description: 'Mark the assigned task as complete and submit the work output',
        parameters: {
            type: 'object',
            properties: {
                output: { type: 'string', description: 'The complete work output for this task (200-400 words)' },
            },
            required: ['output'],
        },
    },
    {
        name: 'request_client_approval',
        description: 'Pause work and request client approval or input before proceeding',
        parameters: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Specific question or decision needed from the client' },
            },
            required: ['question'],
        },
    },
];

export const DELIVERY_TOOLS = [
    {
        name: 'notify_client_project_ready',
        description: 'Deliver the final assembled output to the client',
        parameters: {
            type: 'object',
            properties: {
                finalOutput: { type: 'string', description: 'Complete assembled deliverable for the client' },
            },
            required: ['finalOutput'],
        },
    },
];
