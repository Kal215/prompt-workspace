"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCcw,
  Copy,
  Sliders,
  Code2,
  History,
  Languages,
  Check,
  SplitSquareVertical,
  Eye,
  EyeOff,
  GitCompare,
  Trophy,
  Trash2,
  Cpu,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { MarkdownView } from "@/components/ui/markdown-view";
import { useLanguage } from "@/hooks/use-language";
import PlaygroundHistorySheet from "@/components/workspace/playground-history-sheet";
import { PlaygroundCodeModal } from "@/components/workspace/playground-code-modal";
import { PlaygroundDiffView } from "@/components/workspace/playground-diff-view";
import type { PlaygroundHistoryRecord } from "@/app/api/playground-history/route";

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  model: string;
}

interface ExecutionResult {
  output: string;
  latencyMs: number;
  tokensUsed: number;
  model: string;
  provider: string;
  error?: string;
}

export default function PlaygroundPage() {
  const { lang, setLang } = useLanguage();

  // Mode: single model vs arena (side-by-side)
  const [mode, setMode] = useState<"single" | "arena">("arena");
  const [activeOutputTab, setActiveOutputTab] = useState<"cards" | "diff">("cards");

  // Prompt & System Prompt
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // Parameters
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [showParams, setShowParams] = useState(false);

  // Models
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelA, setSelectedModelA] = useState("");
  const [selectedModelB, setSelectedModelB] = useState("");

  // Results & Loading
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [resultA, setResultA] = useState<ExecutionResult | null>(null);
  const [resultB, setResultB] = useState<ExecutionResult | null>(null);
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  // Blind test & Voting
  const [isBlind, setIsBlind] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [votedWinner, setVotedWinner] = useState<"A" | "B" | "tie" | null>(null);

  // History & Code Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch models list from API
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/providers");
        const json = await res.json();
        const opts: ModelOption[] = [];

        if (json.success && json.providers) {
          for (const [providerId, pData] of Object.entries<any>(json.providers)) {
            if (pData.configured && Array.isArray(pData.models)) {
              for (const m of pData.models) {
                opts.push({
                  id: `${providerId}:${m}`,
                  name: `${pData.name} - ${m}`,
                  provider: pData.name,
                  providerId,
                  model: m,
                });
              }
            }
          }
        }

        if (opts.length > 0) {
          setModels(opts);
          setSelectedModelA(opts[0].id);
          setSelectedModelB(opts.length > 1 ? opts[1].id : opts[0].id);
        } else {
          const fallback: ModelOption[] = [
            {
              id: "groq:llama-3.3-70b-versatile",
              name: "Groq - Llama 3.3 70B",
              provider: "Groq",
              providerId: "groq",
              model: "llama-3.3-70b-versatile",
            },
            {
              id: "groq:mixtral-8x7b-32768",
              name: "Groq - Mixtral 8x7B",
              provider: "Groq",
              providerId: "groq",
              model: "mixtral-8x7b-32768",
            },
          ];
          setModels(fallback);
          setSelectedModelA(fallback[0].id);
          setSelectedModelB(fallback[1]?.id || fallback[0].id);
        }
      } catch {
        const fallback: ModelOption[] = [
          {
            id: "groq:llama-3.3-70b-versatile",
            name: "Groq - Llama 3.3 70B",
            provider: "Groq",
            providerId: "groq",
            model: "llama-3.3-70b-versatile",
          },
        ];
        setModels(fallback);
        setSelectedModelA(fallback[0].id);
        setSelectedModelB(fallback[0].id);
      }
    }
    loadModels();
  }, []);

  // Fetch initial history count
  const refreshHistoryCount = async () => {
    try {
      const res = await fetch("/api/playground-history");
      const json = await res.json();
      if (res.ok && json.success) {
        setHistoryCount(json.count || 0);
      }
    } catch {}
  };

  useEffect(() => {
    refreshHistoryCount();
    if (typeof window !== "undefined") {
      const transferPrompt = sessionStorage.getItem("piew_playground_prompt");
      if (transferPrompt) {
        setPrompt(transferPrompt);
        sessionStorage.removeItem("piew_playground_prompt");
      }
    }
  }, []);

  // Execute single model
  const executeSingle = async (
    targetModel: ModelOption,
    setter: (val: ExecutionResult | null) => void,
    setLoading: (val: boolean) => void
  ): Promise<ExecutionResult | null> => {
    setLoading(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          prompt,
          systemInstruction: systemPrompt || undefined,
          providerId: targetModel.providerId,
          model: targetModel.model,
          parameters: {
            temperature,
            topP,
            maxTokens,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Model execution failed");
      }

      const resObj: ExecutionResult = {
        output: data.data?.output || data.output || "",
        latencyMs: data.data?.latencyMs || data.latencyMs || 0,
        tokensUsed: data.data?.tokenUsage?.total || data.tokensUsed || 0,
        model: targetModel.model,
        provider: targetModel.provider,
      };
      setter(resObj);
      return resObj;
    } catch (err: any) {
      const errObj: ExecutionResult = {
        output: `Error: ${err.message}`,
        latencyMs: 0,
        tokensUsed: 0,
        model: targetModel.model,
        provider: targetModel.provider,
        error: err.message,
      };
      setter(errObj);
      return errObj;
    } finally {
      setLoading(false);
    }
  };

  // Run execution (single or arena)
  const handleRun = async () => {
    if (!prompt.trim()) {
      toast.error(lang === "en" ? "Please enter a prompt first" : "Silakan masukkan prompt terlebih dahulu");
      return;
    }

    const modelObjA = models.find((m) => m.id === selectedModelA) || models[0];
    const modelObjB = models.find((m) => m.id === selectedModelB) || models[1] || models[0];

    if (!modelObjA) {
      toast.error(lang === "en" ? "No models configured" : "Belum ada model yang terpasang");
      return;
    }

    setResultA(null);
    setResultB(null);
    setRevealed(!isBlind);
    setVotedWinner(null);
    setActiveOutputTab("cards");

    let finalA: ExecutionResult | null = null;
    let finalB: ExecutionResult | null = null;

    if (mode === "single") {
      finalA = await executeSingle(modelObjA, setResultA, setLoadingA);
    } else {
      const [resA, resB] = await Promise.all([
        executeSingle(modelObjA, setResultA, setLoadingA),
        executeSingle(modelObjB, setResultB, setLoadingB),
      ]);
      finalA = resA;
      finalB = resB;
    }

    // Auto-save session to history
    try {
      await fetch("/api/playground-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          prompt,
          systemPrompt: systemPrompt || undefined,
          mode,
          modelA: {
            id: modelObjA.id,
            name: modelObjA.name,
            providerId: modelObjA.providerId,
            model: modelObjA.model,
            output: finalA?.output,
            latencyMs: finalA?.latencyMs,
            tokensUsed: finalA?.tokensUsed,
            error: finalA?.error,
          },
          modelB:
            mode === "arena" && modelObjB
              ? {
                  id: modelObjB.id,
                  name: modelObjB.name,
                  providerId: modelObjB.providerId,
                  model: modelObjB.model,
                  output: finalB?.output,
                  latencyMs: finalB?.latencyMs,
                  tokensUsed: finalB?.tokensUsed,
                  error: finalB?.error,
                }
              : null,
          parameters: {
            temperature,
            topP,
            maxTokens,
          },
          isBlind,
        }),
      });
      refreshHistoryCount();
    } catch {}
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  // Copy helper
  const handleCopy = async (text: string, which: "A" | "B") => {
    await navigator.clipboard.writeText(text);
    if (which === "A") {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 2000);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 2000);
    }
    toast.success(lang === "en" ? "Copied to clipboard" : "Tersalin ke clipboard");
  };

  // Vote winner in blind mode
  const handleVote = (winner: "A" | "B" | "tie") => {
    setVotedWinner(winner);
    setRevealed(true);
    toast.success(
      lang === "en"
        ? `Vote registered: ${winner === "tie" ? "Both are Equal" : `Model ${winner}`}!`
        : `Pilihan tercatat: ${winner === "tie" ? "Keduanya Seimbang" : `Model ${winner}`}!`
    );
  };

  // Restore session from history
  const handleSelectHistoryRecord = (record: PlaygroundHistoryRecord) => {
    setPrompt(record.prompt);
    if (record.systemPrompt) setSystemPrompt(record.systemPrompt);
    setMode(record.mode);
    setTemperature(record.parameters.temperature ?? 0.7);
    setTopP(record.parameters.topP ?? 0.9);
    setMaxTokens(record.parameters.maxTokens ?? 2048);

    if (record.modelA) {
      const matchA = models.find((m) => m.model === record.modelA.model || m.id === record.modelA.id);
      if (matchA) setSelectedModelA(matchA.id);
      setResultA({
        output: record.modelA.output || "",
        latencyMs: record.modelA.latencyMs || 0,
        tokensUsed: record.modelA.tokensUsed || 0,
        model: record.modelA.model,
        provider: record.modelA.providerId,
        error: record.modelA.error,
      });
    }

    if (record.modelB) {
      const matchB = models.find((m) => m.model === record.modelB?.model || m.id === record.modelB?.id);
      if (matchB) setSelectedModelB(matchB.id);
      setResultB({
        output: record.modelB.output || "",
        latencyMs: record.modelB.latencyMs || 0,
        tokensUsed: record.modelB.tokensUsed || 0,
        model: record.modelB.model,
        provider: record.modelB.providerId,
        error: record.modelB.error,
      });
    } else {
      setResultB(null);
    }

    setIsBlind(Boolean(record.isBlind));
    setRevealed(true);
    setVotedWinner(record.winner || null);
    setIsHistoryOpen(false);

    toast.success(lang === "en" ? "Playground session restored" : "Sesi Playground dipulihkan");
  };

  const modelObjA = models.find((m) => m.id === selectedModelA) || models[0];
  const modelObjB = models.find((m) => m.id === selectedModelB) || models[1] || models[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf9f6]">
      {/* Sidebar with activeMode="Playground" */}
      <WorkspaceSidebar activeMode="Playground" />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Minimalist Top Header */}
        <header className="px-6 py-3.5 border-b border-stone-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold tracking-tight text-stone-900">
              PLAYGROUND
            </h1>

            {/* Mode Switcher: Single vs Arena */}
            <div className="flex items-center p-0.5 rounded-xl bg-stone-100 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                  mode === "single"
                    ? "bg-white text-stone-900 font-semibold shadow-2xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {lang === "en" ? "Single Model" : "1 Model"}
              </button>
              <button
                type="button"
                onClick={() => setMode("arena")}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  mode === "arena"
                    ? "bg-white text-stone-900 font-semibold shadow-2xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <SplitSquareVertical className="w-3 h-3" />
                <span>{lang === "en" ? "Arena (2 Models)" : "Bandingkan 2 Model"}</span>
              </button>
            </div>

            {/* Blind Mode Toggle (Arena Only) */}
            {mode === "arena" && (
              <button
                type="button"
                onClick={() => {
                  setIsBlind(!isBlind);
                  if (!isBlind) setRevealed(false);
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isBlind
                    ? "bg-purple-50 border-purple-200 text-purple-700 font-semibold"
                    : "bg-white border-stone-200 text-stone-500 hover:text-stone-900"
                }`}
                title={lang === "en" ? "Hide model names to prevent bias" : "Samarkan nama model untuk uji obyektif"}
              >
                {isBlind ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{lang === "en" ? "Blind Test" : "Uji Buta"}</span>
              </button>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Parameters Toggle */}
            <button
              type="button"
              onClick={() => setShowParams(!showParams)}
              className={`p-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                showParams
                  ? "bg-stone-900 border-stone-900 text-white"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
              title={lang === "en" ? "Toggle parameters inspector" : "Buka kontrol parameter"}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === "en" ? "Params" : "Parameter"}</span>
            </button>

            {/* Export Code Modal */}
            <button
              type="button"
              onClick={() => setIsCodeModalOpen(true)}
              className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title={lang === "en" ? "Export to Code / cURL" : "Ekspor ke Kode / cURL"}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === "en" ? "Export" : "Ekspor"}</span>
            </button>

            {/* History Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title={lang === "en" ? "Playground History" : "Riwayat Playground"}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === "en" ? "History" : "Riwayat"}</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-stone-900 text-white text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "id" : "en")}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-stone-400" />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>
        </header>

        {/* Collapsible Parameter Bar */}
        {showParams && (
          <div className="px-6 py-3 border-b border-stone-200/80 bg-stone-50/70 flex flex-wrap items-center gap-6 text-xs font-mono shrink-0 animate-in slide-in-from-top-1 duration-200">
            {/* Temperature Slider */}
            <div className="flex items-center gap-2">
              <span className="text-stone-500">Temperature:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-24 accent-stone-900 cursor-pointer"
              />
              <span className="font-bold text-stone-900 w-8">{temperature.toFixed(2)}</span>
            </div>

            {/* Top-P Slider */}
            <div className="flex items-center gap-2">
              <span className="text-stone-500">Top-P:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-24 accent-stone-900 cursor-pointer"
              />
              <span className="font-bold text-stone-900 w-8">{topP.toFixed(2)}</span>
            </div>

            {/* Max Tokens */}
            <div className="flex items-center gap-2">
              <span className="text-stone-500">Max Tokens:</span>
              <select
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value={512}>512</option>
                <option value={1024}>1024</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>

            {/* Toggle System Prompt */}
            <button
              type="button"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="text-stone-600 hover:text-stone-900 underline underline-offset-4 cursor-pointer ml-auto"
            >
              {showSystemPrompt
                ? lang === "en"
                  ? "Hide System Prompt"
                  : "Tutup System Prompt"
                : lang === "en"
                ? "+ Add System Prompt"
                : "+ Tambah System Prompt"}
            </button>
          </div>
        )}

        {/* System Prompt Bar */}
        {showSystemPrompt && (
          <div className="px-6 py-2.5 border-b border-stone-200/80 bg-white shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-stone-400">
                {lang === "en" ? "SYSTEM INSTRUCTION (BEHAVIOR RULES)" : "INSTRUKSI SISTEM"}
              </span>
              <button
                type="button"
                onClick={() => setSystemPrompt("")}
                className="text-[10px] font-mono text-stone-400 hover:text-red-500 cursor-pointer"
              >
                {lang === "en" ? "Clear" : "Bersihkan"}
              </button>
            </div>
            <textarea
              rows={2}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={
                lang === "en"
                  ? "You are a concise, senior system engineer..."
                  : "Anda adalah senior software engineer yang ringkas dan analitis..."
              }
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
            />
          </div>
        )}

        {/* Workspace Body: Split between Input Bar & Output Canvas */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Output Canvas Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Output Sub-Header (Tabs for Arena & Blind Test Reveal) */}
            {mode === "arena" && (resultA || resultB) && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs">
                {/* View Tabs: Side-by-Side vs Diff */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveOutputTab("cards")}
                    className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all cursor-pointer ${
                      activeOutputTab === "cards"
                        ? "bg-stone-900 text-white font-semibold"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {lang === "en" ? "Side-by-Side" : "Berdampingan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOutputTab("diff")}
                    disabled={!resultA || !resultB}
                    className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      activeOutputTab === "diff"
                        ? "bg-stone-900 text-white font-semibold"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Diff Viewer" : "Perbandingan Diff"}</span>
                  </button>
                </div>

                {/* Blind Mode Voting Banner */}
                {isBlind && !revealed && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-700 font-semibold">
                      {lang === "en" ? "Blind Test: Vote Winner" : "Pilih Jawaban Terbaik:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleVote("A")}
                      className="px-2.5 py-1 rounded-lg bg-lime-100 text-lime-900 hover:bg-lime-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      {lang === "en" ? "Model Alpha" : "Model Alpha"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote("B")}
                      className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 hover:bg-sky-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      {lang === "en" ? "Model Beta" : "Model Beta"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote("tie")}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-mono transition-colors cursor-pointer"
                    >
                      {lang === "en" ? "Tie" : "Seimbang"}
                    </button>
                  </div>
                )}

                {/* Blind Test Revealed Status */}
                {isBlind && revealed && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-purple-700" />
                      {votedWinner === "tie"
                        ? "Result: Tie"
                        : `Voted Winner: ${votedWinner === "A" ? "Model A" : "Model B"}`}
                    </span>
                    <span className="text-stone-500">
                      (A: {modelObjA?.model} · B: {modelObjB?.model})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* DIFF VIEW MODE */}
            {mode === "arena" && activeOutputTab === "diff" ? (
              <PlaygroundDiffView
                textA={resultA?.output || ""}
                textB={resultB?.output || ""}
                modelAName={isBlind && !revealed ? "Model Alpha" : modelObjA?.model || "Model A"}
                modelBName={isBlind && !revealed ? "Model Beta" : modelObjB?.model || "Model B"}
                lang={lang}
              />
            ) : mode === "single" ? (
              /* SINGLE MODEL VIEW */
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-stone-500" />
                    <span className="text-xs font-bold text-stone-900 font-mono">
                      {modelObjA?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {resultA && (
                      <span className="text-[11px] font-mono text-stone-500">
                        {resultA.latencyMs}ms · {resultA.tokensUsed} tokens
                      </span>
                    )}
                    {resultA && (
                      <button
                        type="button"
                        onClick={() => handleCopy(resultA.output, "A")}
                        className="text-xs font-mono text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedA ? <Check className="w-3 h-3 text-lime-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedA ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}</span>
                      </button>
                    )}
                  </div>
                </div>

                {loadingA ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-2 text-stone-400">
                    <RotateCcw className="w-6 h-6 animate-spin text-stone-900" />
                    <span className="text-xs font-mono">
                      {lang === "en" ? "Model is thinking..." : "Model sedang berpikir..."}
                    </span>
                  </div>
                ) : resultA ? (
                  <div className="p-5 rounded-2xl bg-[#faf9f6] border border-stone-200/80 max-h-[620px] overflow-y-auto">
                    <MarkdownView content={resultA.output} />
                  </div>
                ) : (
                  <div className="py-24 text-center text-xs text-stone-400 font-mono">
                    {lang === "en"
                      ? "Enter prompt below and click 'Run Model' (Ctrl+Enter) to execute."
                      : "Masukkan prompt di bawah lalu tekan 'Jalankan Model' (Ctrl+Enter)."}
                  </div>
                )}
              </div>
            ) : (
              /* ARENA 2-MODEL VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column Model A */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-lime-800 font-bold px-1.5 py-0.5 rounded bg-lime-100 uppercase">
                        {isBlind && !revealed ? "Model Alpha" : "Model A"}
                      </span>
                      <h4 className="text-xs font-bold text-stone-900">
                        {isBlind && !revealed ? "Hidden Model" : modelObjA?.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      {resultA && (
                        <span className="text-[11px] font-mono text-stone-500">
                          {resultA.latencyMs}ms · {resultA.tokensUsed} tokens
                        </span>
                      )}
                      {resultA && (
                        <button
                          type="button"
                          onClick={() => handleCopy(resultA.output, "A")}
                          className="text-xs font-mono text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedA ? <Check className="w-3 h-3 text-lime-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedA ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingA ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-2 text-stone-400">
                      <RotateCcw className="w-5 h-5 animate-spin text-lime-600" />
                      <span className="text-xs font-mono">
                        {isBlind && !revealed
                          ? lang === "en"
                            ? "Model Alpha is generating..."
                            : "Model Alpha sedang menulis..."
                          : lang === "en"
                          ? "Model A is generating..."
                          : "Model A sedang menulis..."}
                      </span>
                    </div>
                  ) : resultA ? (
                    <div className="p-4 rounded-xl bg-[#faf9f6] border border-stone-200/80 flex-1 max-h-[550px] overflow-y-auto">
                      <MarkdownView content={resultA.output} />
                    </div>
                  ) : (
                    <div className="py-24 text-center text-xs text-stone-400 font-mono">
                      {lang === "en" ? "Ready for Model A execution" : "Menunggu eksekusi Model A"}
                    </div>
                  )}
                </div>

                {/* Column Model B */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-sky-800 font-bold px-1.5 py-0.5 rounded bg-sky-100 uppercase">
                        {isBlind && !revealed ? "Model Beta" : "Model B"}
                      </span>
                      <h4 className="text-xs font-bold text-stone-900">
                        {isBlind && !revealed ? "Hidden Model" : modelObjB?.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      {resultB && (
                        <span className="text-[11px] font-mono text-stone-500">
                          {resultB.latencyMs}ms · {resultB.tokensUsed} tokens
                        </span>
                      )}
                      {resultB && (
                        <button
                          type="button"
                          onClick={() => handleCopy(resultB.output, "B")}
                          className="text-xs font-mono text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedB ? <Check className="w-3 h-3 text-sky-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedB ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingB ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-2 text-stone-400">
                      <RotateCcw className="w-5 h-5 animate-spin text-sky-600" />
                      <span className="text-xs font-mono">
                        {isBlind && !revealed
                          ? lang === "en"
                            ? "Model Beta is generating..."
                            : "Model Beta sedang menulis..."
                          : lang === "en"
                          ? "Model B is generating..."
                          : "Model B sedang menulis..."}
                      </span>
                    </div>
                  ) : resultB ? (
                    <div className="p-4 rounded-xl bg-[#faf9f6] border border-stone-200/80 flex-1 max-h-[550px] overflow-y-auto">
                      <MarkdownView content={resultB.output} />
                    </div>
                  ) : (
                    <div className="py-24 text-center text-xs text-stone-400 font-mono">
                      {lang === "en" ? "Ready for Model B execution" : "Menunggu eksekusi Model B"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Execution Bar (Model Selectors + Prompt + Action Button) */}
          <div className="p-4 border-t border-stone-200/80 bg-white/95 backdrop-blur-md space-y-3 shrink-0">
            {/* Model Selectors Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector Model A */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-stone-500 font-semibold">
                  {mode === "arena" ? (isBlind && !revealed ? "Alpha:" : "Model A:") : "Model:"}
                </span>
                <select
                  value={selectedModelA}
                  onChange={(e) => setSelectedModelA(e.target.value)}
                  disabled={loadingA || loadingB}
                  className="text-xs font-mono rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector Model B (Arena only) */}
              {mode === "arena" && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-stone-500 font-semibold">
                    {isBlind && !revealed ? "Beta:" : "Model B:"}
                  </span>
                  <select
                    value={selectedModelB}
                    onChange={(e) => setSelectedModelB(e.target.value)}
                    disabled={loadingA || loadingB}
                    className="text-xs font-mono rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Character counter & clear */}
              <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-stone-400">
                <span>{prompt.length} chars</span>
                {prompt.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="text-stone-400 hover:text-red-500 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === "en" ? "Clear" : "Hapus"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Prompt Input & Execute Controls */}
            <div className="flex items-end gap-3">
              <textarea
                ref={promptTextareaRef}
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  lang === "en"
                    ? "Type your prompt here... (Press Ctrl+Enter to run)"
                    : "Tulis prompt Anda di sini... (Tekan Ctrl+Enter untuk menjalankan)"
                }
                className="flex-1 text-xs font-mono p-3 rounded-2xl border border-stone-200 bg-stone-50/50 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none shadow-2xs"
              />

              <button
                type="button"
                onClick={handleRun}
                disabled={loadingA || loadingB || !prompt.trim()}
                className="h-[74px] px-6 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0 shadow-xs"
              >
                {loadingA || loadingB ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-lime-400" />
                    <span className="text-[11px] font-mono">
                      {lang === "en" ? "Running..." : "Mengeksekusi..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-lime-400 fill-lime-400" />
                    <span className="font-mono">
                      {mode === "arena"
                        ? lang === "en"
                          ? "Run Arena"
                          : "Jalankan Arena"
                        : lang === "en"
                        ? "Run Model"
                        : "Jalankan"}
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">Ctrl+Enter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Slide-over Drawer Riwayat Playground */}
      <PlaygroundHistorySheet
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRecord={handleSelectHistoryRecord}
        lang={lang}
      />

      {/* Code Export Modal */}
      <PlaygroundCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        prompt={prompt}
        systemPrompt={systemPrompt}
        model={modelObjA?.model || "llama-3.3-70b-versatile"}
        provider={modelObjA?.provider || "Groq"}
        parameters={{
          temperature,
          topP,
          maxTokens,
        }}
        lang={lang}
      />
    </div>
  );
}
