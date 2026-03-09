"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Loader2, Download, Zap, ChevronDown,
    Brain, PenLine, Image as ImageIcon, FileText, Check, AlertTriangle
} from "lucide-react";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";

const PROVIDERS = Object.keys(PROVIDER_CATALOGUE) as LLMProvider[];

/* ── Workflow node types ─────────────────────────────────────────── */
type NodeStatus = "idle" | "active" | "done" | "error";

interface WorkflowNode {
    id: string;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
}

const NODES: WorkflowNode[] = [
    { id: "analyze", label: "Analyzer AI", sublabel: "Breaks topic into sections", icon: <Brain className="w-5 h-5" />, color: "#8b5cf6" },
    { id: "write", label: "Writer AI", sublabel: "Writes content per section", icon: <PenLine className="w-5 h-5" />, color: "#10b981" },
    { id: "images", label: "Pexels Images", sublabel: "Fetches real photos", icon: <ImageIcon className="w-5 h-5" />, color: "#f59e0b" },
    { id: "combine", label: "Combiner AI", sublabel: "Assembles final paper", icon: <FileText className="w-5 h-5" />, color: "#6366f1" },
];

const DEPTH_OPTIONS = [
    { id: "brief", label: "Brief", sections: 4 },
    { id: "standard", label: "Standard", sections: 7 },
    { id: "deep", label: "Deep", sections: 11 },
];

interface PaperSection {
    title: string;
    content: string;
    imageUrl?: string;
    isStreaming?: boolean;
}

type GenStatus = "idle" | "running" | "done" | "error";

// Map provider → env key for auto-fill
const ENV_KEYS: Record<string, string> = {
    openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "",
    gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
    deepseek: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? "",
    groq: process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "",
    cerebras: process.env.NEXT_PUBLIC_CEREBRAS_API_KEY ?? "",
    scaleway: process.env.NEXT_PUBLIC_SCALEWAY_API_KEY ?? "",
};

/* ── Provider picker sub-component ──────────────────────────────── */
function ProviderPicker({
    label, value, model, apiKey,
    onProvider, onModel, onApiKey,
    accentColor,
}: {
    label: string; value: LLMProvider; model: string; apiKey: string;
    onProvider: (p: LLMProvider) => void; onModel: (m: string) => void; onApiKey: (k: string) => void;
    accentColor: string;
}) {
    const [open, setOpen] = useState(false);
    const prov = PROVIDER_CATALOGUE[value];
    return (
        <div className="space-y-2">
            <label className="block font-orbitron text-[10px] tracking-wider" style={{ color: accentColor }}>{label}</label>
            <div className="relative">
                <button onClick={() => setOpen(s => !s)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-inter text-sm hover:border-white/20 transition-all">
                    <span className="flex items-center gap-2 text-xs">{prov.avatar} {prov.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden z-30 bg-[#07070f] border border-white/10 shadow-xl">
                            {PROVIDERS.map(p => (
                                <button key={p} onClick={() => {
                                    onProvider(p);
                                    onModel(PROVIDER_CATALOGUE[p].models[0]);
                                    onApiKey(ENV_KEYS[p] ?? ""); // ← auto-fill env key
                                    setOpen(false);
                                }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-inter text-gray-300 hover:text-white hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                                    {PROVIDER_CATALOGUE[p].avatar} {PROVIDER_CATALOGUE[p].name}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <select value={model} onChange={e => onModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-inter text-xs focus:outline-none">
                {prov.models.map(m => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
            </select>
            <input type="password" value={apiKey} onChange={e => onApiKey(e.target.value)} placeholder={`${prov.name} API Key`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-inter text-xs focus:outline-none placeholder:text-gray-600"
                style={{ borderColor: apiKey ? `${accentColor}40` : undefined }} />
            {apiKey && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-green-400 text-[10px] font-inter">Key set</span></div>}
        </div>
    );
}

/* ── Workflow canvas ─────────────────────────────────────────────── */
function WorkflowCanvas({
    nodeStatuses,
    currentSection,
    totalSections,
    sectionsDone,
}: {
    nodeStatuses: Record<string, NodeStatus>;
    currentSection: number;
    totalSections: number;
    sectionsDone: number;
}) {
    return (
        <div className="relative rounded-2xl border border-white/10 overflow-hidden p-6"
            style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06), rgba(5,5,20,0.97))",
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                minHeight: 260,
            }}>
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }} />

            {/* Live status */}
            <div className="relative z-10 flex items-center gap-2 mb-5">
                {Object.values(nodeStatuses).some(s => s === "active") ? (
                    <>
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                        <span className="font-orbitron text-[10px] text-indigo-400 tracking-widest">PIPELINE RUNNING</span>
                    </>
                ) : nodeStatuses["combine"] === "done" ? (
                    <><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-orbitron text-[10px] text-emerald-400 tracking-widest">PIPELINE COMPLETE</span></>
                ) : (
                    <><div className="w-2 h-2 rounded-full bg-gray-600" /><span className="font-orbitron text-[10px] text-gray-600 tracking-widest">READY</span></>
                )}
            </div>

            {/* Node row */}
            <div className="relative z-10 flex items-center justify-between gap-2">
                {NODES.map((node, i) => {
                    const status = nodeStatuses[node.id] ?? "idle";
                    const isActive = status === "active";
                    const isDone = status === "done";
                    const isIdle = status === "idle";
                    return (
                        <div key={node.id} className="flex items-center gap-2 flex-1">
                            <div className="flex-1">
                                <motion.div
                                    animate={isActive ? { boxShadow: [`0 0 0px ${node.color}00`, `0 0 20px ${node.color}80`, `0 0 0px ${node.color}00`] } : {}}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all duration-500"
                                    style={{
                                        background: isActive ? `${node.color}18` : isDone ? `${node.color}10` : "rgba(255,255,255,0.03)",
                                        borderColor: isActive ? `${node.color}80` : isDone ? `${node.color}50` : "rgba(255,255,255,0.08)",
                                        opacity: isIdle ? 0.45 : 1,
                                    }}>
                                    <div style={{ color: isIdle ? "#4b5563" : node.color }}>
                                        {isDone
                                            ? <Check className="w-5 h-5" />
                                            : isActive
                                                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                                                    <Loader2 className="w-5 h-5" />
                                                </motion.div>
                                                : node.icon}
                                    </div>
                                    <div>
                                        <p className="font-orbitron text-[9px] font-bold text-white">{node.label}</p>
                                        <p className="font-inter text-[8px] text-gray-500 mt-0.5">{node.sublabel}</p>
                                    </div>
                                    {/* Progress bar for writer */}
                                    {node.id === "write" && (isActive || isDone) && totalSections > 0 && (
                                        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                                            <motion.div className="h-full rounded-full"
                                                animate={{ width: `${(sectionsDone / totalSections) * 100}%` }}
                                                style={{ background: node.color }} />
                                        </div>
                                    )}
                                    {node.id === "write" && isActive && (
                                        <p className="font-mono text-[8px]" style={{ color: node.color }}>
                                            {currentSection}/{totalSections}
                                        </p>
                                    )}
                                </motion.div>
                            </div>

                            {/* Arrow connector */}
                            {i < NODES.length - 1 && (
                                <div className="flex-shrink-0 flex flex-col items-center">
                                    <motion.div
                                        animate={isDone ? { opacity: [0.4, 1, 0.4] } : {}}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="font-mono text-sm"
                                        style={{ color: isDone ? NODES[i].color : "#374151" }}>
                                        →
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ResearchPage() {
    const [topic, setTopic] = useState("");
    const [depth, setDepth] = useState("standard");
    const [pexelsKey, setPexelsKey] = useState(process.env.NEXT_PUBLIC_PEXELS_API_KEY ?? "");

    // 3 separate AI providers
    const [analyzerProvider, setAnalyzerProvider] = useState<LLMProvider>("gemini");
    const [analyzerModel, setAnalyzerModel] = useState<string>(PROVIDER_CATALOGUE["gemini"].models[0]);
    const [analyzerKey, setAnalyzerKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "");

    const [writerProvider, setWriterProvider] = useState<LLMProvider>("openai");
    const [writerModel, setWriterModel] = useState<string>(PROVIDER_CATALOGUE["openai"].models[0]);
    const [writerKey, setWriterKey] = useState(process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "");

    const [combinerProvider, setCombinerProvider] = useState<LLMProvider>("anthropic");
    const [combinerModel, setCombinerModel] = useState<string>(PROVIDER_CATALOGUE["anthropic"].models[0]);
    const [combinerKey, setCombinerKey] = useState(process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "");

    const [status, setStatus] = useState<GenStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({
        analyze: "idle", write: "idle", images: "idle", combine: "idle",
    });
    const [paperTitle, setPaperTitle] = useState("");
    const [paperAbstract, setPaperAbstract] = useState("");
    const [sections, setSections] = useState<PaperSection[]>([]);
    const [currentSection, setCurrentSection] = useState(0);
    const [totalSections, setTotalSections] = useState(0);
    const [sectionsDone, setSectionsDone] = useState(0);

    const abortRef = useRef<AbortController | null>(null);
    const paperRef = useRef<HTMLDivElement>(null);

    const setNode = (id: string, s: NodeStatus) =>
        setNodeStatuses(prev => ({ ...prev, [id]: s }));

    const generate = useCallback(async () => {
        if (!topic.trim() || !analyzerKey || !writerKey || !combinerKey) return;
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setStatus("running");
        setErrorMsg("");
        setSections([]);
        setPaperTitle("");
        setPaperAbstract("");
        setCurrentSection(0);
        setSectionsDone(0);
        setNodeStatuses({ analyze: "idle", write: "idle", images: "idle", combine: "idle" });

        const depthOpt = DEPTH_OPTIONS.find(d => d.id === depth)!;

        try {
            const res = await fetch("/api/automation/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic, depth,
                    numSections: depthOpt.sections,
                    pexelsKey,
                    analyzerProvider, analyzerModel, analyzerKey,
                    writerProvider, writerModel, writerKey,
                    combinerProvider, combinerModel, combinerKey,
                }),
                signal: abortRef.current.signal,
            });
            if (!res.ok) throw new Error(await res.text());

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";

                for (const line of lines) {
                    const t = line.trim();
                    if (!t.startsWith("data: ")) continue;
                    let evt: Record<string, unknown>;
                    try { evt = JSON.parse(t.slice(6)); } catch { continue; }

                    switch (evt.type) {
                        case "node_start":
                            setNode(evt.node as string, "active");
                            break;
                        case "node_done":
                            setNode(evt.node as string, "done");
                            break;
                        case "title":
                            setPaperTitle(evt.content as string);
                            break;
                        case "abstract":
                            setPaperAbstract(evt.content as string);
                            break;
                        case "sections_plan":
                            setTotalSections(evt.count as number);
                            setSections((evt.sections as { title: string }[]).map(s => ({ title: s.title, content: "" })));
                            break;
                        case "section_start":
                            setCurrentSection((evt.index as number) + 1);
                            setSections(p => p.map((s, i) => i === (evt.index as number) ? { ...s, isStreaming: true } : s));
                            break;
                        case "section_token":
                            setSections(p => p.map((s, i) => i === (evt.index as number) ? { ...s, content: s.content + (evt.content as string) } : s));
                            break;
                        case "section_done":
                            setSectionsDone(d => d + 1);
                            setSections(p => p.map((s, i) => i === (evt.index as number) ? { ...s, isStreaming: false } : s));
                            break;
                        case "image":
                            setSections(p => p.map((s, i) => i === (evt.index as number) ? { ...s, imageUrl: evt.url as string } : s));
                            break;
                        case "done":
                            setStatus("done");
                            break;
                        case "error":
                            throw new Error(evt.message as string);
                    }
                }
            }
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            setErrorMsg((e as Error).message);
            setStatus("error");
            setNodeStatuses(prev => {
                const updated = { ...prev };
                for (const k of Object.keys(updated)) if (updated[k] === "active") updated[k] = "error";
                return updated;
            });
        }
    }, [topic, depth, pexelsKey, analyzerProvider, analyzerModel, analyzerKey, writerProvider, writerModel, writerKey, combinerProvider, combinerModel, combinerKey]);

    /* ── Export PDF */
    const exportPDF = async () => {
        if (!paperRef.current) return;
        const { default: jsPDF } = await import("jspdf");
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(paperRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        let y = 0;
        const totalH = (canvas.height * w) / canvas.width;
        while (y < totalH) {
            const srcY = (y / totalH) * canvas.height;
            const sliceH = Math.min((h / totalH) * canvas.height, canvas.height - srcY);
            const slice = document.createElement("canvas");
            slice.width = canvas.width; slice.height = sliceH;
            slice.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, w, (sliceH * w) / canvas.width);
            y += h;
            if (y < totalH) pdf.addPage();
        }
        pdf.save(`${paperTitle || topic}.pdf`);
    };

    /* ── Export DOCX */
    const exportDOCX = async () => {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
        const children: InstanceType<typeof Paragraph>[] = [
            new Paragraph({ text: paperTitle || topic, heading: HeadingLevel.TITLE }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Abstract", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: paperAbstract }),
            new Paragraph({ text: "" }),
        ];
        for (const s of sections) {
            children.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 }));
            for (const para of s.content.split("\n\n"))
                children.push(new Paragraph({ children: [new TextRun(para.trim())] }));
            children.push(new Paragraph({ text: "" }));
        }
        const doc = new Document({ sections: [{ children }] });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `${paperTitle || topic}.docx`; a.click();
    };

    const isRunning = status === "running";
    const isDone = status === "done";
    const canStart = !!topic.trim() && !!analyzerKey && !!writerKey && !!combinerKey;

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute w-[700px] h-[600px] rounded-full bg-indigo-500/6 blur-[200px] top-0 left-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <Link href="/automation" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    <span className="font-orbitron font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-white">
                        RESEARCH PAPER PIPELINE
                    </span>
                    <div className="w-24" />
                </div>

                <div className="grid xl:grid-cols-[320px_1fr] gap-8">

                    {/* ── LEFT PANEL: Config ──────────────────────────────── */}
                    <div className="space-y-4">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="p-5 rounded-2xl border border-white/10 bg-white/2 space-y-5">

                            {/* Topic */}
                            <div>
                                <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📌 RESEARCH TOPIC</label>
                                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                                    placeholder="e.g. The impact of Large Language Models on scientific research"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-inter text-sm focus:outline-none focus:border-indigo-500/50 resize-none placeholder:text-gray-600 transition-all" />
                            </div>

                            {/* Depth */}
                            <div>
                                <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📊 DEPTH</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DEPTH_OPTIONS.map(d => (
                                        <button key={d.id} onClick={() => setDepth(d.id)}
                                            className="py-2 px-2 rounded-xl font-orbitron text-xs transition-all text-center"
                                            style={{ background: depth === d.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", border: `2px solid ${depth === d.id ? "#6366f1" : "rgba(255,255,255,0.08)"}`, color: depth === d.id ? "#a5b4fc" : "#6b7280" }}>
                                            {d.label}
                                            <span className="block text-[9px] opacity-60 mt-0.5 font-inter">{d.sections} sections</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pexels key */}
                            <div>
                                <label className="block font-orbitron text-[10px] text-amber-500 tracking-wider mb-2">🎨 PEXELS API KEY</label>
                                <input value={pexelsKey} onChange={e => setPexelsKey(e.target.value)} placeholder="Pexels API key (for real images)"
                                    className="w-full bg-white/5 border border-amber-500/20 rounded-xl px-3 py-2 text-white font-inter text-xs focus:outline-none focus:border-amber-500/50 placeholder:text-gray-600" />
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="font-orbitron text-[9px] text-gray-600 tracking-widest">AI PIPELINE CONFIG</span>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>

                            {/* Analyzer AI */}
                            <ProviderPicker label="🧠 NODE 1 — ANALYZER AI"
                                value={analyzerProvider} model={analyzerModel} apiKey={analyzerKey}
                                onProvider={setAnalyzerProvider} onModel={setAnalyzerModel} onApiKey={setAnalyzerKey}
                                accentColor="#8b5cf6" />

                            {/* Writer AI */}
                            <ProviderPicker label="✍️ NODE 2 — WRITER AI"
                                value={writerProvider} model={writerModel} apiKey={writerKey}
                                onProvider={setWriterProvider} onModel={setWriterModel} onApiKey={setWriterKey}
                                accentColor="#10b981" />

                            {/* Combiner AI */}
                            <ProviderPicker label="📝 NODE 4 — COMBINER AI"
                                value={combinerProvider} model={combinerModel} apiKey={combinerKey}
                                onProvider={setCombinerProvider} onModel={setCombinerModel} onApiKey={setCombinerKey}
                                accentColor="#6366f1" />

                            {/* Generate button */}
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={generate} disabled={isRunning || !canStart}
                                className="w-full py-4 rounded-xl font-orbitron font-black text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}>
                                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                {isRunning ? "PIPELINE RUNNING..." : "RUN PIPELINE"}
                            </motion.button>
                        </motion.div>

                        {/* Export buttons */}
                        <AnimatePresence>
                            {isDone && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                                    <button onClick={exportPDF}
                                        className="flex-1 py-3 rounded-xl font-orbitron text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-105"
                                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)", color: "#f87171" }}>
                                        <Download className="w-4 h-4" /> PDF
                                    </button>
                                    <button onClick={exportDOCX}
                                        className="flex-1 py-3 rounded-xl font-orbitron text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-105"
                                        style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.5)", color: "#60a5fa" }}>
                                        <Download className="w-4 h-4" /> DOCX
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── RIGHT PANEL: Workflow + Paper ───────────────────── */}
                    <div className="space-y-6">
                        {/* Workflow canvas — always visible */}
                        <WorkflowCanvas
                            nodeStatuses={nodeStatuses}
                            currentSection={currentSection}
                            totalSections={totalSections}
                            sectionsDone={sectionsDone}
                        />

                        {/* Error */}
                        {status === "error" && (
                            <div className="p-5 rounded-xl bg-red-900/20 border border-red-500/40 text-red-400 font-inter text-sm flex gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {errorMsg}
                            </div>
                        )}

                        {/* Paper preview */}
                        {(isRunning || isDone) && (
                            <div ref={paperRef} className="bg-white text-gray-900 rounded-2xl p-10 shadow-2xl font-serif">
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                                        {paperTitle || <span className="text-gray-300 italic text-lg">Analyzing topic...</span>}
                                    </h1>
                                    <p className="text-xs text-gray-400 font-sans">Generated by LLM Arena · {new Date().toLocaleDateString()}</p>
                                </div>

                                {paperAbstract && (
                                    <div className="mb-8 p-5 bg-gray-50 rounded-xl border-l-4 border-indigo-500">
                                        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 font-sans">Abstract</h2>
                                        <p className="text-sm text-gray-700 leading-relaxed">{paperAbstract}</p>
                                    </div>
                                )}

                                <div className="space-y-8">
                                    {sections.map((s, i) => (
                                        <div key={i}>
                                            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2 font-sans">
                                                <span className="text-indigo-500 font-mono text-sm">{i + 1}.</span>
                                                {s.title}
                                                {s.isStreaming && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                                            </h2>
                                            {s.imageUrl && (
                                                <div className="mb-4">
                                                    <img src={s.imageUrl} alt={s.title}
                                                        className="w-full h-52 object-cover rounded-xl shadow-md"
                                                        crossOrigin="anonymous"
                                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                                    <p className="text-[10px] text-gray-400 mt-1 font-sans text-center">Photo from Pexels</p>
                                                </div>
                                            )}
                                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {s.content}
                                                {s.isStreaming && <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-text-bottom" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {isDone && (
                                    <div className="mt-10 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 font-sans">
                                        — End of Paper — · Multi-AI Pipeline: Analyzer + Writer + Pexels + Combiner
                                    </div>
                                )}
                            </div>
                        )}

                        {status === "idle" && (
                            <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 text-gray-600">
                                <FileText className="w-10 h-10" />
                                <p className="font-inter text-sm">Configure the pipeline → click Run</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
