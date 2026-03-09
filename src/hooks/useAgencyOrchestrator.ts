"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useAgencyOrchestrator — Multi-agent LLM coordination hook
// Adapted from The Delegation's useAgencyOrchestrator.ts
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback } from 'react';
import { useAgencyStore } from '@/lib/agent-store';
import { getAgentSet } from '@/lib/agent-sets';
import {
    buildOrchestratorPrompt,
    buildAgentWorkPrompt,
    buildDeliveryPrompt,
    ORCHESTRATOR_TOOLS,
    AGENT_WORK_TOOLS,
    DELIVERY_TOOLS,
} from '@/lib/agent-prompts';
import type { AgentTask } from '@/lib/agent-types';

const ORCHESTRATOR_INDEX = 1;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

interface FunctionCall {
    name: string;
    args: Record<string, unknown>;
}

interface LLMResponse {
    text: string | null;
    functionCalls: FunctionCall[];
}

export function useAgencyOrchestrator() {
    const runningAgents = useRef(new Set<number>());
    const abortRef = useRef<boolean>(false);

    // ── Core LLM call via our API route ────────────────────────────────────────
    const callLLM = useCallback(async (
        messages: Array<{ role: string; content: string }>,
        tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>,
    ): Promise<LLMResponse> => {
        const { llmConfig } = useAgencyStore.getState();

        const res = await fetch('/api/agents/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: llmConfig.provider,
                model: llmConfig.model,
                apiKey: llmConfig.apiKey,
                messages,
                tools,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`LLM API error: ${err}`);
        }

        return res.json();
    }, []);

    // ── Process a function call from Orchestrator ──────────────────────────────
    const processOrchestratorFn = useCallback((fn: FunctionCall, sceneRef: React.MutableRefObject<unknown>) => {
        const store = useAgencyStore.getState();

        if (fn.name === 'propose_task') {
            const { title, description, assignedAgentIndex } = fn.args as {
                title: string; description: string; assignedAgentIndex: number;
            };
            const task: AgentTask = {
                id: crypto.randomUUID(),
                title,
                description,
                assignedAgentIds: [assignedAgentIndex],
                status: 'todo',
                createdAt: Date.now(),
            };
            store.addTask(task);
            store.addLogEntry({
                agentIndex: ORCHESTRATOR_INDEX,
                toolName: 'propose_task',
                summary: `→ Agent ${assignedAgentIndex}: "${title}"`,
                type: 'propose',
            });
            return task;
        }

        if (fn.name === 'briefing_complete') {
            store.setPhase('working');
            store.addLogEntry({
                agentIndex: ORCHESTRATOR_INDEX,
                toolName: 'briefing_complete',
                summary: 'Team briefed — starting work',
                type: 'message',
            });
        }

        return null;
    }, []);

    // ── Process a function call from an Agent ──────────────────────────────────
    const processAgentFn = useCallback((fn: FunctionCall, taskId: string, agentIndex: number) => {
        const store = useAgencyStore.getState();

        if (fn.name === 'complete_task') {
            const { output } = fn.args as { output: string };
            store.updateTask(taskId, { status: 'done', output });
            store.clearThought(agentIndex);
            runningAgents.current.delete(agentIndex);
            store.addLogEntry({
                agentIndex,
                toolName: 'complete_task',
                summary: `Task completed (${output.length} chars)`,
                type: 'complete',
            });
            return true;
        }

        if (fn.name === 'request_client_approval') {
            const { question } = fn.args as { question: string };
            store.updateTask(taskId, { status: 'on_hold' });
            store.setThought(agentIndex, `⏸️ Needs approval: ${question}`);
            runningAgents.current.delete(agentIndex);
            store.addLogEntry({
                agentIndex,
                toolName: 'request_client_approval',
                summary: question,
                type: 'approval',
            });
            return true;
        }

        return false;
    }, []);

    // ── Run the Orchestrator to decompose the brief ────────────────────────────
    const startProject = useCallback(async (brief: string, sceneRef: React.MutableRefObject<unknown>) => {
        if (abortRef.current) return;
        const store = useAgencyStore.getState();
        const agentSet = getAgentSet(store.selectedAgentSetId);

        store.setProjectBrief(brief);
        store.setPhase('briefing');
        store.clearTasks();
        runningAgents.current.add(ORCHESTRATOR_INDEX);

        store.setThought(ORCHESTRATOR_INDEX, '📋 Reviewing project brief...');

        try {
            const systemPrompt = buildOrchestratorPrompt(agentSet, brief);
            const response = await callLLM(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: brief },
                ],
                ORCHESTRATOR_TOOLS,
            );

            store.clearThought(ORCHESTRATOR_INDEX);

            if (response.functionCalls?.length) {
                const proposedTasks: AgentTask[] = [];
                for (const fn of response.functionCalls) {
                    const task = processOrchestratorFn(fn, sceneRef);
                    if (task) proposedTasks.push(task);
                }

                // Dispatch work after brief delay (let Kanban render)
                await sleep(1500);
                const currentTasks = useAgencyStore.getState().tasks;
                for (const task of currentTasks) {
                    if (task.assignedAgentIds.length > 0) {
                        const agentIdx = task.assignedAgentIds[0];
                        // Small stagger between agent starts
                        setTimeout(() => {
                            runSingleAgentTask(task.id, agentIdx, sceneRef);
                        }, randomBetween(500, 2000));
                    }
                }
            } else {
                // Fallback: extract tasks from text if no function calls
                store.setPhase('working');
            }
        } catch (err) {
            console.error('[Orchestrator] error:', err);
            store.setThought(ORCHESTRATOR_INDEX, `❌ Error: ${(err as Error).message}`);
        } finally {
            runningAgents.current.delete(ORCHESTRATOR_INDEX);
        }
    }, [callLLM, processOrchestratorFn]);

    // ── Run a single agent on their task ─────────────────────────────────────
    const runSingleAgentTask = useCallback(async (
        taskId: string,
        agentIndex: number,
        sceneRef: React.MutableRefObject<unknown>,
    ) => {
        if (abortRef.current) return;
        if (runningAgents.current.has(agentIndex)) return;
        runningAgents.current.add(agentIndex);

        const store = useAgencyStore.getState();
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) { runningAgents.current.delete(agentIndex); return; }

        const agentSet = getAgentSet(store.selectedAgentSetId);
        const agentData = agentSet.agents.find(a => a.index === agentIndex);
        if (!agentData) { runningAgents.current.delete(agentIndex); return; }

        // Update task status
        store.updateTask(taskId, { status: 'in_progress' });
        store.setThought(agentIndex, `🔍 Working on: ${task.title}...`);

        // Move agent to a desk in 3D scene
        const sceneManager = (sceneRef as React.MutableRefObject<{ moveAgentToDesk?: (idx: number) => Promise<void>; setAgentState?: (idx: number, state: string) => void }>).current;
        if (sceneManager?.moveAgentToDesk) {
            await sceneManager.moveAgentToDesk(agentIndex);
        }
        if (sceneManager?.setAgentState) {
            sceneManager.setAgentState(agentIndex, 'sit_work');
        }

        await sleep(randomBetween(800, 1500));

        try {
            const systemPrompt = buildAgentWorkPrompt(agentData, agentSet, task, store.projectBrief);
            const response = await callLLM(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Please complete your assigned task: ${task.title}` },
                ],
                AGENT_WORK_TOOLS,
            );

            if (response.functionCalls?.length) {
                for (const fn of response.functionCalls) {
                    processAgentFn(fn, taskId, agentIndex);
                }
            }
        } catch (err) {
            console.error(`[Agent ${agentIndex}] error:`, err);
            store.setThought(agentIndex, `❌ Error: ${(err as Error).message}`);
            store.updateTask(taskId, { status: 'todo' });
            runningAgents.current.delete(agentIndex);
        }

        // Return to idle after work
        if (sceneManager?.setAgentState) {
            sceneManager.setAgentState(agentIndex, 'idle');
        }

        // Check if all done
        checkAllTasksDone(sceneRef);
    }, [callLLM, processAgentFn]);

    // ── Check if all tasks complete → deliver ────────────────────────────────
    const checkAllTasksDone = useCallback(async (sceneRef: React.MutableRefObject<unknown>) => {
        if (abortRef.current) return;
        const store = useAgencyStore.getState();
        if (store.phase !== 'working') return;
        if (store.finalOutput) return;

        const allDone = store.tasks.length > 0 && store.tasks.every(t => t.status === 'done');
        if (!allDone) return;
        if (runningAgents.current.has(ORCHESTRATOR_INDEX)) return;

        runningAgents.current.add(ORCHESTRATOR_INDEX);
        store.setPhase('delivering');
        store.setThought(ORCHESTRATOR_INDEX, '📦 Assembling final deliverable...');

        try {
            const taskOutputs = store.tasks
                .filter(t => t.output)
                .map(t => `[${t.title}]\n${t.output}`)
                .join('\n\n---\n\n');

            const agentSet = getAgentSet(store.selectedAgentSetId);
            const systemPrompt = buildDeliveryPrompt(agentSet, taskOutputs, store.projectBrief);

            const response = await callLLM(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Please assemble and deliver the final output.' },
                ],
                DELIVERY_TOOLS,
            );

            if (response.functionCalls?.length) {
                for (const fn of response.functionCalls) {
                    if (fn.name === 'notify_client_project_ready') {
                        const { finalOutput } = fn.args as { finalOutput: string };
                        store.setFinalOutput(finalOutput);
                        store.addLogEntry({
                            agentIndex: ORCHESTRATOR_INDEX,
                            toolName: 'notify_client_project_ready',
                            summary: 'Project delivered to client!',
                            type: 'deliver',
                        });
                    }
                }
            } else if (response.text) {
                store.setFinalOutput(response.text);
            }
        } catch (err) {
            console.error('[Delivery] error:', err);
        } finally {
            store.clearThought(ORCHESTRATOR_INDEX);
            runningAgents.current.delete(ORCHESTRATOR_INDEX);
        }
    }, [callLLM]);

    // ── Approve a task on hold ────────────────────────────────────────────────
    const approveTask = useCallback((taskId: string, sceneRef: React.MutableRefObject<unknown>) => {
        const store = useAgencyStore.getState();
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) return;

        store.updateTask(taskId, { status: 'todo' });
        const agentIdx = task.assignedAgentIds[0];
        if (agentIdx) {
            setTimeout(() => runSingleAgentTask(taskId, agentIdx, sceneRef), 500);
        }
    }, [runSingleAgentTask]);

    const stopAll = useCallback(() => {
        abortRef.current = true;
        useAgencyStore.getState().setPhase('idle');
        runningAgents.current.clear();
    }, []);

    const reset = useCallback(() => {
        abortRef.current = false;
        runningAgents.current.clear();
        useAgencyStore.getState().reset();
    }, []);

    return { startProject, approveTask, stopAll, reset };
}
