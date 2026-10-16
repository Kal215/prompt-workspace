"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Users,
  Code2,
  ChevronDown,
  ChevronRight,
  Send,
  Loader2,
  ExternalLink,
  Workflow,
  Target,
  FileSpreadsheet,
} from "lucide-react";
import { MermaidViewer } from "./mermaid-viewer";

interface BlueprintStudioProps {
  onStartSupervision?: (blueprintData: {
    goal: string;
    constraints: string[];
    blueprint: any;
  }) => void;
}

export function BlueprintStudio({ onStartSupervision }: BlueprintStudioProps) {
  const [goal, setGoal] = useState<string>(
    "Buat sistem kasir toko roti dengan manajemen stok barang dan laporan laba rugi. DILARANG membuat modul POS fisik."
  );
  const [negativeConstraints, setNegativeConstraints] = useState<string>(
    "DILARANG membuat modul POS fisik\nDILARANG menggunakan mock/dummy data di production"
  );
  const [domain, setDomain] = useState<string>("coding");
  const [audienceLevel, setAudienceLevel] = useState<string>("specialist");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"diagrams" | "phases" | "experts" | "prompt">("diagrams");
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({
    phases: true,
    diagrams: true,
    experts: true,
  });

  const handleSynthesize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goal.trim()) return;

    setIsLoading(true);
    setError(null);

    const constraintsList = negativeConstraints
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      const resp = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim(),
          constraints: constraintsList,
          domain,
          audienceLevel,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Gagal menghasilkan Universal Meta-Blueprint");
      }

      setResult(data);
    } catch (err: unknown) {
      console.error("[BLUEPRINT_SYNTHESIS_ERROR]", err);
      setError((err as Error)?.message || "Terjadi kesalahan saat memproses blueprint.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMasterPrompt = async () => {
    if (!result?.blueprint?.renderedMasterPrompt) return;
    try {
      await navigator.clipboard.writeText(result.blueprint.renderedMasterPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner / Hero Info */}
      <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                PIEW Core v2.4+
              </span>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Universal Meta-Blueprint & Master Synthesis
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sintesis cetak biru 10-bagian dengan diagram Mermaid otomatis, pemisahan asumsi, 6 fase eksekusi terverifikasi, dan batasan anti-scope-creep.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {result?.blueprint?.renderedMasterPrompt && (
              <button
                type="button"
                onClick={handleCopyMasterPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Tersalin ke Clipboard!" : "Copy Master Prompt for Cursor / Claude"}</span>
              </button>
            )}
            {result && onStartSupervision && (
              <button
                type="button"
                onClick={() =>
                  onStartSupervision({
                    goal,
                    constraints: negativeConstraints.split("\n").filter(Boolean),
                    blueprint: result.blueprint,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-black transition-colors shadow-xs"
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Kirim ke Supervision Console</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Form Input (Left) & Blueprint Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Form Column (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
          <form onSubmit={handleSynthesize} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Target Kebutuhan Proyek / Ide Utama
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                required
                placeholder="Tuliskan spesifikasi produk atau modul yang ingin dirancang..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  Batasan Larangan Mutlak (Anti-Scope-Creep)
                </label>
                <span className="text-[10px] text-zinc-400">1 per baris</span>
              </div>
              <textarea
                value={negativeConstraints}
                onChange={(e) => setNegativeConstraints(e.target.value)}
                rows={3}
                placeholder="Contoh: DILARANG membuat modul POS fisik..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Arketipe Domain
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="coding">Software Engineering</option>
                  <option value="debugging">Debugging & Investigation</option>
                  <option value="academic">Academic & Research</option>
                  <option value="business">Business & Architecture</option>
                  <option value="general">Universal General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Level Audiens
                </label>
                <select
                  value={audienceLevel}
                  onChange={(e) => setAudienceLevel(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="specialist">Specialist (Dewan Ahli)</option>
                  <option value="professional">Professional</option>
                  <option value="academic">Academic</option>
                  <option value="student">Student / Basic</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !goal.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-xs flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mensintesis 10-Bagian Meta-Blueprint...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Sintesis Universal Blueprint & Diagram</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
            <span className="text-[11px] font-medium text-zinc-400 block mb-2">Preset Contoh Kasus:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setGoal("Buat website toko kue dengan stok barang dan laporan penjualan. Jangan buat POS.");
                  setNegativeConstraints("Jangan buat POS\nJangan gunakan mockup data di production");
                  setDomain("coding");
                }}
                className="text-[10px] px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                🍰 Toko Kue (MPS-001)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoal("Investigasi race condition dan memory leak pada WebSocket server node.js");
                  setNegativeConstraints("Dilarang restart server secara membabi buta tanpa root-cause");
                  setDomain("debugging");
                }}
                className="text-[10px] px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                🐛 Debugging WebSocket (MPS-002)
              </button>
            </div>
          </div>
        </div>

        {/* Blueprint Visualizer Column (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {!result ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                <Workflow className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Blueprint Belum Dihasilkan
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Ketikkan spesifikasi sistem di form sebelah kiri dan klik tombol <strong>Sintesis</strong> untuk menghasilkan diagram Mermaid deklaratif dan roadmap 6 fase pengerjaan.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Header Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("diagrams")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "diagrams"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  📊 Diagram Mermaid ({result.mermaidDiagrams?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("phases")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "phases"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  🛣 Roadmap 6 Fase ({result.phases?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("experts")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "experts"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  👥 Dewan Pakar ({result.blueprint?.roles?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prompt")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "prompt"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  📜 Master Prompt
                </button>
              </div>

              {/* Tab 1: Diagrams */}
              {activeTab === "diagrams" && (
                <div className="flex flex-col gap-4">
                  {result.mermaidDiagrams && result.mermaidDiagrams.length > 0 ? (
                    result.mermaidDiagrams.map((diag: any, idx: number) => (
                      <MermaidViewer
                        key={idx}
                        title={diag.title || `Diagram ${idx + 1}`}
                        description={diag.description}
                        chart={diag.mermaidCode}
                      />
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-zinc-500 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      Tidak ada diagram visual yang dihasilkan untuk kriteria ini.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Execution Phases */}
              {activeTab === "phases" && (
                <div className="flex flex-col gap-3">
                  {result.phases &&
                    result.phases.map((ph: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs flex items-center justify-center font-bold">
                              {ph.phaseNumber ?? idx}
                            </span>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {ph.title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {ph.deliverables?.length || 0} Deliverables
                          </span>
                        </div>

                        {/* Tasks */}
                        {ph.tasks && ph.tasks.length > 0 && (
                          <div className="mb-2.5">
                            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                              Tugas Utama:
                            </span>
                            <ul className="mt-1 space-y-1">
                              {ph.tasks.map((t: string, tidx: number) => (
                                <li
                                  key={tidx}
                                  className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5"
                                >
                                  <span className="text-amber-500 font-bold shrink-0">•</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Deliverables tags */}
                        {ph.deliverables && ph.deliverables.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                            {ph.deliverables.map((d: string, didx: number) => (
                              <span
                                key={didx}
                                className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 3: Experts & Objectives */}
              {activeTab === "experts" && (
                <div className="flex flex-col gap-4">
                  {/* Dewan Pakar */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-3">
                      <Users className="w-4 h-4 text-amber-500" />
                      Tim Dewan Pakar Multidisiplin
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.blueprint?.roles?.map((r: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                            {r}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Negative Constraints & DoD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-2">
                        <ShieldCheck className="w-4 h-4 text-red-500" />
                        Guardrails & Batasan Mutlak
                      </h4>
                      <ul className="space-y-1.5">
                        {result.blueprint?.negativeConstraints?.map((c: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5"
                          >
                            <span className="text-red-500 font-bold shrink-0">✕</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Definition of Done (Kriteria Tuntas)
                      </h4>
                      <ul className="space-y-1.5">
                        {result.blueprint?.definitionOfDone?.map((d: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5"
                          >
                            <span className="text-emerald-500 font-bold shrink-0">✓</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Raw Master Prompt */}
              {activeTab === "prompt" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">
                      Master Prompt Markdown (Siap Digunakan di Cursor / Claude Code):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMasterPrompt}
                      className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-medium"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Tersalin!" : "Salin Teks"}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-200 font-mono text-[11px] max-h-[500px] overflow-auto whitespace-pre-wrap leading-relaxed">
                    {result.blueprint?.renderedMasterPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
