"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Linkedin, Loader2, Zap, Send, Copy, Check, AlertTriangle, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";

const PROVIDERS = Object.keys(PROVIDER_CATALOGUE) as LLMProvider[];
const TONES = ["Professional", "Casual & Friendly", "Inspirational", "Educational", "Story-telling", "Bold & Opinionated"];
const POST_TYPES = ["Thought Leadership", "Achievement / Milestone", "Industry Insight", "How-to / Tips", "Question / Poll", "Personal Journey"];

// Map provider → env key
const ENV_KEYS: Record<string, string> = {
    openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "",
    gemini: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "",
    deepseek: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ?? "",
    groq: process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "",
    cerebras: process.env.NEXT_PUBLIC_CEREBRAS_API_KEY ?? "",
    scaleway: process.env.NEXT_PUBLIC_SCALEWAY_API_KEY ?? "",
};

function ProviderDropdown({ provider, model, apiKey, onProvider, onModel, onApiKey, accentColor }: {
    provider: LLMProvider; model: string; apiKey: string;
    onProvider: (p: LLMProvider) => void; onModel: (m: string) => void; onApiKey: (k: string) => void;
    accentColor: string;
}) {
    const [open, setOpen] = useState(false);
    const prov = PROVIDER_CATALOGUE[provider];
    return (
        <div className="space-y-2">
            <div className="relative">
                <button onClick={() => setOpen(s => !s)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-inter text-sm hover:border-white/20 transition-all"
                    style={{ borderColor: open ? `${accentColor}60` : undefined }}>
                    <span className="flex items-center gap-2">{prov.avatar} {prov.name}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden z-30 bg-[#08081a] border border-white/10 shadow-xl">
                            {PROVIDERS.map(p => (
                                <button key={p}
                                    onClick={() => {
                                        onProvider(p);
                                        onModel(PROVIDER_CATALOGUE[p].models[0]);
                                        onApiKey(ENV_KEYS[p] ?? ""); // ← auto-fill env key
                                        setOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-inter text-gray-300 hover:text-white hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                                    {PROVIDER_CATALOGUE[p].avatar} {PROVIDER_CATALOGUE[p].name}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <select value={model} onChange={e => onModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-inter text-sm focus:outline-none">
                {prov.models.map(m => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
            </select>
            <input type="password" value={apiKey} onChange={e => onApiKey(e.target.value)} placeholder={`${prov.name} API Key`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-inter text-sm focus:outline-none placeholder:text-gray-600"
                style={{ borderColor: apiKey ? `${accentColor}40` : undefined }} />
            {apiKey && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-green-400 text-xs font-inter">Key set</span></div>}
        </div>
    );
}

export default function LinkedInPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [accessToken, setAccessToken] = useState("");
    const [topic, setTopic] = useState("");
    const [tone, setTone] = useState("Professional");
    const [postType, setPostType] = useState("Thought Leadership");

    // Primary AI
    const [provider, setProvider] = useState<LLMProvider>("gemini");
    const [model, setModel] = useState<string>(PROVIDER_CATALOGUE["gemini"].models[0]);
    const [apiKey, setApiKey] = useState(ENV_KEYS["gemini"]);

    // Secondary AI (for variation / refinement)
    const [provider2, setProvider2] = useState<LLMProvider>("openai");
    const [model2, setModel2] = useState<string>(PROVIDER_CATALOGUE["openai"].models[0]);
    const [apiKey2, setApiKey2] = useState(ENV_KEYS["openai"]);
    const [useSecondAI, setUseSecondAI] = useState(false);

    const [post, setPost] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [postStatus, setPostStatus] = useState<"idle" | "success" | "error">("idle");
    const [postError, setPostError] = useState("");
    const [copied, setCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (token) {
            setAccessToken(token);
            setIsConnected(true);
            window.history.replaceState({}, "", "/automation/linkedin");
        }
    }, []);

    const handleConnect = () => { window.location.href = "/api/auth/linkedin"; };

    const generatePost = async () => {
        if (!topic.trim() || !apiKey.trim()) return;
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setIsGenerating(true);
        setPost("");
        setPostStatus("idle");
        setPostError("");

        try {
            const res = await fetch("/api/automation/linkedin/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic, tone, postType, provider, model, apiKey,
                    // Pass second AI for refinement if enabled
                    refineProvider: useSecondAI ? provider2 : undefined,
                    refineModel: useSecondAI ? model2 : undefined,
                    refineApiKey: useSecondAI ? apiKey2 : undefined,
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
                    try {
                        const evt = JSON.parse(t.slice(6));
                        if (evt.type === "token") setPost(p => p + evt.content);
                    } catch { /* skip */ }
                }
            }
        } catch (e) {
            if ((e as Error).name !== "AbortError") setPostError((e as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const postToLinkedIn = async () => {
        if (!post.trim() || !accessToken) return;
        setIsPosting(true);
        setPostStatus("idle");
        try {
            const res = await fetch("/api/automation/linkedin/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: post, accessToken }),
            });
            if (!res.ok) throw new Error(await res.text());
            setPostStatus("success");
        } catch (e) {
            setPostStatus("error");
            setPostError((e as Error).message);
        } finally {
            setIsPosting(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(post);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute w-[700px] h-[500px] rounded-full bg-sky-500/8 blur-[180px] top-0 left-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
                <div className="flex items-center justify-between mb-10">
                    <Link href="/automation" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    <span className="font-orbitron font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-white">LINKEDIN BOT</span>
                    <div className="w-20" />
                </div>

                {/* Connect banner */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-5 rounded-2xl flex items-center justify-between"
                    style={{ background: isConnected ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${isConnected ? "rgba(14,165,233,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)" }}>
                            <Linkedin className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <p className="font-orbitron font-bold text-white text-sm">{isConnected ? "LinkedIn Connected ✓" : "Connect LinkedIn"}</p>
                            <p className="text-gray-400 font-inter text-xs">{isConnected ? "Ready to post to your profile" : "OAuth required to post — or copy post to clipboard"}</p>
                        </div>
                    </div>
                    {isConnected ? (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                            <span className="font-inter text-sm text-sky-400">Active</span>
                        </div>
                    ) : (
                        <button onClick={handleConnect}
                            className="px-5 py-2.5 rounded-xl font-orbitron text-xs font-bold transition-all hover:scale-105"
                            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "white", boxShadow: "0 0 20px rgba(14,165,233,0.3)" }}>
                            Connect →
                        </button>
                    )}
                </motion.div>

                <div className="grid lg:grid-cols-[380px_1fr] gap-8">
                    {/* Controls */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-2xl border border-white/10 bg-white/3 space-y-5 h-fit">

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">💡 TOPIC / IDEA</label>
                            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                                placeholder="e.g. Why AI will change the future of software development"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-inter text-sm focus:outline-none focus:border-sky-500/50 resize-none placeholder:text-gray-600 transition-all" />
                        </div>

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">🎭 TONE</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TONES.map(t => (
                                    <button key={t} onClick={() => setTone(t)}
                                        className="py-2 px-3 rounded-xl font-inter text-xs transition-all text-center"
                                        style={{ background: tone === t ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${tone === t ? "#0ea5e9" : "rgba(255,255,255,0.08)"}`, color: tone === t ? "#7dd3fc" : "#6b7280" }}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📝 POST TYPE</label>
                            <div className="grid grid-cols-2 gap-2">
                                {POST_TYPES.map(t => (
                                    <button key={t} onClick={() => setPostType(t)}
                                        className="py-2 px-3 rounded-xl font-inter text-xs transition-all text-center"
                                        style={{ background: postType === t ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${postType === t ? "#0ea5e9" : "rgba(255,255,255,0.08)"}`, color: postType === t ? "#7dd3fc" : "#6b7280" }}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Primary AI */}
                        <div>
                            <label className="block font-orbitron text-xs text-sky-400 tracking-wider mb-2">🤖 PRIMARY AI (Writer)</label>
                            <ProviderDropdown
                                provider={provider} model={model} apiKey={apiKey}
                                onProvider={setProvider} onModel={setModel} onApiKey={setApiKey}
                                accentColor="#0ea5e9" />
                        </div>

                        {/* Secondary AI toggle */}
                        <div>
                            <button onClick={() => setUseSecondAI(s => !s)}
                                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-inter text-sm"
                                style={{ background: useSecondAI ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${useSecondAI ? "rgba(14,165,233,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                                <span className="font-orbitron text-xs" style={{ color: useSecondAI ? "#7dd3fc" : "#6b7280" }}>🤖 ADD SECOND AI (Refiner)</span>
                                <span className="text-[10px] font-inter" style={{ color: useSecondAI ? "#0ea5e9" : "#4b5563" }}>{useSecondAI ? "ON" : "OFF"}</span>
                            </button>
                            <AnimatePresence>
                                {useSecondAI && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 overflow-hidden">
                                        <ProviderDropdown
                                            provider={provider2} model={model2} apiKey={apiKey2}
                                            onProvider={setProvider2} onModel={setModel2} onApiKey={setApiKey2}
                                            accentColor="#06b6d4" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generatePost}
                            disabled={isGenerating || !topic.trim() || !apiKey.trim()}
                            className="w-full py-4 rounded-xl font-orbitron font-black text-sm flex items-center justify-center gap-3 disabled:opacity-40 transition-all"
                            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "white", boxShadow: "0 0 30px rgba(14,165,233,0.3)" }}>
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            {isGenerating ? "GENERATING..." : "GENERATE POST"}
                        </motion.button>
                    </motion.div>

                    {/* Post preview */}
                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/3 min-h-[300px] relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-orbitron text-xs text-gray-400 tracking-wider">POST PREVIEW</span>
                                {post && (
                                    <button onClick={copyToClipboard} className="flex items-center gap-1.5 text-xs font-inter text-gray-400 hover:text-white transition-colors">
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                )}
                            </div>
                            {post ? (
                                <textarea value={post} onChange={e => setPost(e.target.value)} rows={14}
                                    className="w-full bg-transparent text-gray-200 font-inter text-sm leading-relaxed resize-none focus:outline-none"
                                    style={{ minHeight: 250 }} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-600">
                                    <Linkedin className="w-10 h-10" />
                                    <p className="font-inter text-sm">Your generated post will appear here</p>
                                </div>
                            )}
                            {isGenerating && <span className="inline-block w-1 h-4 bg-sky-500 animate-pulse" />}
                        </div>

                        {post && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
                                <span className="font-inter text-xs text-gray-500">{post.length} / 3000 characters</span>
                                <div className="flex gap-3">
                                    <button onClick={copyToClipboard}
                                        className="px-4 py-2.5 rounded-xl font-orbitron text-xs border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2">
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} Copy Post
                                    </button>
                                    {isConnected && (
                                        <button onClick={postToLinkedIn} disabled={isPosting}
                                            className="px-5 py-2.5 rounded-xl font-orbitron text-xs font-black flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-105"
                                            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "white" }}>
                                            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            POST NOW
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {postError && (
                            <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/40 text-red-400 font-inter text-sm flex gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {postError}
                            </div>
                        )}

                        <AnimatePresence>
                            {postStatus === "success" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-4 rounded-xl bg-green-900/20 border border-green-500/40 text-green-400 font-inter text-sm">
                                    ✅ Posted successfully to LinkedIn!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
