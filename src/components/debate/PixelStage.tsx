"use client";

import { motion } from "framer-motion";

interface PixelStageProps {
    children: React.ReactNode;
}

export default function PixelStage({ children }: PixelStageProps) {
    return (
        <div className="relative w-full aspect-square max-w-[800px] border-4 border-[#3a3a50] rounded-xl overflow-hidden shadow-2xl mx-auto shadow-black/80">
            {/* Arena Image */}
            <div
                className="absolute inset-0 bg-cover bg-center pixelated opacity-90"
                style={{
                    backgroundImage: "url('/assets/Gemini_Generated_Image_kjsil6kjsil6kjsi.png')",
                    imageRendering: "pixelated"
                }}
            />

            {/* Lighting overlay for atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40 pointer-events-none" />

            {/* Characters and Action */}
            <div className="absolute inset-0 flex items-center justify-center pt-24">
                <div className="w-full flex justify-around items-end pb-20 px-8">
                    {children}
                </div>
            </div>

            {/* Retro HUD Border */}
            <div className="absolute inset-0 border-[12px] border-[#22223b] pointer-events-none rounded-xl" />
            <div className="absolute inset-[12px] border-2 border-[#5a5a75] pointer-events-none rounded-lg" />
        </div>
    );
}
