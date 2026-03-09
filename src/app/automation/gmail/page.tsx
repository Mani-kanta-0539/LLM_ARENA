"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Loader2, Zap, Send, Copy, Check, AlertTriangle, ChevronDown } from "lucide-react";
import { PROVIDER_CATALOGUE, LLMProvider } from "@/lib/llm-adapters";

const PROVIDERS = Object.keys(PROVIDER_CATALOGUE) as LLMProvider[];
const EMAIL_STYLES = ["Formal", "Friendly", "Persuasive", "Concise", "Apologetic", "Follow-up"];
const EMAIL_TYPES = ["Cold Outreach", "Job Application", "Meeting Request", "Thank You", "Proposal", "Support Request"];

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
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-inter text-sm hover:border-white/20 transition-all">
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
                                        onApiKey(ENV_KEYS[p] ?? ""); // ← auto-fill from env
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

export default function GmailPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [accessToken, setAccessToken] = useState("");
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [context, setContext] = useState("");
    const [style, setStyle] = useState("Formal");
    const [emailType, setEmailType] = useState("Cold Outreach");

    // Primary AI
    const [provider, setProvider] = useState<LLMProvider>("gemini");
    const [model, setModel] = useState<string>(PROVIDER_CATALOGUE["gemini"].models[0]);
    const [apiKey, setApiKey] = useState(ENV_KEYS["gemini"]);

    // Secondary AI (for refining / subject line)
    const [provider2, setProvider2] = useState<LLMProvider>("openai");
    const [model2, setModel2] = useState<string>(PROVIDER_CATALOGUE["openai"].models[0]);
    const [apiKey2, setApiKey2] = useState(ENV_KEYS["openai"]);
    const [useSecondAI, setUseSecondAI] = useState(false);

    const [email, setEmail] = useState("");
    const [genSubject, setGenSubject] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
    const [sendError, setSendError] = useState("");
    const [copied, setCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (token) {
            setAccessToken(token);
            setIsConnected(true);
            window.history.replaceState({}, "", "/automation/gmail");
        }
    }, []);

    const handleConnect = () => { window.location.href = "/api/auth/google"; };

    const generateEmail = async () => {
        if (!context.trim() || !apiKey.trim()) return;
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setIsGenerating(true);
        setEmail("");
        setGenSubject("");
        setSendStatus("idle");
        setSendError("");

        try {
            const res = await fetch("/api/automation/gmail/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to, subject, context, style, emailType, provider, model, apiKey,
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
                        if (evt.type === "subject") setGenSubject(evt.content as string);
                        if (evt.type === "token") setEmail(p => p + (evt.content as string));
                    } catch { /* skip */ }
                }
            }
        } catch (e) {
            if ((e as Error).name !== "AbortError") setSendError((e as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const sendEmail = async () => {
        if (!email.trim() || !accessToken || !to.trim()) return;
        setIsSending(true);
        setSendStatus("idle");
        try {
            const res = await fetch("/api/automation/gmail/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to, subject: genSubject || subject, body: email, accessToken }),
            });
            if (!res.ok) throw new Error(await res.text());
            setSendStatus("success");
        } catch (e) {
            setSendStatus("error");
            setSendError((e as Error).message);
        } finally {
            setIsSending(false);
        }
    };

    const copyEmail = () => {
        navigator.clipboard.writeText(`Subject: ${genSubject || subject}\n\n${email}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-dark-bg text-gray-100 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute w-[700px] h-[500px] rounded-full bg-rose-500/8 blur-[180px] top-0 left-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
                <div className="flex items-center justify-between mb-10">
                    <Link href="/automation" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-inter text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    <span className="font-orbitron font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-200 to-white">GMAIL COMPOSER</span>
                    <div className="w-20" />
                </div>

                {/* Connect banner */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-5 rounded-2xl flex items-center justify-between"
                    style={{ background: isConnected ? "rgba(244,63,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${isConnected ? "rgba(244,63,94,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)" }}>
                            <Mail className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <p className="font-orbitron font-bold text-white text-sm">{isConnected ? "Gmail Connected ✓" : "Connect Gmail"}</p>
                            <p className="text-gray-400 font-inter text-xs">{isConnected ? "Ready to send emails" : "OAuth required to send — or copy email to use manually"}</p>
                        </div>
                    </div>
                    {isConnected ? (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                            <span className="font-inter text-sm text-rose-400">Active</span>
                        </div>
                    ) : (
                        <button onClick={handleConnect}
                            className="px-5 py-2.5 rounded-xl font-orbitron text-xs font-black transition-all hover:scale-105"
                            style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "white", boxShadow: "0 0 20px rgba(244,63,94,0.3)" }}>
                            Connect →
                        </button>
                    )}
                </motion.div>

                <div className="grid lg:grid-cols-[380px_1fr] gap-8">
                    {/* Controls */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-2xl border border-white/10 bg-white/3 space-y-4 h-fit">

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📬 TO (recipient)</label>
                            <input value={to} onChange={e => setTo(e.target.value)} placeholder="name@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-rose-500/50 placeholder:text-gray-600 transition-all" />
                        </div>

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📌 SUBJECT (optional)</label>
                            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Leave blank for AI to generate"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-rose-500/50 placeholder:text-gray-600 transition-all" />
                        </div>

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📝 CONTEXT / NOTES</label>
                            <textarea value={context} onChange={e => setContext(e.target.value)} rows={3}
                                placeholder="e.g. Reaching out to discuss a potential collaboration on an AI project"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-inter text-sm focus:outline-none focus:border-rose-500/50 resize-none placeholder:text-gray-600 transition-all" />
                        </div>

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">🎭 EMAIL STYLE</label>
                            <div className="grid grid-cols-3 gap-2">
                                {EMAIL_STYLES.map(s => (
                                    <button key={s} onClick={() => setStyle(s)}
                                        className="py-1.5 px-2 rounded-xl font-inter text-xs transition-all text-center"
                                        style={{ background: style === s ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${style === s ? "#f43f5e" : "rgba(255,255,255,0.08)"}`, color: style === s ? "#fda4af" : "#6b7280" }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block font-orbitron text-xs text-gray-400 tracking-wider mb-2">📂 EMAIL TYPE</label>
                            <div className="grid grid-cols-2 gap-2">
                                {EMAIL_TYPES.map(t => (
                                    <button key={t} onClick={() => setEmailType(t)}
                                        className="py-1.5 px-2 rounded-xl font-inter text-xs transition-all text-center"
                                        style={{ background: emailType === t ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${emailType === t ? "#f43f5e" : "rgba(255,255,255,0.08)"}`, color: emailType === t ? "#fda4af" : "#6b7280" }}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Primary AI */}
                        <div>
                            <label className="block font-orbitron text-xs text-rose-400 tracking-wider mb-2">🤖 PRIMARY AI (Composer)</label>
                            <ProviderDropdown
                                provider={provider} model={model} apiKey={apiKey}
                                onProvider={setProvider} onModel={setModel} onApiKey={setApiKey}
                                accentColor="#f43f5e" />
                        </div>

                        {/* Secondary AI toggle */}
                        <div>
                            <button onClick={() => setUseSecondAI(s => !s)}
                                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-inter text-sm"
                                style={{ background: useSecondAI ? "rgba(244,63,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${useSecondAI ? "rgba(244,63,94,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                                <span className="font-orbitron text-xs" style={{ color: useSecondAI ? "#fda4af" : "#6b7280" }}>🤖 ADD SECOND AI (Subject Generator)</span>
                                <span className="text-[10px] font-inter" style={{ color: useSecondAI ? "#f43f5e" : "#4b5563" }}>{useSecondAI ? "ON" : "OFF"}</span>
                            </button>
                            <AnimatePresence>
                                {useSecondAI && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 overflow-hidden">
                                        <ProviderDropdown
                                            provider={provider2} model={model2} apiKey={apiKey2}
                                            onProvider={setProvider2} onModel={setModel2} onApiKey={setApiKey2}
                                            accentColor="#fb7185" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generateEmail}
                            disabled={isGenerating || !context.trim() || !apiKey.trim()}
                            className="w-full py-4 rounded-xl font-orbitron font-black text-sm flex items-center justify-center gap-3 disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "white", boxShadow: "0 0 30px rgba(244,63,94,0.3)" }}>
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            {isGenerating ? "COMPOSING..." : "COMPOSE EMAIL"}
                        </motion.button>
                    </motion.div>

                    {/* Email preview */}
                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/3 min-h-[360px]">
                            {genSubject && (
                                <div className="mb-4 pb-3 border-b border-white/10">
                                    <span className="font-orbitron text-[10px] text-gray-500 tracking-widest">SUBJECT</span>
                                    <p className="text-white font-inter text-sm font-semibold mt-1">{genSubject}</p>
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-orbitron text-xs text-gray-400 tracking-wider">EMAIL BODY</span>
                                {email && (
                                    <button onClick={copyEmail} className="flex items-center gap-1.5 text-xs font-inter text-gray-400 hover:text-white transition-colors">
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? "Copied!" : "Copy All"}
                                    </button>
                                )}
                            </div>
                            {email ? (
                                <textarea value={email} onChange={e => setEmail(e.target.value)} rows={14}
                                    className="w-full bg-transparent text-gray-200 font-inter text-sm leading-relaxed resize-none focus:outline-none"
                                    style={{ minHeight: 260 }} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-600">
                                    <Mail className="w-10 h-10" />
                                    <p className="font-inter text-sm">Your composed email will appear here</p>
                                </div>
                            )}
                            {isGenerating && <span className="inline-block w-1 h-4 bg-rose-500 animate-pulse" />}
                        </div>

                        {email && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-end">
                                <button onClick={copyEmail}
                                    className="px-4 py-2.5 rounded-xl font-orbitron text-xs border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2">
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} Copy Email
                                </button>
                                {isConnected && (
                                    <button onClick={sendEmail} disabled={isSending || !to.trim()}
                                        className="px-5 py-2.5 rounded-xl font-orbitron text-xs font-black flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-105"
                                        style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "white" }}>
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        SEND EMAIL
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {sendError && (
                            <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/40 text-red-400 font-inter text-sm flex gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {sendError}
                            </div>
                        )}

                        <AnimatePresence>
                            {sendStatus === "success" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-4 rounded-xl bg-green-900/20 border border-green-500/40 text-green-400 font-inter text-sm">
                                    ✅ Email sent successfully via Gmail!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
