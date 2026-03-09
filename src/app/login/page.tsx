"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setSuccess("Login successful! Entering the Arena...");
            setTimeout(() => router.push("/dashboard/config"), 1200);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-dark-bg p-4 overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute w-96 h-96 rounded-full bg-neon-blue/20 blur-[120px] top-10 left-10 animate-pulse-slow" />
                <div className="absolute w-64 h-64 rounded-full bg-neon-purple/20 blur-[100px] bottom-20 right-10 animate-pulse-slow-2" />
                <div className="absolute w-48 h-48 rounded-full bg-neon-pink/10 blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                {/* Grid lines */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-neon-blue/60 animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10"
            >
                {/* Logo / Brand link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-8"
                >
                    <Link href="/" className="inline-block">
                        <span className="text-2xl font-orbitron font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue hover:opacity-80 transition-opacity">
                            LLM ARENA
                        </span>
                    </Link>
                </motion.div>

                <div className="relative">
                    {/* Glow border effect */}
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink opacity-50 blur-sm" />

                    <div className="relative bg-[rgba(5,5,20,0.95)] border border-neon-blue/20 rounded-2xl p-8 backdrop-blur-xl">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-blue/10 border border-neon-blue/30 mb-4">
                                <LogIn className="w-8 h-8 text-neon-blue" />
                            </div>
                            <h1 className="text-3xl font-orbitron font-black text-white mb-1">
                                Welcome Back
                            </h1>
                            <p className="text-gray-400 font-inter text-sm">Enter your credentials to join the Arena</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-inter text-center"
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-5 p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green text-sm font-inter text-center"
                            >
                                ✅ {success}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-gray-300 font-inter text-sm mb-2 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-gray-600/50 rounded-xl p-3.5 text-white focus:outline-none focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/30 transition-all placeholder:text-gray-600 font-inter"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="player@llmarena.io"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 font-inter text-sm mb-2 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-white/5 border border-gray-600/50 rounded-xl p-3.5 pr-12 text-white focus:outline-none focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/30 transition-all placeholder:text-gray-600 font-inter"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-blue transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.02 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                                className="w-full py-3.5 bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center gap-2 text-white font-orbitron font-bold rounded-xl hover:opacity-90 transition-all duration-300 shadow-lg shadow-neon-blue/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> CONNECTING...</>
                                ) : (
                                    <>ENTER ARENA <ArrowRight className="w-5 h-5" /></>
                                )}
                            </motion.button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-500 font-inter text-sm">
                                New to LLM Arena?{" "}
                                <Link href="/signup" className="text-neon-pink font-semibold hover:underline transition-all">
                                    Create Account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
