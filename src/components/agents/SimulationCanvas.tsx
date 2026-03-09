"use client";

import { useEffect, useRef } from "react";
import { useAgencyStore } from "@/lib/agent-store";
import { getAgentSet } from "@/lib/agent-sets";
import { AgentSceneManager } from "@/lib/agent-scene";

interface Props {
    sceneRef: React.MutableRefObject<AgentSceneManager | null>;
}

export function SimulationCanvas({ sceneRef }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { selectedAgentSetId, setNpcScreenPosition, setSelectedNpc, thoughts, selectedNpcIndex } = useAgencyStore();
    const agentSet = getAgentSet(selectedAgentSetId);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Create scene manager
        const manager = new AgentSceneManager(canvas, (event) => {
            if (event.type === "screenPositions" && event.positions) {
                Object.entries(event.positions).forEach(([idx, pos]) => {
                    setNpcScreenPosition(Number(idx), pos);
                });
            }
            if (event.type === "agentClick" && event.agentIndex !== undefined) {
                setSelectedNpc(event.agentIndex);
            }
        });

        sceneRef.current = manager;

        // Load assets
        const agentConfigs = agentSet.agents.map(a => ({
            index: a.index,
            color: a.color,
            role: a.role,
            isPlayer: a.isPlayer,
        }));

        manager.loadOffice("/models/office.glb").then(() => {
            return manager.loadCharacters("/models/character.glb", agentConfigs);
        }).then(() => {
            // Wander NPCs to random POIs initially
            agentConfigs.filter(a => !a.isPlayer).forEach((a, i) => {
                setTimeout(() => manager.moveAgentToRandomPOI(a.index), i * 600);
            });
        }).catch(err => {
            console.warn("[SimulationCanvas] Asset load:", err);
        });

        // Handle resize
        const observer = new ResizeObserver(() => {
            if (!container) return;
            manager.resize(container.clientWidth, container.clientHeight);
        });
        observer.observe(container);

        return () => {
            observer.disconnect();
            manager.dispose();
            sceneRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync thoughts and selected state to the 3D scene
    useEffect(() => {
        if (!sceneRef.current) return;
        agentSet.agents.filter(a => !a.isPlayer).forEach(a => {
            const t = thoughts[a.index];
            const isSelected = selectedNpcIndex === a.index;
            // Hide the floating thought bubble if the agent is selected (because the inspector panel opens)
            sceneRef.current?.setAgentChat(a.index, (t && !isSelected) ? t.text : null);
        });
    }, [thoughts, selectedNpcIndex, agentSet.agents, sceneRef]);

    // Handle canvas click to select agent
    const handleCanvasClick = () => {
        // Click detection is handled in SceneManager via raycasting
        // For now, clicking on canvas deselects
    };

    return (
        <div ref={containerRef} className="absolute inset-0" onClick={handleCanvasClick}>
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: "block" }}
            />
        </div>
    );
}
