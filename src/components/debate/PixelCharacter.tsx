"use client";

import { motion } from "framer-motion";

interface PixelCharacterProps {
    type: "gpt" | "gemini" | "claude" | "default";
    isActive: boolean;
    side: "left" | "right";
    glowColor: string;
}

export default function PixelCharacter({ type, isActive, side, glowColor }: PixelCharacterProps) {
    // Sprite sheet mapping (based on the provided character asset)
    // Image: /assets/Gemini_Generated_Image_lz73y2lz73y2lz73%20(1).png
    // Structure (estimated):
    // Top-Right: Gemini
    // Bottom-Left: GPT
    // Bottom-Right: Claude

    const spritePositions: Record<string, string> = {
        gpt: "0% 100%",    // Bottom Left
        claude: "100% 100%", // Bottom Right
        gemini: "70% 25%",   // Top Center-ish
        default: "0% 0%",
    };

    const spriteSize = "220%"; // Zoom in on the character

    return (
        <div className={`relative flex flex-col items-center ${side === "right" ? "scale-x-[-1]" : ""}`}>
            {/* Glow Effect */}
            <motion.div
                animate={{
                    scale: isActive ? [1, 1.2, 1] : 1,
                    opacity: isActive ? [0.4, 0.7, 0.4] : 0.2,
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute bottom-0 w-32 h-12 rounded-[100%] blur-2xl pointer-events-none"
                style={{ background: glowColor }}
            />

            {/* Character Sprite */}
            <motion.div
                animate={{
                    y: isActive ? [0, -8, 0] : [0, -4, 0],
                    scale: isActive ? 1.1 : 1,
                }}
                transition={{
                    repeat: Infinity,
                    duration: isActive ? 0.6 : 2,
                    ease: "easeInOut",
                }}
                className="relative w-48 h-48 pixelated"
                style={{
                    backgroundImage: "url('/assets/Gemini_Generated_Image_lz73y2lz73y2lz73 (1).png')",
                    backgroundPosition: spritePositions[type] || spritePositions.default,
                    backgroundSize: spriteSize,
                    imageRendering: "pixelated",
                }}
            />

            {/* Shadow */}
            <div className="w-20 h-4 bg-black/40 rounded-[100%] mt-2 blur-sm" />
        </div>
    );
}
