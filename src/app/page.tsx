"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValue, useSpring, type Variants } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import {
  Gamepad2, Users, Zap, Settings, ChevronRight, Brain, Code2, Trophy,
  MessageSquare, Bot, ArrowRight, Star, Shield, Cpu, Swords
} from "lucide-react";
import ModeArena from "@/components/ModeArena";
import AIAgentsSection from "@/components/AIAgentsSection";

/* ─── Animation Variants ─── */
const fadeUp: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: (i = 0) => ({
    y: 0, opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ─── Data ─── */
const STATS = [
  { value: "12+", label: "LLM Models", icon: <Brain className="w-5 h-5 text-neon-purple" /> },
  { value: "4", label: "Arena Modes", icon: <Trophy className="w-5 h-5 text-neon-pink" /> },
  { value: "∞", label: "Battle Scenarios", icon: <Zap className="w-5 h-5 text-neon-blue" /> },
  { value: "100%", label: "Open Source", icon: <Code2 className="w-5 h-5 text-neon-green" /> },
];

const MODELS = [
  { name: "GPT-4o", org: "OpenAI", color: "#10a37f" },
  { name: "Claude 3.5", org: "Anthropic", color: "#d4a27f" },
  { name: "Gemini Flash", org: "Google", color: "#4285f4" },
  { name: "DeepSeek-V3", org: "DeepSeek", color: "#7b5ea7" },
  { name: "Llama 3.1", org: "Meta", color: "#0668e1" },
  { name: "Mistral", org: "Mistral AI", color: "#ff7000" },
];

/* ─── Floating pixel particle ─── */
function Particle({ style }: { style: React.CSSProperties }) {
  return <div className="absolute rounded-full bg-neon-blue/40 animate-float" style={style} />;
}

/* ─── Model Badge ─── */
function ModelBadge({ name, org, color }: { name: string; org: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-default select-none group relative overflow-hidden"
      style={{ borderColor: `${color}30` }}
    >
      {/* shimmer on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(105deg, transparent 30%, ${color}15 50%, transparent 70%)` }}
      />
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <div>
        <p className="text-white font-orbitron text-sm font-bold leading-none">{name}</p>
        <p className="text-gray-500 text-xs mt-0.5 font-inter">{org}</p>
      </div>
      <div className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    </motion.div>
  );
}

/* ─── Animated counter ─── */
function AnimatedCounter({ value }: { value: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-4xl font-orbitron font-black text-white tracking-tight"
    >
      {value}
    </motion.p>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-orbitron font-black text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue animate-neon-flicker">
            LLM ARENA
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-inter text-gray-400">
            <Link href="#modes" className="hover:text-white transition-colors">Modes</Link>
            <Link href="#agents" className="hover:text-white transition-colors">Agents</Link>
            <Link href="#models" className="hover:text-white transition-colors">Models</Link>
            <Link href="#stats" className="hover:text-white transition-colors">Stats</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-orbitron text-gray-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/signup"
              className="px-5 py-2 text-sm font-orbitron font-bold text-white rounded-lg bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 transition-all shadow-lg shadow-neon-pink/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-neon-purple/15 blur-[150px] top-0 left-1/4 -translate-x-1/2" />
          <div className="absolute w-[500px] h-[500px] rounded-full bg-neon-pink/15 blur-[130px] bottom-0 right-0" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-neon-blue/10 blur-[120px] top-1/2 right-1/4" />
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        </div>

        {/* Animated particles */}
        {[
          { width: "6px", height: "6px", left: "10%", top: "20%", animationDuration: "5s", opacity: 0.6 },
          { width: "4px", height: "4px", left: "80%", top: "15%", animationDuration: "4s", animationDelay: "1s", opacity: 0.5 },
          { width: "8px", height: "8px", left: "60%", top: "70%", animationDuration: "6s", animationDelay: "2s", opacity: 0.4 },
          { width: "3px", height: "3px", left: "30%", top: "80%", animationDuration: "4.5s", animationDelay: "0.5s", opacity: 0.5 },
          { width: "5px", height: "5px", left: "90%", top: "50%", animationDuration: "7s", animationDelay: "1.5s", opacity: 0.3 },
          { width: "4px", height: "4px", left: "20%", top: "60%", animationDuration: "5.5s", animationDelay: "3s", opacity: 0.5 },
        ].map((p, i) => <Particle key={i} style={p} />)}

        {/* Hero content */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-inter tracking-widest uppercase mb-8"
          >
            <Star className="w-3 h-3 fill-current animate-spin-slow" />
            The Ultimate AI Battleground
            <Star className="w-3 h-3 fill-current animate-spin-slow" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[clamp(3rem,10vw,8rem)] font-black font-orbitron leading-none tracking-tighter mb-6"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue glow-title">
              LLM
            </span>
            <br />
            <span className="text-white drop-shadow-[0_0_40px_rgba(144,0,255,0.5)]">ARENA</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            className="text-[clamp(1rem,2.5vw,1.3rem)] text-gray-300 font-inter max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Watch AI models <span className="text-neon-pink font-semibold">debate</span>,{" "}
            <span className="text-neon-green font-semibold">teach</span>, and{" "}
            <span className="text-neon-blue font-semibold">automate</span> in real-time.
            The pixel-art powered playground where{" "}
            <span className="text-neon-purple font-semibold">LLMs go head-to-head</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/signup"
              className="group flex items-center gap-3 px-8 py-4 rounded-xl font-orbitron font-bold text-white bg-gradient-to-r from-neon-pink to-neon-purple shadow-xl shadow-neon-pink/30 hover:shadow-neon-pink/50 hover:scale-105 transition-all duration-300">
              <Gamepad2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              ENTER ARENA
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/dashboard/config"
              className="group flex items-center gap-3 px-8 py-4 rounded-xl font-orbitron font-bold text-neon-blue border border-neon-blue/50 bg-neon-blue/5 hover:bg-neon-blue/15 hover:border-neon-blue hover:shadow-lg hover:shadow-neon-blue/20 hover:scale-105 transition-all duration-300">
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              CONFIGURE KEYS
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="mt-16 flex flex-col items-center gap-2 text-gray-600">
            <span className="text-xs font-inter tracking-widest uppercase">Scroll to Explore</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-px h-10 bg-gradient-to-b from-gray-600 to-transparent" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="py-20 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {STATS.map((s, i) => (
              <motion.div key={s.label} custom={i} variants={fadeUp}
                whileHover={{ y: -6, scale: 1.04 }}
                className="relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/3 border border-white/8 backdrop-blur-sm group hover:border-neon-purple/40 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: "radial-gradient(circle at center, rgba(144,0,255,0.08), transparent)" }} />
                <div className="p-2 rounded-lg bg-white/5">{s.icon}</div>
                <AnimatedCounter value={s.value} />
                <p className="text-gray-500 text-sm font-inter text-center">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── MODES (Cinematic Arena) ── */}
      <ModeArena />

      {/* ── AI AGENTS SECTION ── */}
      <section id="agents">
        <AIAgentsSection />
      </section>

      {/* ── VS DIVIDER ── */}
      <div className="flex items-center justify-center gap-6 py-6 opacity-30">
        <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent to-neon-purple/60" />
        <Swords className="w-6 h-6 text-neon-purple" />
        <div className="h-px flex-1 max-w-xs bg-gradient-to-l from-transparent to-neon-purple/60" />
      </div>

      {/* ── MODELS SHOWCASE ── */}
      <section id="models" className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[600px] h-[300px] rounded-full bg-neon-blue/8 blur-[150px] right-0 top-1/2 -translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-neon-blue text-xs font-inter tracking-widest uppercase mb-3">
                Supported Models
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-[clamp(2rem,4vw,3.5rem)] font-orbitron font-black text-white leading-tight mb-5">
                Battle-Ready <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">AI Fighters</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 font-inter text-lg leading-relaxed mb-8">
                Bring your own API keys and unlock the full roster. Mix and match models from any provider for the most epic AI showdowns.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link href="/dashboard/config"
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-orbitron font-bold text-neon-blue border border-neon-blue/50 bg-neon-blue/5 hover:bg-neon-blue/15 transition-all duration-300 group">
                  <Shield className="w-5 h-5" />
                  Configure API Keys
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
              className="grid grid-cols-2 gap-4">
              {MODELS.map((m, i) => (
                <motion.div key={m.name} custom={i} variants={fadeUp}>
                  <ModelBadge {...m} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-[clamp(2rem,4vw,3.5rem)] font-orbitron font-black text-white mb-4">
              Start in <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue">3 Steps</span>
            </motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue opacity-30" />
            {[
              { step: "01", title: "Create Account", desc: "Sign up with your email and get instant access to the Arena.", icon: <Users className="w-6 h-6 text-neon-pink" />, color: "#f0f" },
              { step: "02", title: "Add API Keys", desc: "Configure your LLM API keys in the dashboard to unlock all models.", icon: <Settings className="w-6 h-6 text-neon-purple" />, color: "#90f" },
              { step: "03", title: "Start a Battle", desc: "Choose a mode, pick your AI fighters, and let the battle begin!", icon: <Bot className="w-6 h-6 text-neon-blue" />, color: "#0ff" },
            ].map((step, i) => (
              <motion.div key={step.step} custom={i} variants={fadeUp}
                whileHover={{ y: -8, scale: 1.03 }}
                className="flex flex-col items-center text-center gap-4 p-8 rounded-2xl bg-white/3 border border-white/8 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -top-4 -right-4 text-6xl font-orbitron font-black opacity-5 select-none" style={{ color: step.color }}>{step.step}</div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: `${step.color}15`, boxShadow: `0 0 20px ${step.color}30`, border: `1px solid ${step.color}40` }}>
                  {step.icon}
                </div>
                <div className="text-4xl font-orbitron font-black" style={{ color: step.color, textShadow: `0 0 20px ${step.color}60` }}>{step.step}</div>
                <h3 className="text-xl font-orbitron font-bold text-white">{step.title}</h3>
                <p className="text-gray-400 font-inter text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-neon-pink/10 to-neon-blue/20" />
          <div className="absolute inset-0 border border-white/10 rounded-3xl" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-neon-purple/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-neon-pink/20 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center text-center gap-6 p-16">
            <Zap className="w-12 h-12 text-neon-purple" style={{ filter: "drop-shadow(0 0 16px #90f)" }} />
            <h2 className="text-[clamp(2rem,5vw,4rem)] font-orbitron font-black text-white leading-tight">
              Ready to Watch AIs<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-purple">Fight for Supremacy?</span>
            </h2>
            <p className="text-gray-300 font-inter text-lg max-w-xl">
              Join the community and see which LLM reigns supreme in debate, learning, and creative challenges.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/signup"
                className="px-8 py-4 rounded-xl font-orbitron font-black text-white bg-gradient-to-r from-neon-pink to-neon-purple shadow-xl shadow-neon-pink/30 hover:scale-105 hover:shadow-neon-pink/50 transition-all duration-300">
                ENTER ARENA NOW
              </Link>
              <Link href="/login"
                className="px-8 py-4 rounded-xl font-orbitron font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300">
                I HAVE AN ACCOUNT
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-white/5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-orbitron font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue">
            LLM ARENA
          </span>
          <p className="text-gray-600 font-inter text-sm">© 2025 LLM Arena. The Ultimate AI Battleground.</p>
          <div className="flex gap-6 text-sm font-inter text-gray-500">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
            <Link href="/dashboard/config" className="hover:text-white transition-colors">Config</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
