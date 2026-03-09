"use client";

import { useEffect, useRef } from "react";
import type { LLMProvider } from "@/lib/llm-adapters";

// Provider → fighter color
const PROVIDER_COLORS: Record<string, number> = {
    openai: 0x10a37f,
    anthropic: 0xd4a27f,
    gemini: 0x4285f4,
    deepseek: 0x7b5ea7,
};

const BODY_HEIGHT = 20;
const HEAD_SIZE = 10;
const ARM_LEN = 8;
const LEG_LEN = 10;

// Debate phrases that float across the background like cinematic text
const DEBATE_PHRASES = [
    "LOGIC!", "FACTS.", "WHY?", "PROVE IT!", "EXACTLY!",
    "WRONG!", "INDEED.", "BUT...", "ACTUALLY,", "CONSIDER:",
    "DATA ▶", "SOURCE?", "FALSE!", "TRUE!", "DEBATE",
    "LLM ⚔", "AI WINS", "CHECKMATE", "STRONG ARG", "REBUTTAL:",
];

interface PhaserArenaProps {
    fighter1Provider: LLMProvider;
    fighter2Provider: LLMProvider;
    fighter1Name: string;
    fighter2Name: string;
    activeFighter: "fighter1" | "fighter2" | null;
    status: "idle" | "loading" | "running" | "done" | "error";
    winner?: string;
    backgroundImage?: string;
}

export default function PhaserArena({
    fighter1Provider,
    fighter2Provider,
    fighter1Name,
    fighter2Name,
    activeFighter,
    status,
    winner,
    backgroundImage,
}: PhaserArenaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<unknown>(null);
    const sceneRef = useRef<unknown>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let mounted = true;

        const initPhaser = async () => {
            const Phaser = (await import("phaser")).default;

            if (!mounted || !containerRef.current) return;

            // ── Scene class ───────────────────────────────────────────────────────────
            class DebateScene extends Phaser.Scene {
                private f1!: Phaser.GameObjects.Container;
                private f2!: Phaser.GameObjects.Container;
                private f1Image!: Phaser.GameObjects.Image;
                private f2Image!: Phaser.GameObjects.Image;
                private f1Label!: Phaser.GameObjects.Text;
                private f2Label!: Phaser.GameObjects.Text;
                private f1Bubble!: Phaser.GameObjects.Container;
                private f2Bubble!: Phaser.GameObjects.Container;
                private bgImage?: Phaser.GameObjects.Image;
                private bgOverlay!: Phaser.GameObjects.Graphics;
                private floor!: Phaser.GameObjects.Graphics;
                private armAngle = 0;
                private currentActive: "fighter1" | "fighter2" | null = null;

                constructor() { super({ key: "DebateScene" }); }

                preload() {
                    // Load custom background if provided, else load default
                    if (backgroundImage) {
                        this.load.image("arena-bg", backgroundImage);
                    } else {
                        this.load.image(
                            "arena-bg",
                            "/assets/Gemini_Generated_Image_kjsil6kjsil6kjsi.png"
                        );
                    }
                    const f1Img = "avatar4.png";
                    const f2Img = "avatar3.jpg";

                    this.load.image("avatar1", `/assets/${f1Img}`);
                    this.load.image("avatar2", `/assets/${f2Img}`);
                }

                create() {
                    const W = this.scale.width;
                    const H = this.scale.height;

                    // ── Background image ─────────────────────────────────────────────────
                    if (this.textures.exists("arena-bg")) {
                        this.bgImage = this.add.image(W / 2, H / 2, "arena-bg");
                        const scaleX = W / this.bgImage.width;
                        const scaleY = H / this.bgImage.height;
                        this.bgImage.setScale(Math.max(scaleX, scaleY)).setAlpha(0.95);
                    } else {
                        // Fallback gradient if image load fails
                        const fallback = this.add.graphics();
                        fallback.fillGradientStyle(0x080818, 0x080818, 0x0c0a38, 0x0c0a38, 1);
                        fallback.fillRect(0, 0, W, H);
                    }

                    // ── Very light tint overlay for fighter readability ─────────────────────
                    this.bgOverlay = this.add.graphics();
                    this.bgOverlay.fillStyle(0x020210, 0.15);
                    this.bgOverlay.fillRect(0, 0, W, H);

                    // ── Subtle grid overlay ───────────────────────────────────────────────
                    const grid = this.add.graphics();
                    grid.lineStyle(1, 0x2222aa, 0.08);
                    for (let x = 0; x < W; x += 40) grid.lineBetween(x, 0, x, H);
                    for (let y = 0; y < H; y += 30) grid.lineBetween(0, y, W, y);

                    // ── Floating debate phrase characters (REMOVED) ──────────────────────
                    // this.spawnPhrases(W, H);

                    // ── Floor platform ──────────────────────────────────────────────────
                    this.floor = this.add.graphics();
                    this.floor.fillStyle(0x0d0d2a, 0.92);
                    this.floor.fillRect(0, H - 28, W, 28);
                    this.floor.lineStyle(2, 0x4444cc, 0.9);
                    this.floor.lineBetween(0, H - 28, W, H - 28);
                    for (let x = 0; x < W; x += 32) {
                        this.floor.lineStyle(1, 0x333377, 0.4);
                        this.floor.lineBetween(x, H - 28, x, H);
                    }

                    // ── Name label style ─────────────────────────────────────────────────
                    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
                        fontFamily: "\"Orbitron\", monospace",
                        fontSize: "10px",
                        color: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 3,
                    };

                    // ── Fighter 1 (left) ────────────────────────────────────────────────
                    // Use 55% of canvas height for character size
                    const charH = Math.round(H * 0.58);
                    const charW = Math.round(charH * 0.75);
                    // Place y so character BOTTOM sits at floor line (H - 28)
                    const charY = H - 28 - charH;

                    this.f1 = this.add.container(-charW, charY);
                    this.f1Image = this.add.image(charW / 2, charH / 2, "avatar1");
                    this.f1Image.setDisplaySize(charW, charH);
                    this.f1.add(this.f1Image);
                    this.f1Label = this.add.text(charW / 2, -16, fighter1Name.toUpperCase(), {
                        ...textStyle,
                        color: `#${PROVIDER_COLORS[fighter1Provider].toString(16).padStart(6, "0")}`,
                        fontSize: "13px",
                    }).setOrigin(0.5);
                    this.f1.add(this.f1Label);

                    // ── Fighter 2 (right) ────────────────────────────────────────────────
                    this.f2 = this.add.container(W + charW, charY);
                    this.f2Image = this.add.image(charW / 2, charH / 2, "avatar2");
                    this.f2Image.setDisplaySize(charW, charH);
                    // Mirror f2 horizontally so it faces left (toward f1)
                    this.f2Image.setFlipX(true);
                    this.f2.add(this.f2Image);
                    this.f2Label = this.add.text(charW / 2, -16, fighter2Name.toUpperCase(), {
                        ...textStyle,
                        color: `#${(PROVIDER_COLORS[fighter2Provider] || 0xffffff).toString(16).padStart(6, "0")}`,
                        fontSize: "13px",
                    }).setOrigin(0.5);
                    this.f2.add(this.f2Label);

                    // Store base y for idle bob
                    (this.f1 as unknown as Record<string, number>)._baseY = charY;
                    (this.f2 as unknown as Record<string, number>)._baseY = charY;

                    // ── Speech bubble containers above each fighter ──────────────────────
                    this.f1Bubble = this.createSpeechBubble(0x4285f4);
                    this.f1Bubble.setVisible(false);
                    this.f1Bubble.setPosition(charW * 0.5, charY - 40);

                    this.f2Bubble = this.createSpeechBubble(0xff00ff);
                    this.f2Bubble.setVisible(false);
                    this.f2Bubble.setPosition(W - charW * 0.5, charY - 40);

                    // ── Walk-in tweens ──────────────────────────────────────────────────
                    this.tweens.add({ targets: this.f1, x: 20, duration: 1100, ease: "Cubic.easeOut", delay: 200 });
                    this.tweens.add({ targets: this.f2, x: W - charW - 20, duration: 1100, ease: "Cubic.easeOut", delay: 400 });

                    // ── Idle animation loop ──────────────────────────────────────────────
                    this.time.addEvent({ delay: 60, loop: true, callback: this.updateIdleAnims, callbackScope: this });

                    (window as unknown as Record<string, unknown>).__phaserScene = this;
                    sceneRef.current = this;
                }

                // Spawn floating debate phrase characters that drift across the arena
                private spawnPhrases(W: number, H: number) {
                    const phraseColors = [
                        "#ff00ff", "#00ffff", "#9900ff", "#00ff99",
                        "#ff6090", "#ffcc00", "#0099ff", "#ff4444",
                        "#ffffff", "#aaffee",
                    ];

                    DEBATE_PHRASES.forEach((phrase, i) => {
                        const startY = Phaser.Math.Between(10, H - 40);
                        const startX = Phaser.Math.Between(-W * 0.8, -10);
                        const colorHex = phraseColors[i % phraseColors.length];
                        const crossDuration = Phaser.Math.Between(16000, 38000);
                        const initDelay = Phaser.Math.Between(0, 14000);
                        const alpha = Phaser.Math.FloatBetween(0.22, 0.55);

                        const txt = this.add.text(startX, startY, phrase, {
                            fontFamily: "\"Orbitron\", monospace",
                            fontSize: `${Phaser.Math.Between(7, 11)}px`,
                            color: colorHex,
                            stroke: "#000000",
                            strokeThickness: 2,
                        } as Phaser.Types.GameObjects.Text.TextStyle).setAlpha(alpha);

                        // Horizontal drift tween (left → right, looping)
                        this.tweens.add({
                            targets: txt,
                            x: W + 100,
                            duration: crossDuration,
                            delay: initDelay,
                            ease: "Linear",
                            repeat: -1,
                            onRepeat: () => {
                                txt.setX(-100);
                                txt.setY(Phaser.Math.Between(10, H - 40));
                                txt.setAlpha(Phaser.Math.FloatBetween(0.18, 0.52));
                            },
                        });

                        // Gentle vertical bob
                        this.tweens.add({
                            targets: txt,
                            y: `+=${Phaser.Math.Between(5, 15)}`,
                            duration: Phaser.Math.Between(1400, 3200),
                            yoyo: true,
                            repeat: -1,
                            ease: "Sine.easeInOut",
                            delay: Phaser.Math.Between(0, 1800),
                        });
                    });
                }



                private frame = 0;
                updateIdleAnims() {
                    this.frame++;

                    const talking1 = this.currentActive === "fighter1";
                    const talking2 = this.currentActive === "fighter2";

                    // Keep fighters locked to their base Y — no vertical bob
                    const f1Base = (this.f1 as unknown as Record<string, number>)._baseY ?? this.f1.y;
                    const f2Base = (this.f2 as unknown as Record<string, number>)._baseY ?? this.f2.y;
                    this.f1.y = f1Base;
                    this.f2.y = f2Base;

                    // Slight tilt when talking (no Y movement)
                    if (talking1) {
                        this.f1Image.setAngle(Math.sin(this.frame * 0.5) * 2);
                    } else {
                        this.f1Image.setAngle(0);
                    }
                    if (talking2) {
                        this.f2Image.setAngle(Math.sin(this.frame * 0.5) * 2);
                    } else {
                        this.f2Image.setAngle(0);
                    }
                }

                createSpeechBubble(color: number): Phaser.GameObjects.Container {
                    const c = this.add.container(0, 0);
                    const bg = this.add.graphics();
                    bg.fillStyle(color, 0.15);
                    bg.lineStyle(2, color, 0.8);
                    bg.fillRoundedRect(-40, -20, 80, 36, 8);
                    bg.strokeRoundedRect(-40, -20, 80, 36, 8);
                    [-10, 0, 10].forEach((dx) => {
                        const dot = this.add.graphics();
                        dot.fillStyle(color, 0.9);
                        dot.fillCircle(dx, -2, 3);
                        c.add(dot);
                        this.tweens.add({
                            targets: dot, y: -8, duration: 500, yoyo: true, repeat: -1,
                            delay: (dx + 10) * 100, ease: "Sine.easeInOut",
                        });
                    });
                    c.add(bg);
                    return c;
                }

                setActiveFighter(fighter: "fighter1" | "fighter2" | null) {
                    this.currentActive = fighter;
                    this.f1Bubble.setVisible(fighter === "fighter1");
                    this.f2Bubble.setVisible(fighter === "fighter2");
                }

                playVictory(winnerFighter: "fighter1" | "fighter2") {
                    const target = winnerFighter === "fighter1" ? this.f1 : this.f2;
                    this.tweens.add({
                        targets: target, y: target.y - 40, duration: 200,
                        yoyo: true, repeat: 4, ease: "Sine.easeOut",
                    });
                    for (let i = 0; i < 30; i++) {
                        const dx = Phaser.Math.Between(-80, 80);
                        const confetti = this.add.graphics();
                        confetti.fillStyle(
                            [0xff00ff, 0x00ffff, 0x00ff00, 0xffff00][Phaser.Math.Between(0, 3)], 0.9
                        );
                        confetti.fillRect(0, 0, 4, 4);
                        confetti.setPosition(target.x + dx, target.y);
                        this.tweens.add({
                            targets: confetti, y: target.y + 80, alpha: 0,
                            duration: Phaser.Math.Between(600, 1200),
                            delay: Phaser.Math.Between(0, 400),
                            ease: "Cubic.easeIn",
                            onComplete: () => confetti.destroy(),
                        });
                    }
                }
            }

            // ── Create Phaser game ───────────────────────────────────────────────────
            const game = new Phaser.Game({
                type: Phaser.AUTO,
                scale: {
                    mode: Phaser.Scale.FIT,
                    parent: containerRef.current!,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    width: 800,
                    height: 600,
                },
                backgroundColor: backgroundImage ? 0x000000 : "#08081a",
                scene: DebateScene,
                transparent: !!backgroundImage,
                antialias: false,
                pixelArt: false,
                roundPixels: true,
                banner: false,
                audio: { noAudio: true },
            });

            gameRef.current = game;
        };

        initPhaser();

        return () => {
            mounted = false;
            if (gameRef.current) {
                (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
                gameRef.current = null;
                sceneRef.current = null;
                (window as unknown as Record<string, unknown>).__phaserScene = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync activeFighter → scene ──────────────────────────────────────────────
    useEffect(() => {
        const scene = sceneRef.current as {
            setActiveFighter?: (f: "fighter1" | "fighter2" | null) => void;
        } | null;
        scene?.setActiveFighter?.(activeFighter);
    }, [activeFighter]);

    // ── Victory animation when debate ends ─────────────────────────────────────
    useEffect(() => {
        if (status === "done") {
            const scene = sceneRef.current as {
                playVictory?: (w: "fighter1" | "fighter2") => void;
                setActiveFighter?: (f: "fighter1" | "fighter2" | null) => void;
            } | null;
            scene?.setActiveFighter?.(null);
            setTimeout(() => scene?.playVictory?.(winner === "fighter2" ? "fighter2" : "fighter1"), 300);
        }
    }, [status, winner]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{
                background: backgroundImage ? "transparent" : "#08081a",
                imageRendering: "pixelated"
            }}
        />
    );
}
