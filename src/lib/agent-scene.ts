// ─────────────────────────────────────────────────────────────────────────────
// AgentSceneManager — Three.js scene for the Agents mode
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Pathfinding } from 'three-pathfinding';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentCharacter {
    index: number;
    group: THREE.Group;
    mixer: THREE.AnimationMixer;
    actions: Record<string, THREE.AnimationAction>;
    currentAction: string;
    targetPosition: THREE.Vector3 | null;
    isMoving: boolean;
    isSeated: boolean;
    color: string;
    chatBubble?: HTMLDivElement;
    chatTextNode?: HTMLDivElement;
    labelPill?: HTMLDivElement;
}

interface POI {
    id: string;
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    label: string;
    occupiedBy: number | null;
}

export type SceneEventCallback = (payload: {
    type: 'agentClick' | 'agentHover' | 'poiHover' | 'screenPositions';
    agentIndex?: number;
    poiId?: string;
    label?: string;
    screenPos?: { x: number; y: number };
    positions?: Record<number, { x: number; y: number }>;
}) => void;

// ── SceneManager ──────────────────────────────────────────────────────────────
export class AgentSceneManager {
    private renderer: THREE.WebGLRenderer;
    private labelRenderer: CSS2DRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;
    private clock = new THREE.Clock();
    private pathfinder = new Pathfinding();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private navMeshGroup: any = null;

    private characters: Map<number, AgentCharacter> = new Map();
    private pois: POI[] = [];
    private office: THREE.Group | null = null;
    private obstacleMeshes: THREE.Mesh[] = []; // env meshes used for ray-based avoidance
    private avoidanceRaycaster = new THREE.Raycaster();
    private _upDir = new THREE.Vector3(0, 1, 0);

    private animFrameId = 0;
    private isDisposed = false;
    private onEvent: SceneEventCallback;

    // POIs are in the central open walkway area — away from furniture around walls
    private static POI_POSITIONS: Array<{ id: string; pos: [number, number, number]; rot: number; label: string }> = [
        { id: 'spot-1', pos: [0.0, 0, 0.0], rot: 0, label: 'Center' },
        { id: 'spot-2', pos: [-1.5, 0, 0.0], rot: 0, label: 'Left' },
        { id: 'spot-3', pos: [1.5, 0, 0.0], rot: 0, label: 'Right' },
        { id: 'spot-4', pos: [0.0, 0, -1.5], rot: 0, label: 'Back' },
        { id: 'spot-5', pos: [0.0, 0, 1.5], rot: Math.PI, label: 'Front' },
        { id: 'spot-6', pos: [-1.5, 0, -1.5], rot: Math.PI / 4, label: 'Back-Left' },
        { id: 'spot-7', pos: [1.5, 0, -1.5], rot: -Math.PI / 4, label: 'Back-Right' },
        { id: 'spot-8', pos: [-1.5, 0, 1.5], rot: Math.PI * 0.75, label: 'Front-Left' },
        { id: 'spot-9', pos: [1.5, 0, 1.5], rot: Math.PI * 1.25, label: 'Front-Right' },
        { id: 'spot-10', pos: [0.0, 0, -2.5], rot: 0, label: 'Far Back' },
        { id: 'spot-11', pos: [0.0, 0, 2.5], rot: Math.PI, label: 'Far Front' },
        { id: 'spot-12', pos: [-2.5, 0, 0.0], rot: Math.PI / 2, label: 'Far Left' },
    ];

    constructor(canvas: HTMLCanvasElement, onEvent: SceneEventCallback) {
        this.onEvent = onEvent;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // CSS2D Renderer
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        canvas.parentElement?.appendChild(this.labelRenderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfafafa);
        this.scene.fog = new THREE.Fog(0xfafafa, 20, 60);

        // Camera
        this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        this.camera.position.set(0, 8, 14);
        this.camera.lookAt(0, 0, 0);

        // Controls
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.target.set(0, 0, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 25;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.update();

        // Lighting
        this.setupLighting();

        // POIs
        this.setupPOIs();

        // Floor (fallback)
        this.addFloor();

        // Start loop
        this.animate();
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 12, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        dirLight.shadow.bias = -0.001;
        this.scene.add(dirLight);

        // Fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-5, 8, -5);
        this.scene.add(fillLight);
    }

    private addFloor() {
        const geo = new THREE.PlaneGeometry(30, 30);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xf4f4f5,
            roughness: 0.9,
            metalness: 0.05,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(30, 30, 0xe4e4e7, 0xf4f4f5);
        this.scene.add(grid);
    }

    private setupPOIs() {
        AgentSceneManager.POI_POSITIONS.forEach(({ id, pos, rot, label }) => {
            const poi: POI = {
                id,
                position: new THREE.Vector3(...pos),
                quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)),
                label,
                occupiedBy: null,
            };
            this.pois.push(poi);
        });
    }

    // ── Load office model ─────────────────────────────────────────────────────
    async loadOffice(modelPath: string) {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        try {
            const gltf = await loader.loadAsync(modelPath);
            this.office = gltf.scene;

            // Scale and center
            const box = new THREE.Box3().setFromObject(this.office);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 10 / maxDim;
            this.office.scale.setScalar(scale);
            this.office.position.sub(center.multiplyScalar(scale));
            this.office.position.y = 0;

            this.office.traverse(obj => {
                if ((obj as THREE.Mesh).isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                    const mesh = obj as THREE.Mesh;
                    // Collect for obstacle avoidance — skip floor-like horizontal planes
                    const worldNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
                    const isFloor = Math.abs(worldNormal.y) > 0.85;
                    if (!isFloor) {
                        this.obstacleMeshes.push(mesh);
                    }
                }
            });
            this.scene.add(this.office);

            // Validate POIs: remove any that are inside furniture (downward ray hits furniture before floor)
            this.pois = this.pois.filter(poi => {
                const origin = poi.position.clone();
                origin.y = 2.5;
                this.avoidanceRaycaster.set(origin, new THREE.Vector3(0, -1, 0));
                this.avoidanceRaycaster.far = 3;
                const hits = this.avoidanceRaycaster.intersectObjects(this.obstacleMeshes, false);
                // Keep POI only if nothing is directly above it (i.e., it's in open space)
                return hits.length === 0;
            });

            // If too few POIs survive, keep originals (better than nothing)
            if (this.pois.length < 4) {
                this.setupPOIs();
            }

            // Try to extract navmesh
            this.office.traverse(obj => {
                if (obj.name.toLowerCase().includes('navmesh') || obj.name.toLowerCase().includes('nav_mesh')) {
                    const mesh = obj as THREE.Mesh;
                    this.pathfinder.setZoneData('level', Pathfinding.createZone(mesh.geometry));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.navMeshGroup = (this.pathfinder as any).getGroup('level', this.camera.position);
                    mesh.visible = false;
                }
            });
        } catch (e) {
            console.warn('[AgentScene] Could not load office model, using floor fallback:', e);
        }
    }

    // ── Load character GLB: load a fresh GLTF EACH agent to avoid skeleton cloning bugs ──
    async loadCharacters(modelPath: string, agentConfigs: Array<{ index: number; color: string; role: string; isPlayer: boolean }>) {
        const npcConfigs = agentConfigs.filter(a => !a.isPlayer);

        for (let i = 0; i < npcConfigs.length; i++) {
            const cfg = npcConfigs[i];
            try {
                const loader = new GLTFLoader();
                const dracoLoader = new DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                loader.setDRACOLoader(dracoLoader);

                const gltf = await loader.loadAsync(modelPath);
                this.spawnCharacterFromGLTF(cfg, i, gltf.scene, gltf.animations);
            } catch (e) {
                console.warn('[AgentScene] Failed to load character GLB, using fallback:', e);
                this.spawnFallbackCharacter(cfg, i);
            }
        }
    }

    // ── Spawn character from fresh GLTF load ──────────────────────────────────
    private spawnCharacterFromGLTF(
        cfg: { index: number; color: string; role: string; isPlayer: boolean },
        spawnOffset: number,
        gltfScene: THREE.Group,
        animations: THREE.AnimationClip[]
    ) {
        // Apply solid vivid color to BODY meshes only — preserve eyes/mouth/teeth
        const faceKeywords = ['eye', 'mouth', 'teeth', 'tongue', 'brow', 'pupil', 'iris', 'lip', 'beak'];
        gltfScene.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const nameLower = mesh.name.toLowerCase();
                const isFaceFeature = faceKeywords.some(kw => nameLower.includes(kw));

                if (!isFaceFeature) {
                    // Body — apply the agent's vivid solid color
                    mesh.material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(cfg.color),
                        roughness: 0.6,
                        metalness: 0.0,
                    });
                }
                // else: face features keep their original GLB material (eyes, mouth, etc.)
            }
        });

        // Scale character to ~1.8 units tall
        const box = new THREE.Box3().setFromObject(gltfScene);
        const h = box.getSize(new THREE.Vector3()).y;
        if (h > 0) gltfScene.scale.multiplyScalar(1.8 / h);

        // Spawn in a tight circle in the center (safe open area)
        const totalAgents = 8;
        const angle = (spawnOffset / totalAgents) * Math.PI * 2;
        const radius = 1.2;  // tight center spawn to avoid furniture
        gltfScene.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        gltfScene.lookAt(0, 0, 0);

        // HTML Overlay (Label + Chat Bubble) — using inline styles (no Tailwind in DOM inject)
        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none;';

        const pill = document.createElement('div');
        pill.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:#18181b;box-shadow:0 4px 16px rgba(0,0,0,0.35);cursor:pointer;pointer-events:auto;white-space:nowrap;user-select:none;';
        pill.onclick = () => { this.onEvent({ type: 'agentClick', agentIndex: cfg.index }); };
        const roleShort = cfg.role.split(/[-(]/)[0].trim().toUpperCase();
        pill.innerHTML = `
            <div style="width:7px;height:7px;border-radius:50%;background:${cfg.color};flex-shrink:0;"></div>
            <span style="font-size:9px;font-weight:900;color:#ffffff;letter-spacing:0.08em;font-family:sans-serif;">${roleShort}</span>
            <span style="font-size:8px;color:#71717a;font-family:sans-serif;font-weight:600;">AGENT</span>
        `;

        const bubbleContainer = document.createElement('div');
        bubbleContainer.style.cssText = 'position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);min-width:160px;max-width:240px;opacity:0;transition:opacity 0.3s ease;pointer-events:none;';
        const bubbleBubble = document.createElement('div');
        bubbleBubble.style.cssText = 'background:white;color:#18181b;font-size:11px;padding:10px 14px;border-radius:16px 16px 16px 4px;box-shadow:0 4px 20px rgba(0,0,0,0.12);border:1px solid #e4e4e7;word-break:break-word;line-height:1.5;font-family:sans-serif;';
        bubbleContainer.appendChild(bubbleBubble);

        labelDiv.appendChild(bubbleContainer);
        labelDiv.appendChild(pill);

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 2.2, 0);
        gltfScene.add(label);

        this.scene.add(gltfScene);

        // Animation mixer — target the gltfScene directly (has the skeleton)
        const mixer = new THREE.AnimationMixer(gltfScene);
        const actions: Record<string, THREE.AnimationAction> = {};

        animations.forEach(clip => {
            actions[clip.name] = mixer.clipAction(clip);
        });

        const character: AgentCharacter = {
            index: cfg.index,
            group: gltfScene,  // Use gltfScene as the "group" for position/rotation
            mixer,
            actions,
            currentAction: '',
            targetPosition: null,
            isMoving: false,
            isSeated: false,
            color: cfg.color,
            chatBubble: bubbleContainer,
            chatTextNode: bubbleBubble,
            labelPill: pill,
        };

        // Force-play Idle immediately
        this.playAnimation(character, 'Idle');
        this.characters.set(cfg.index, character);

        // Auto-wander with staggered start
        const startWander = () => {
            if (this.isDisposed) return;
            const char = this.characters.get(cfg.index);
            if (!char) return;
            this.moveAgentToRandomPOI(cfg.index);

            // After walking, wait idle time then wander again
            const walkDuration = 3000 + Math.random() * 4000;
            const idleDuration = 1500 + Math.random() * 3000;
            setTimeout(() => {
                if (!this.isDisposed) setTimeout(startWander, idleDuration);
            }, walkDuration);
        };
        setTimeout(startWander, spawnOffset * 800 + 300);
    }

    // Capsule fallback if GLB fails to load
    private spawnFallbackCharacter(
        cfg: { index: number; color: string; role: string; isPlayer: boolean },
        spawnOffset: number
    ) {
        const group = new THREE.Group();
        const geo = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: cfg.color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.9;
        mesh.castShadow = true;
        group.add(mesh);

        const angle = (spawnOffset / 8) * Math.PI * 2;
        group.position.set(Math.cos(angle) * 3.5, 0, Math.sin(angle) * 3.5);
        this.scene.add(group);

        const mixer = new THREE.AnimationMixer(group);
        const character: AgentCharacter = {
            index: cfg.index, group, mixer, actions: {},
            currentAction: '', targetPosition: null,
            isMoving: false, isSeated: false, color: cfg.color,
        };
        this.characters.set(cfg.index, character);
    }

    private playAnimation(char: AgentCharacter, name: string) {
        if (char.currentAction === name) return;

        const prev = char.actions[char.currentAction];
        const next = char.actions[name] ?? char.actions['Idle'];

        if (!next) { char.currentAction = name; return; }

        if (prev) prev.fadeOut(0.25);
        next.reset().setEffectiveWeight(1).fadeIn(0.25).play();
        char.currentAction = name;
    }

    // ── Public API ────────────────────────────────────────────────────────────
    moveAgentTo(agentIndex: number, targetPos: THREE.Vector3) {
        const char = this.characters.get(agentIndex);
        if (!char) return;
        char.targetPosition = targetPos.clone();
        char.isMoving = true;
        char.isSeated = false;
        this.playAnimation(char, 'Walk');
    }

    moveAgentToRandomPOI(agentIndex: number) {
        const freePois = this.pois.filter(p => p.occupiedBy === null || p.occupiedBy === agentIndex);
        if (!freePois.length) return;
        const poi = freePois[Math.floor(Math.random() * freePois.length)];
        this.pois.forEach(p => { if (p.occupiedBy === agentIndex) p.occupiedBy = null; });
        poi.occupiedBy = agentIndex;
        this.moveAgentTo(agentIndex, poi.position);
    }

    moveAgentToDesk(agentIndex: number): Promise<void> {
        return new Promise(resolve => {
            const deskPois = this.pois.filter(p => p.id.startsWith('desk-') && (p.occupiedBy === null || p.occupiedBy === agentIndex));
            if (!deskPois.length) { resolve(); return; }
            const poi = deskPois[0];
            this.pois.forEach(p => { if (p.occupiedBy === agentIndex) p.occupiedBy = null; });
            poi.occupiedBy = agentIndex;
            const char = this.characters.get(agentIndex);
            if (!char) { resolve(); return; }
            char.targetPosition = poi.position.clone();
            char.isMoving = true;
            this.playAnimation(char, 'Walk');
            const dist = char.group.position.distanceTo(poi.position);
            setTimeout(resolve, Math.max(1500, dist * 600));
        });
    }

    setAgentChat(agentIndex: number, text: string | null) {
        const char = this.characters.get(agentIndex);
        if (!char || !char.chatBubble || !char.chatTextNode) return;
        if (text) {
            char.chatTextNode.innerText = text;
            char.chatBubble.style.opacity = '1';
            if (char.labelPill) {
                char.labelPill.style.transform = 'scale(1.1) translateY(-4px)';
                char.labelPill.style.boxShadow = `0 12px 24px -6px ${char.color}60`;
            }
        } else {
            char.chatBubble.style.opacity = '0';
            if (char.labelPill) {
                char.labelPill.style.transform = 'scale(1)';
                char.labelPill.style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)';
            }
        }
    }

    setAgentState(agentIndex: number, state: 'idle' | 'walk' | 'talk' | 'sit_work' | 'wave' | 'happy') {
        const char = this.characters.get(agentIndex);
        if (!char) return;
        const animMap: Record<string, string> = {
            idle: 'Idle', walk: 'Walk', talk: 'Talk', sit_work: 'Sit_Work', wave: 'Wave', happy: 'Happy'
        };
        this.playAnimation(char, animMap[state] ?? 'Idle');
    }

    getAgentScreenPosition(agentIndex: number): { x: number; y: number } | null {
        const char = this.characters.get(agentIndex);
        if (!char) return null;
        const worldPos = new THREE.Vector3();
        char.group.getWorldPosition(worldPos);
        worldPos.y += 2.5;
        const projected = worldPos.project(this.camera);
        const canvas = this.renderer.domElement;
        return {
            x: (projected.x * 0.5 + 0.5) * canvas.clientWidth,
            y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
        };
    }

    // ── Three-ray steering: pick the clearest direction around obstacles ─────
    private steerAroundObstacles(desiredDir: THREE.Vector3, fromPos: THREE.Vector3): THREE.Vector3 {
        if (this.obstacleMeshes.length === 0) return desiredDir;

        const LOOK_AHEAD = 1.2;
        const origin = fromPos.clone();
        origin.y = 0.9; // torso height

        // Three candidate rays: straight, left 40°, right 40°
        const yAxis = this._upDir;
        const rays = [
            desiredDir.clone(),
            desiredDir.clone().applyAxisAngle(yAxis, Math.PI / 4.5),
            desiredDir.clone().applyAxisAngle(yAxis, -Math.PI / 4.5),
            desiredDir.clone().applyAxisAngle(yAxis, Math.PI / 2),
            desiredDir.clone().applyAxisAngle(yAxis, -Math.PI / 2),
        ];

        for (const ray of rays) {
            this.avoidanceRaycaster.set(origin, ray);
            this.avoidanceRaycaster.far = LOOK_AHEAD;
            const hits = this.avoidanceRaycaster.intersectObjects(this.obstacleMeshes, false);
            if (hits.length === 0) {
                return ray.clone().normalize();
            }
        }

        // All rays blocked — try backing away from nearest obstacle by going perpendicular
        this.avoidanceRaycaster.set(origin, desiredDir);
        this.avoidanceRaycaster.far = LOOK_AHEAD;
        const frontHits = this.avoidanceRaycaster.intersectObjects(this.obstacleMeshes, false);
        if (frontHits.length > 0 && frontHits[0].face) {
            const n = frontHits[0].face.normal.clone().transformDirection(frontHits[0].object.matrixWorld);
            n.y = 0;
            n.normalize();
            return n;
        }

        return desiredDir;
    }

    // ── Animate loop ──────────────────────────────────────────────────────────
    private animate() {
        if (this.isDisposed) return;
        this.animFrameId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        this.controls.update();

        const positions: Record<number, { x: number; y: number }> = {};
        this.characters.forEach((char) => {
            char.mixer.update(delta);
            this.updateMovement(char, delta);
            const sp = this.getAgentScreenPosition(char.index);
            if (sp) positions[char.index] = sp;
        });

        if (Object.keys(positions).length > 0) {
            this.onEvent({ type: 'screenPositions', positions });
        }

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    private updateMovement(char: AgentCharacter, delta: number) {
        if (!char.isMoving || !char.targetPosition) return;

        const speed = 2.0;
        const pos = char.group.position;
        const dir = char.targetPosition.clone().sub(pos);
        dir.y = 0;
        const dist = dir.length();

        if (dist < 0.18) {
            pos.copy(char.targetPosition);
            pos.y = 0;
            char.isMoving = false;
            char.targetPosition = null;
            this.playAnimation(char, 'Idle');
            return;
        }

        dir.normalize();

        // Steer around obstacles using three-ray look-ahead
        const steerDir = this.steerAroundObstacles(dir, pos);

        const angle = Math.atan2(steerDir.x, steerDir.z);
        char.group.rotation.y = angle;

        const step = steerDir.multiplyScalar(Math.min(speed * delta, dist));
        pos.add(step);
        pos.y = 0;
    }

    // ── Resize ────────────────────────────────────────────────────────────────
    resize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    dispose() {
        this.isDisposed = true;
        cancelAnimationFrame(this.animFrameId);
        this.controls.dispose();
        this.renderer.dispose();
        if (this.labelRenderer.domElement.parentElement) {
            this.labelRenderer.domElement.parentElement.removeChild(this.labelRenderer.domElement);
        }
    }
}
