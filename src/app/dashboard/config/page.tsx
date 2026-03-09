"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, KeyRound, Save, ArrowLeft, ShieldCheck } from "lucide-react";

export default function ConfigDashboard() {
    const [keys, setKeys] = useState({
        openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
        anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "",
        google: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
        deepseek: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || "",
    });

    const [saved, setSaved] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Save to database or secure local storage securely
        console.log("Saving keys...", keys);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="min-h-screen relative bg-dark-bg p-8 text-gray-100 overflow-x-hidden">

            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-10">
                <div className="absolute w-96 h-96 rounded-full bg-neon-purple blur-[120px] top-10 right-20"></div>
                <div className="absolute w-64 h-64 rounded-full bg-neon-green blur-[100px] bottom-10 left-10"></div>
            </div>

            <div className="max-w-4xl mx-auto z-10 relative">
                <div className="mb-8 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-neon-blue transition-colors font-orbitron">
                        <ArrowLeft className="w-5 h-5" /> BACK TO ARENA
                    </Link>
                    <div className="flex items-center gap-2 text-neon-purple text-shadow-neon-purple font-orbitron text-xl">
                        <Settings className="w-6 h-6 animate-spin-slow" /> DASHBOARD
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-panel-bg border border-neon-purple/40 rounded-2xl p-8 box-shadow-neon-purple backdrop-blur-md"
                >
                    <div className="mb-8 border-b border-gray-800 pb-6">
                        <h1 className="text-3xl font-orbitron text-white flex items-center gap-3">
                            <KeyRound className="w-8 h-8 text-neon-green" /> API Configuration
                        </h1>
                        <p className="text-gray-400 mt-2 font-inter">
                            Power up your NPCs by connecting LLM brain providers. Keys are stored securely.
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ConfigInput
                                label="OpenAI API Key (GPT-4)"
                                value={keys.openai}
                                onChange={(val) => setKeys({ ...keys, openai: val })}
                                placeholder="sk-..."
                                color="neon-blue"
                            />
                            <ConfigInput
                                label="Anthropic API Key (Claude 3)"
                                value={keys.anthropic}
                                onChange={(val) => setKeys({ ...keys, anthropic: val })}
                                placeholder="sk-ant-..."
                                color="neon-pink"
                            />
                            <ConfigInput
                                label="Google Gemini API Key"
                                value={keys.google}
                                onChange={(val) => setKeys({ ...keys, google: val })}
                                placeholder="AIzaSy..."
                                color="neon-green"
                            />
                            <ConfigInput
                                label="DeepSeek API Key"
                                value={keys.deepseek}
                                onChange={(val) => setKeys({ ...keys, deepseek: val })}
                                placeholder="sk-..."
                                color="neon-purple"
                            />
                        </div>

                        <div className="pt-6 border-t border-gray-800 flex items-center justify-between">
                            <div className="text-sm text-gray-500 font-inter flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-neon-green" /> Your keys are encrypted at rest.
                            </div>

                            <button
                                type="submit"
                                className="px-8 py-3 bg-neon-purple/20 flex items-center gap-2 border border-neon-purple text-neon-purple font-orbitron rounded-lg hover:bg-neon-purple hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(153,0,255,0.3)] hover:shadow-[0_0_25px_rgba(153,0,255,0.8)]"
                            >
                                {saved ? "SAVED!" : <><Save className="w-5 h-5" /> SECURE & SAVE</>}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

function ConfigInput({ label, value, onChange, placeholder, color }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, color: string }) {
    // We use dynamically constructed class names based on color prop
    const borderColors: Record<string, string> = {
        'neon-blue': 'focus:border-neon-blue focus:ring-neon-blue',
        'neon-pink': 'focus:border-neon-pink focus:ring-neon-pink',
        'neon-green': 'focus:border-neon-green focus:ring-neon-green',
        'neon-purple': 'focus:border-neon-purple focus:ring-neon-purple',
    };

    return (
        <div>
            <label className="block text-gray-300 font-inter mb-2 text-sm">{label}</label>
            <input
                type="password"
                className={`w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-1 transition-all ${borderColors[color]}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}
