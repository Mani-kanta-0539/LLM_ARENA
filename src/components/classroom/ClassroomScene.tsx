"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassroomSceneProps {
    isTeaching: boolean;
    activeRole: "teacher" | "student" | null;
    onTeacherClick?: () => void;
    teacherColor?: string;
    studentColors?: string[];
    teacherName?: string;
    studentName?: string;
    agentChats?: { teacher?: string; student?: string };
}

// ─── NavMesh: walkable bounds ─────────────────────────────────────────────────
const NAV_BOUNDS = { minX: -4.5, maxX: 4.5, minZ: -3.5, maxZ: 3.5 };

// ─── Points of Interest ───────────────────────────────────────────────────────
const STUDENT_POIS: THREE.Vector3[] = [
    new THREE.Vector3(-3.5, 0, 1.5),   // seat left front
    new THREE.Vector3(-1.5, 0, 1.5),   // seat center-left
    new THREE.Vector3(1.5, 0, 1.5),    // seat center-right
    new THREE.Vector3(3.5, 0, 1.5),    // seat right front
    new THREE.Vector3(-3.5, 0, 0.0),   // seat left mid
    new THREE.Vector3(3.5, 0, 0.0),    // seat right mid
    new THREE.Vector3(-3.0, 0, -1.5),  // seat back left
    new THREE.Vector3(0.0, 0, -1.5),   // seat back center
    new THREE.Vector3(3.0, 0, -1.5),   // seat back right
];

const TEACHER_POS = new THREE.Vector3(0, 0, 3.0); // front of class, near board

// ─── Agent helper ─────────────────────────────────────────────────────────────
interface Agent {
    group: THREE.Group;
    mixer: THREE.AnimationMixer | null;
    idleAction: THREE.AnimationAction | null;
    walkAction: THREE.AnimationAction | null;
    target: THREE.Vector3;
    isMoving: boolean;
    speed: number;
    nextMoveTime: number;
    ring: THREE.Mesh;
    chatBubble: HTMLDivElement;
    chatTextNode: HTMLDivElement;
    labelPill: HTMLDivElement;
    isTeacher: boolean;
}

function randomPoi(exclude?: THREE.Vector3): THREE.Vector3 {
    const candidates = STUDENT_POIS.filter(p => !exclude || p.distanceTo(exclude) > 1.0);
    return candidates[Math.floor(Math.random() * candidates.length)].clone();
}

function randomInBounds(): THREE.Vector3 {
    return new THREE.Vector3(
        NAV_BOUNDS.minX + Math.random() * (NAV_BOUNDS.maxX - NAV_BOUNDS.minX),
        0,
        NAV_BOUNDS.minZ + Math.random() * (NAV_BOUNDS.maxZ - NAV_BOUNDS.minZ),
    );
}

function clampToBounds(v: THREE.Vector3): THREE.Vector3 {
    v.x = Math.max(NAV_BOUNDS.minX, Math.min(NAV_BOUNDS.maxX, v.x));
    v.z = Math.max(NAV_BOUNDS.minZ, Math.min(NAV_BOUNDS.maxZ, v.z));
    return v;
}

export default function ClassroomScene({
    isTeaching,
    activeRole,
    onTeacherClick,
    teacherColor = "#f59e0b",
    studentColors = ["#6366f1", "#10b981", "#ec4899"],
    teacherName = "Teacher",
    studentName = "Student",
    agentChats = {},
}: ClassroomSceneProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const isTeachingRef = useRef(isTeaching);
    const onTeacherClickRef = useRef(onTeacherClick);
    const teacherAgentRef = useRef<Agent | null>(null);
    const studentAgentsRef = useRef<Agent[]>([]);
    const activeRoleRef = useRef(activeRole);
    const agentChatsRef = useRef(agentChats);

    // Keep refs fresh without remounting
    useEffect(() => { isTeachingRef.current = isTeaching; }, [isTeaching]);
    useEffect(() => { onTeacherClickRef.current = onTeacherClick; }, [onTeacherClick]);
    useEffect(() => { activeRoleRef.current = activeRole; }, [activeRole]);
    useEffect(() => { agentChatsRef.current = agentChats; }, [agentChats]);

    // Sync ring visibility + bob behavior when activeRole changes
    useEffect(() => {
        const teacher = teacherAgentRef.current;
        if (teacher) {
            teacher.ring.visible = activeRole === "teacher";
        }
    }, [activeRole]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ── Renderer ──────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.domElement.style.height = "100%";
        mount.appendChild(renderer.domElement);

        // ── CSS2D Renderer ────────────────────────────────────────────────────
        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(mount.clientWidth, mount.clientHeight);
        labelRenderer.domElement.style.position = "absolute";
        labelRenderer.domElement.style.top = "0px";
        labelRenderer.domElement.style.pointerEvents = "none";
        mount.appendChild(labelRenderer.domElement);

        // ── Scene ─────────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#fafafa");
        scene.fog = new THREE.Fog("#fafafa", 18, 55);

        // ── Camera ────────────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(
            50, mount.clientWidth / mount.clientHeight, 0.1, 200
        );
        camera.position.set(0, 5.5, 10);
        camera.lookAt(0, 1.0, 0);

        // ── Controls ──────────────────────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.minPolarAngle = Math.PI / 6;
        controls.maxPolarAngle = Math.PI / 2.2;
        controls.minDistance = 5;
        controls.maxDistance = 18;
        controls.target.set(0, 1.0, 0);

        // ── Lights ────────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 2.0));

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(5, 12, 7);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(2048, 2048);
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 40;
        sunLight.shadow.camera.left = -10;
        sunLight.shadow.camera.right = 10;
        sunLight.shadow.camera.top = 10;
        sunLight.shadow.camera.bottom = -10;
        sunLight.shadow.bias = -0.001;
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-5, 6, -4);
        scene.add(fillLight);

        // ── Helpers ───────────────────────────────────────────────────────────
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
        dracoLoader.preload();
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        const clock = new THREE.Clock();
        let animFrameId = 0;
        const raycaster = new THREE.Raycaster();
        const avoidRaycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let teacherMeshes: THREE.Object3D[] = [];
        const obstacleMeshes: THREE.Mesh[] = [];
        const Y_AXIS = new THREE.Vector3(0, 1, 0);

        function createGlowRing(color: string, inner = 0.3, outer = 0.55): THREE.Mesh {
            const geo = new THREE.RingGeometry(inner, outer, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.05;
            ring.visible = false;
            return ring;
        }

        function scaleToFit(obj: THREE.Object3D, targetSize: number) {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim === 0) return;
            const scale = targetSize / maxDim;
            obj.scale.setScalar(scale);
            const newBox = new THREE.Box3().setFromObject(obj);
            obj.position.set(-center.x * scale, -newBox.min.y, -center.z * scale);
        }

        // ── Load Classroom GLB then scan for safe floor positions ──────────────
        let safeClearSpots: THREE.Vector3[] = [];

        loader.load("/models/classroomj.glb", (gltf) => {
            const room = gltf.scene;
            room.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.receiveShadow = true;
                    mesh.castShadow = true;
                    if (mesh.material) {
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        mats.forEach((m) => {
                            if (m instanceof THREE.MeshStandardMaterial) m.envMapIntensity = 0.4;
                        });
                    }
                    // Collect non-floor meshes for obstacle avoidance
                    const wn = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
                    if (Math.abs(wn.y) < 0.85) obstacleMeshes.push(mesh);
                }
            });
            scaleToFit(room, 12);
            scene.add(room);

            // Force all world matrices to update so raycasts work correctly
            scene.updateMatrixWorld(true);

            // ── Grid scan: find clear floor spots (no furniture overhead) ────────
            const scanUp = new THREE.Raycaster();
            const upDir = new THREE.Vector3(0, 1, 0);
            const CHARACTER_HEIGHT = 1.8;

            for (let x = -5.5; x <= 5.5; x += 0.6) {
                for (let z = -5.5; z <= 5.5; z += 0.6) {
                    const origin = new THREE.Vector3(x, 0.05, z);
                    scanUp.set(origin, upDir);
                    scanUp.far = CHARACTER_HEIGHT;
                    const hits = scanUp.intersectObjects(obstacleMeshes, false);
                    if (hits.length === 0) {
                        // Also check laterally — not squeezed between walls
                        safeClearSpots.push(new THREE.Vector3(x, 0, z));
                    }
                }
            }

            // Sort by Z descending (higher Z = front of classroom near board)
            safeClearSpots.sort((a, b) => b.z - a.z);

            // ── Spawn Teacher at first (front-most) clear spot ───────────────────
            // Teacher is STATIC — placed at front, never moves
            const teacherCandidates = safeClearSpots.filter(p => p.z > 0);
            const teacherPos = teacherCandidates[0] ?? new THREE.Vector3(0, 0, 3);
            // Mark teacher spot as used
            safeClearSpots = safeClearSpots.filter(p => p.distanceTo(teacherPos) > 1.5);

            createAgent(teacherPos, Math.PI, teacherColor, true, teacherName, (agent) => {
                teacherAgentRef.current = agent;
                agent.ring.visible = activeRoleRef.current === "teacher";
            });

            // ── Spawn 3 students at spread-out clear spots ───────────────────────
            // Pick 3 spots spread across the room (left, center, right aisle areas)
            const studentPickSpots: THREE.Vector3[] = [];
            // Pick spots that are spread at least 2 units from each other
            for (const spot of safeClearSpots) {
                if (studentPickSpots.every(s => s.distanceTo(spot) > 2.0)) {
                    studentPickSpots.push(spot);
                    if (studentPickSpots.length === 3) break;
                }
            }
            // Fallback if not enough spread spots
            while (studentPickSpots.length < 3) {
                studentPickSpots.push(new THREE.Vector3(
                    (studentPickSpots.length - 1) * 2.5, 0, -1
                ));
            }

            studentPickSpots.forEach((pos, idx) => {
                createAgent(pos.clone(), 0, studentColors[idx] ?? "#8888ff", false, studentName, (agent) => {
                    studentAgentsRef.current.push(agent);
                });
            });
        });
        // ── Create Character helper ───────────────────────────────────────────
        function createAgent(
            position: THREE.Vector3,
            rotY: number,
            color: string,
            isTeacher: boolean,
            name: string,
            onLoaded: (agent: Agent) => void
        ) {
            loader.load("/models/character.glb", (gltf) => {
                const char = gltf.scene;
                char.position.copy(position);
                char.rotation.y = rotY;
                char.scale.setScalar(isTeacher ? 1.0 : 0.88);

                // Vivid solid color on body, preserve face features
                const faceKw = ['eye', 'mouth', 'teeth', 'tongue', 'brow', 'pupil', 'iris', 'lip'];
                char.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        const nameLow = mesh.name.toLowerCase();
                        if (!faceKw.some(kw => nameLow.includes(kw))) {
                            mesh.material = new THREE.MeshStandardMaterial({
                                color: new THREE.Color(color),
                                roughness: 0.6, metalness: 0.0,
                            });
                        }
                    }
                });

                scene.add(char);

                // Label (inline styles — no Tailwind in DOM inject)
                const labelDiv = document.createElement("div");
                labelDiv.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:none;";

                const pill = document.createElement("div");
                pill.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:#18181b;box-shadow:0 4px 16px rgba(0,0,0,0.3);cursor:pointer;pointer-events:auto;white-space:nowrap;`;
                pill.onclick = () => { if (isTeacher) onTeacherClickRef.current?.(); };
                pill.innerHTML = `
                    <div style="width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                    <span style="font-size:9px;font-weight:900;color:#fff;letter-spacing:0.08em;font-family:sans-serif;">${name}</span>
                    <span style="font-size:8px;color:#71717a;font-family:sans-serif;font-weight:600;">${isTeacher ? "TEACHER" : "STUDENT"}</span>
                `;

                const bubbleContainer = document.createElement("div");
                bubbleContainer.style.cssText = "position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);min-width:160px;max-width:240px;opacity:0;transition:opacity 0.3s;pointer-events:none;";
                const bubbleBubble = document.createElement("div");
                bubbleBubble.style.cssText = "background:white;color:#18181b;font-size:11px;padding:10px 14px;border-radius:16px 16px 16px 4px;box-shadow:0 4px 20px rgba(0,0,0,0.12);border:1px solid #e4e4e7;word-break:break-word;line-height:1.5;font-family:sans-serif;";
                bubbleContainer.appendChild(bubbleBubble);
                labelDiv.appendChild(bubbleContainer);
                labelDiv.appendChild(pill);

                const label = new CSS2DObject(labelDiv);
                label.position.set(0, isTeacher ? 2.5 : 2.2, 0);
                char.add(label);

                const ring = createGlowRing(color, isTeacher ? 0.35 : 0.28, isTeacher ? 0.62 : 0.5);
                char.add(ring);

                let mixer: THREE.AnimationMixer | null = null;
                let idleAction: THREE.AnimationAction | null = null;
                let walkAction: THREE.AnimationAction | null = null;

                if (gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(char);
                    const idle = gltf.animations.find(a => /idle|stand|breathe/i.test(a.name)) ?? gltf.animations[0];
                    const walk = gltf.animations.find(a => /walk|run|move/i.test(a.name));
                    idleAction = mixer.clipAction(idle);
                    idleAction.play();
                    if (walk) walkAction = mixer.clipAction(walk);
                }

                if (isTeacher) teacherMeshes = [char];

                onLoaded({
                    group: char,
                    mixer,
                    idleAction,
                    walkAction,
                    target: position.clone(),
                    isMoving: false,
                    // Teacher: speed=0, nextMoveTime=Infinity → NEVER moves
                    speed: isTeacher ? 0 : 1.2 + Math.random() * 0.5,
                    nextMoveTime: isTeacher ? Infinity : clock.elapsedTime + 2 + Math.random() * 3,
                    ring,
                    chatBubble: bubbleContainer,
                    chatTextNode: bubbleBubble,
                    labelPill: pill,
                    isTeacher,
                });
            });
        }

        // ── Click detection ───────────────────────────────────────────────────
        function onCanvasClick(e: MouseEvent) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            if (teacherMeshes.length > 0) {
                const hits = raycaster.intersectObjects(teacherMeshes, true);
                if (hits.length > 0) {
                    onTeacherClickRef.current?.();
                }
            }
        }
        renderer.domElement.addEventListener("click", onCanvasClick);

        // ── Cursor hint ───────────────────────────────────────────────────────
        function onMouseMove(e: MouseEvent) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            if (teacherMeshes.length > 0) {
                const hits = raycaster.intersectObjects(teacherMeshes, true);
                renderer.domElement.style.cursor = hits.length > 0 ? "pointer" : "default";
            }
        }
        renderer.domElement.addEventListener("mousemove", onMouseMove);

        // ── Three-ray obstacle steering ────────────────────────────────────────
        function steerAroundObstacles(desiredDir: THREE.Vector3, fromPos: THREE.Vector3): THREE.Vector3 {
            if (obstacleMeshes.length === 0) return desiredDir;
            const LOOK_AHEAD = 1.2;
            const origin = fromPos.clone();
            origin.y = 0.9;
            const rays = [
                desiredDir.clone(),
                desiredDir.clone().applyAxisAngle(Y_AXIS, Math.PI / 4.5),
                desiredDir.clone().applyAxisAngle(Y_AXIS, -Math.PI / 4.5),
                desiredDir.clone().applyAxisAngle(Y_AXIS, Math.PI / 2),
                desiredDir.clone().applyAxisAngle(Y_AXIS, -Math.PI / 2),
            ];
            for (const ray of rays) {
                avoidRaycaster.set(origin, ray);
                avoidRaycaster.far = LOOK_AHEAD;
                const hits = avoidRaycaster.intersectObjects(obstacleMeshes, false);
                if (hits.length === 0) return ray.clone().normalize();
            }
            // All blocked — use obstacle normal as fallback
            avoidRaycaster.set(origin, desiredDir);
            avoidRaycaster.far = LOOK_AHEAD;
            const fwd = avoidRaycaster.intersectObjects(obstacleMeshes, false);
            if (fwd.length > 0 && fwd[0].face) {
                const n = fwd[0].face.normal.clone().transformDirection(fwd[0].object.matrixWorld);
                n.y = 0; n.normalize();
                return n;
            }
            return desiredDir;
        }

        // ── NPC AI driver ─────────────────────────────────────────────────────
        const WALK_ARRIVE_THRESHOLD = 0.15;
        const _tmpDir = new THREE.Vector3();
        const _lookAtTarget = new THREE.Vector3();

        function updateAgent(agent: Agent, delta: number, elapsedTime: number) {
            if (agent.mixer) agent.mixer.update(delta);

            // Separation force to prevent overlapping
            const separation = new THREE.Vector3();
            let count = 0;
            for (const other of studentAgentsRef.current) {
                if (other !== agent) {
                    const dist = agent.group.position.distanceTo(other.group.position);
                    if (dist < 0.6) {
                        const push = agent.group.position.clone().sub(other.group.position).normalize().multiplyScalar(1.0 - dist / 0.6);
                        separation.add(push);
                        count++;
                    }
                }
            }
            if (count > 0) {
                separation.y = 0;
                agent.group.position.add(separation.multiplyScalar(delta * 2));
                clampToBounds(agent.group.position);
                agent.group.position.y = 0;
            }

            const teaching = isTeachingRef.current;

            if (teaching) {
                // Students face teacher
                _lookAtTarget.set(TEACHER_POS.x, agent.group.position.y, TEACHER_POS.z);
                agent.group.lookAt(_lookAtTarget);
                agent.isMoving = false;
                // Switch to idle if walking
                if (agent.idleAction && agent.walkAction?.isRunning()) {
                    agent.walkAction.fadeOut(0.3);
                    agent.idleAction.reset().fadeIn(0.3).play();
                }
                return;
            }

            // Wandering mode — pick a random validated clear spot
            if (!agent.isMoving && elapsedTime >= agent.nextMoveTime) {
                // Use scanned clear spots; fallback to clampToBounds random if none yet
                let nextTarget: THREE.Vector3;
                if (safeClearSpots.length > 0) {
                    const candidates = safeClearSpots.filter(p => p.distanceTo(agent.group.position) > 0.8);
                    const pick = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : safeClearSpots[0];
                    nextTarget = pick.clone();
                } else {
                    nextTarget = randomPoi(agent.group.position);
                    clampToBounds(nextTarget);
                }
                agent.target = nextTarget;
                agent.target.y = 0;
                agent.isMoving = true;

                if (agent.walkAction && agent.idleAction) {
                    agent.idleAction.fadeOut(0.3);
                    agent.walkAction.reset().fadeIn(0.3).play();
                }
            }

            if (agent.isMoving) {
                _tmpDir.subVectors(agent.target, agent.group.position);
                _tmpDir.y = 0;
                const dist = _tmpDir.length();

                if (dist < WALK_ARRIVE_THRESHOLD) {
                    agent.isMoving = false;
                    agent.nextMoveTime = elapsedTime + 2.5 + Math.random() * 4.5;
                    agent.group.position.copy(agent.target);
                    agent.group.position.y = 0;
                    if (agent.idleAction && agent.walkAction) {
                        agent.walkAction.fadeOut(0.3);
                        agent.idleAction.reset().fadeIn(0.3).play();
                    }
                } else {
                    // Move towards target with obstacle steering
                    _tmpDir.normalize();
                    const steerDir = steerAroundObstacles(_tmpDir, agent.group.position);
                    agent.group.position.addScaledVector(steerDir, agent.speed * delta);
                    // Clamp to walkable bounds (safety net)
                    agent.group.position.x = Math.max(-3.5, Math.min(3.5, agent.group.position.x));
                    agent.group.position.z = Math.max(-3.0, Math.min(3.0, agent.group.position.z));
                    agent.group.position.y = 0;
                    // Face direction of movement
                    const angle = Math.atan2(steerDir.x, steerDir.z);
                    agent.group.rotation.y = THREE.MathUtils.lerp(
                        agent.group.rotation.y, angle, 0.12
                    );
                }
            }
        }

        // ── Teacher bob / glow ────────────────────────────────────────────────
        function updateTeacher(agent: Agent, elapsed: number, delta: number) {
            if (agent.mixer) agent.mixer.update(delta);
            const isSpeaking = activeRoleRef.current === "teacher";
            if (isSpeaking) {
                agent.group.position.y = Math.sin(elapsed * 7) * 0.03;
                agent.ring.visible = true;
                (agent.ring.material as THREE.MeshBasicMaterial).opacity =
                    0.5 + 0.4 * Math.sin(elapsed * 5);
                agent.labelPill.style.transform = "scale(1.1)";
                agent.labelPill.style.boxShadow = `0 0 15px ${teacherColor}`;
            } else {
                agent.group.position.y = Math.sin(elapsed * 1.4) * 0.008;
                agent.ring.visible = false;
                agent.labelPill.style.transform = "scale(1)";
                agent.labelPill.style.boxShadow = "none";
            }
        }

        // ── Animation loop ────────────────────────────────────────────────────
        function animate() {
            animFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsed = clock.elapsedTime;

            // Teacher
            const ta = teacherAgentRef.current;
            if (ta) {
                updateTeacher(ta, elapsed, delta);
                const tChat = agentChatsRef.current.teacher;
                if (tChat) {
                    ta.chatTextNode.innerText = tChat;
                    ta.chatBubble.style.opacity = "1";
                } else {
                    ta.chatBubble.style.opacity = "0";
                }
            }

            // Students
            const studentChat = agentChatsRef.current.student;
            for (let i = 0; i < studentAgentsRef.current.length; i++) {
                const sa = studentAgentsRef.current[i];
                updateAgent(sa, delta, elapsed);

                // Show student chat bubble only on the first student if student is speaking
                if (i === 0 && studentChat) {
                    sa.chatTextNode.innerText = studentChat;
                    sa.chatBubble.style.opacity = "1";
                    sa.labelPill.style.transform = "scale(1.1)";
                    sa.labelPill.style.boxShadow = `0 0 15px ${studentColors[0] || "#fff"}`;
                    sa.group.position.y = Math.sin(elapsed * 7) * 0.03;
                } else {
                    sa.chatBubble.style.opacity = "0";
                    sa.labelPill.style.transform = "scale(1)";
                    sa.labelPill.style.boxShadow = "none";
                    if (!sa.isMoving) sa.group.position.y = Math.sin(elapsed * 1.4) * 0.008;
                }
            }

            controls.update();
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        }
        animate();

        // ── Resize ────────────────────────────────────────────────────────────
        const resizeObserver = new ResizeObserver(() => {
            if (!mount) return;
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
            labelRenderer.setSize(mount.clientWidth, mount.clientHeight);
        });
        resizeObserver.observe(mount);

        return () => {
            cancelAnimationFrame(animFrameId);
            resizeObserver.disconnect();
            controls.dispose();
            renderer.domElement.removeEventListener("click", onCanvasClick);
            renderer.domElement.removeEventListener("mousemove", onMouseMove);
            dracoLoader.dispose();
            renderer.dispose();
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
            if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement);
            // Clean refs
            teacherAgentRef.current = null;
            studentAgentsRef.current = [];
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={mountRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
    );
}
