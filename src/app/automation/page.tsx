"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Linkedin, Mail, Zap, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Office3D = dynamic(() => import("@/components/automation/Office3D"), { ssr: false });

const TOOLS = [
    {
        id: "research",
        href: "/automation/research",
        icon: <FileText className="w-7 h-7" />,
        label: "Research Paper",
        desc: "Multi-AI pipeline — Analyzer, Writer, Pexels Images, and Combiner AI work together to write a full research paper. Export as PDF or DOCX.",
        color: "#6366f1",
        badge: "4 AI NODES",
        steps: ["🧠 Analyze Topic", "✍️ Write Sections", "🎨 Fetch Images", "📝 Combine & Export"],
    },
    {
        id: "linkedin",
        href: "/automation/linkedin",
        icon: <Linkedin className="w-7 h-7" />,
        label: "LinkedIn Automation",
        desc: "AI drafts engaging LinkedIn posts with the perfect tone, style, and hashtags. Connect to post directly to your profile.",
        color: "#0ea5e9",
        badge: "1 AI NODE",
        steps: ["💡 Input Topic", "🤖 AI Generates Post", "✏️ Review & Edit", "🚀 Post to LinkedIn"],
    },
    {
        id: "gmail",
        href: "/automation/gmail",
        icon: <Mail className="w-7 h-7" />,
        label: "Gmail Composer",
        desc: "AI composes professional emails in your style — cold outreach, follow-ups, proposals — and sends them via Gmail.",
        color: "#f43f5e",
        badge: "1 AI NODE",
        steps: ["📬 Set Recipient", "🤖 AI Composes Email", "✏️ Review & Edit", "📤 Send via Gmail"],
    },
];

export default function AutomationHub() {
    return (
        <div className="min-h-screen bg-dark-bg text-gray-100">
            {/* 3D Office background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <Office3D />
                {/* Dark overlay so text stays readable */}
                <div className="absolute inset-0 bg-black/60" />
                {/* Ambient glow accents on top */}
                <div className="absolute w-[600px] h-[400px] rounded-full bg-emerald-500/8 blur-[180px] top-0 left-1/2 -translate-x-1/2 pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-14">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Arena
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-orbitron tracking-widest uppercase">
                            <Zap className="w-3 h-3" /> Automation Suite
                        </div>
                    </div>
                    <div className="w-28" />
                </div>

                {/* Hero text */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                    <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-orbitron font-black text-white leading-none mb-4">
                        AI{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                            Automation
                        </span>
                    </h1>
                    <p className="text-gray-500 font-inter max-w-lg mx-auto text-base leading-relaxed">
                        Click a tool below to start a pipeline — you&apos;ll see every AI node working live inside.
                    </p>
                </motion.div>

                {/* Tool cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {TOOLS.map((tool, i) => (
                        <motion.div
                            key={tool.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -6, scale: 1.015 }}
                        >
                            <Link href={tool.href} className="block h-full group">
                                <div
                                    className="relative h-full flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer"
                                    style={{
                                        background: `radial-gradient(ellipse at top left, ${tool.color}10, rgba(5,5,20,0.95))`,
                                        borderColor: `${tool.color}30`,
                                    }}
                                >
                                    {/* Hover glow layer */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-2xl"
                                        style={{ boxShadow: `0 0 50px ${tool.color}18 inset`, background: `radial-gradient(ellipse at 50% 0%, ${tool.color}08, transparent 70%)` }} />

                                    {/* Top section */}
                                    <div className="p-6 pb-4">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="p-3 rounded-xl" style={{ background: `${tool.color}18`, border: `1px solid ${tool.color}35`, color: tool.color }}>
                                                {tool.icon}
                                            </div>
                                            <div className="text-[9px] font-orbitron font-bold px-2 py-1 rounded-full"
                                                style={{ background: `${tool.color}14`, border: `1px solid ${tool.color}30`, color: tool.color }}>
                                                {tool.badge}
                                            </div>
                                        </div>
                                        <h2 className="font-orbitron font-black text-white text-lg mb-2">{tool.label}</h2>
                                        <p className="text-gray-400 font-inter text-sm leading-relaxed">{tool.desc}</p>
                                    </div>

                                    {/* Pipeline steps mini-preview */}
                                    <div className="px-6 pb-5 flex-1">
                                        <div className="pt-4 border-t space-y-2" style={{ borderColor: `${tool.color}18` }}>
                                            {tool.steps.map((step, si) => (
                                                <div key={si} className="flex items-center gap-2.5">
                                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: `${tool.color}70` }} />
                                                    <span className="font-inter text-xs text-gray-500">{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="px-6 pb-6">
                                        <div className="flex items-center justify-between w-full py-3 px-4 rounded-xl font-orbitron text-xs font-bold transition-all"
                                            style={{ background: `${tool.color}14`, border: `1px solid ${tool.color}30`, color: tool.color }}>
                                            Launch Workflow
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
