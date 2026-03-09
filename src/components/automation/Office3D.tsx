"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function Office3D() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ── Renderer ──────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        mount.appendChild(renderer.domElement);

        // ── Scene ─────────────────────────────────────────────────────────────
        const scene = new THREE.Scene();

        // ── Camera ────────────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 200);
        camera.position.set(7, 5, 9);
        camera.lookAt(0, 1, 0);

        // ── Controls (slow auto-rotate) ───────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.target.set(0, 1, 0);

        // ── Lights ────────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xdce8ff, 1.8));
        const dirLight = new THREE.DirectionalLight(0xfff9f0, 2.0);
        dirLight.position.set(8, 12, 6);
        dirLight.castShadow = true;
        scene.add(dirLight);
        const deskLamp = new THREE.PointLight(0xffd580, 2.5, 10);
        deskLamp.position.set(2, 2, 2);
        scene.add(deskLamp);
        const screenGlow = new THREE.PointLight(0x80b0ff, 1.2, 8);
        screenGlow.position.set(-3, 2, -2);
        scene.add(screenGlow);

        // ── Load GLB ─────────────────────────────────────────────────────────
        const loader = new GLTFLoader();
        const clock = new THREE.Clock();
        let animFrameId = 0;

        loader.load("/models/office.glb", (gltf) => {
            const office = gltf.scene;
            const box = new THREE.Box3().setFromObject(office);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 8 / maxDim;
            office.scale.setScalar(scale);
            const newBox = new THREE.Box3().setFromObject(office);
            office.position.set(-center.x * scale, -newBox.min.y, -center.z * scale);
            office.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).receiveShadow = true;
                    (child as THREE.Mesh).castShadow = true;
                }
            });
            scene.add(office);
        });

        // ── Animation loop ────────────────────────────────────────────────────
        function animate() {
            animFrameId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();
            // Subtle camera drift
            camera.position.x = 7 + Math.sin(elapsed * 0.06) * 0.7;
            camera.position.y = 5 + Math.sin(elapsed * 0.05) * 0.25;
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // ── Resize ────────────────────────────────────────────────────────────
        const resizeObserver = new ResizeObserver(() => {
            if (!mount) return;
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        });
        resizeObserver.observe(mount);

        return () => {
            cancelAnimationFrame(animFrameId);
            resizeObserver.disconnect();
            controls.dispose();
            renderer.dispose();
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
    );
}
