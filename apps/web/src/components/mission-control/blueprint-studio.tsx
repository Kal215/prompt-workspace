"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Users,
  Send,
  Loader2,
  Workflow,
  ChevronDown,
  FileCode2,
  ShieldAlert,
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

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Banner / Hero Info: IDE-Grade Ribbon */}
      <div className="p-3.5 sm:p-4 rounded-lg border border-border/80 bg-card/60 shadow-2xs backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
              PIEW Core v2.4+
            </span>
            <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Universal Meta-Blueprint &amp; Master Synthesis</span>
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sintesis cetak biru 10-bagian dengan diagram Mermaid otomatis, isolasi batasan mutlak, roadmap 6 fase, dan anti-scope-creep.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {result?.blueprint?.renderedMasterPrompt && (
            <button
              type="button"
              onClick={handleCopyMasterPrompt}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground transition-all cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              <span>{copied ? "Tersalin!" : "Copy Master Prompt"}</span>
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
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer shadow-none"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Kirim ke Supervision Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form Input (Left) & Blueprint Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Input Form Column (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 p-4 rounded-lg border border-border/80 bg-card/60 shadow-2xs">
          <form onSubmit={handleSynthesize} className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                  <FileCode2 className="h-3 w-3 text-primary" />
                  <span>Target Kebutuhan Proyek *</span>
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {goal.length} chars
                </span>
              </div>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                required
                placeholder="Tuliskan spesifikasi produk atau modul yang ingin dirancang..."
                className="w-full text-xs p-2.5 rounded-md border border-border/80 bg-zinc-950/30 dark:bg-zinc-950/70 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-foreground/20 font-mono leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                  <span>Batasan Mutlak (Anti-Scope-Creep)</span>
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">1 per baris</span>
              </div>
              <textarea
                value={negativeConstraints}
                onChange={(e) => setNegativeConstraints(e.target.value)}
                rows={3}
                placeholder="Contoh: DILARANG membuat modul POS fisik..."
                className="w-full text-xs p-2.5 rounded-md border border-border/80 bg-zinc-950/30 dark:bg-zinc-950/70 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-foreground/20 font-mono text-[11px] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Arketipe Domain
                </label>
                <div className="relative">
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full h-8 rounded-md border border-border/80 bg-background/80 px-2.5 pr-7 text-xs font-mono appearance-none focus:outline-hidden focus:ring-1 focus:ring-foreground/20 cursor-pointer"
                  >
                    <option value="coding">Software Engineering</option>
                    <option value="debugging">Debugging &amp; Investigation</option>
                    <option value="academic">Academic &amp; Research</option>
                    <option value="business">Business &amp; Architecture</option>
                    <option value="general">Universal General</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Level Audiens
                </label>
                <div className="relative">
                  <select
                    value={audienceLevel}
                    onChange={(e) => setAudienceLevel(e.target.value)}
                    className="w-full h-8 rounded-md border border-border/80 bg-background/80 px-2.5 pr-7 text-xs font-mono appearance-none focus:outline-hidden focus:ring-1 focus:ring-foreground/20 cursor-pointer"
                  >
                    <option value="specialist">Specialist (Dewan Ahli)</option>
                    <option value="professional">Professional</option>
                    <option value="academic">Academic</option>
                    <option value="student">Student / Basic</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !goal.trim()}
              className="w-full h-9 rounded-md bg-foreground text-background font-medium text-xs flex items-center justify-center gap-2 hover:bg-foreground/90 transition-all shadow-none disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mensintesis 10-Bagian Meta-Blueprint...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Sintesis Universal Blueprint &amp; Diagram</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="pt-2.5 border-t border-border/50">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1.5 font-semibold">
              Preset Rekayasa Cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setGoal("Buat website toko kue dengan stok barang dan laporan penjualan. Jangan buat POS.");
                  setNegativeConstraints("Jangan buat POS\nJangan gunakan mockup data di production");
                  setDomain("coding");
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
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
                className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                🐛 Debug WebSocket (MPS-002)
              </button>
            </div>
          </div>
        </div>

        {/* Blueprint Visualizer Column (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {!result ? (
            <div className="p-6 rounded-lg border border-border/80 bg-card/40 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-muted/60 border border-border/70 flex items-center justify-center text-primary">
                    <Workflow className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono">
                      Meta-Blueprint Synthesis Engine
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Diagram arsitektur Mermaid, dewan pakar, dan kontrak 6 fase tervalidasi.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono border border-border/80 px-1.5 py-0.2 rounded text-muted-foreground">
                  AWAITING INPUT
                </span>
              </div>

              {/* 4 Architecture Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-md border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground block font-semibold">PILLAR 01</span>
                  <span className="font-semibold text-foreground text-xs block">Mermaid Topology</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Visualisasi aliran data, relasi entitas, dan state machine modul.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground block font-semibold">PILLAR 02</span>
                  <span className="font-semibold text-foreground text-xs block">6-Phase Execution</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Roadmap sekuensial dengan deliverables terverifikasi per tahap.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground block font-semibold">PILLAR 03</span>
                  <span className="font-semibold text-foreground text-xs block">Specialist Council</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pemisahan peran dewan pakar multidisiplin untuk meninjau artefak.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground block font-semibold">PILLAR 04</span>
                  <span className="font-semibold text-foreground text-xs block">Zero-Trust Master Prompt</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Prompt siap guna untuk Cursor, Claude Code, atau eksekusi agen mandiri.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-md border border-border/50 bg-zinc-950/40 dark:bg-zinc-950/60 font-mono text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Klik &quot;Sintesis Universal Blueprint &amp; Diagram&quot; untuk memulai</span>
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Deterministic Engine
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Live Engine Indicator Badge */}
              {result.metadata && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    {result.metadata.synthesisMode === "live_llm_dynamic" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        🔥 LIVE LLM DYNAMIC ({result.metadata.providerId || "groq"})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] font-medium border border-zinc-500/20">
                        ⚡ DETERMINISTIC FALLBACK
                      </span>
                    )}
                    {result.metadata.mcpEnriched && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-medium border border-sky-500/20">
                        🔌 MCP Grounded
                      </span>
                    )}
                  </div>
                  {result.metadata.latencyMs && (
                    <span className="text-[11px] text-zinc-400 font-mono">
                      ⏱ {result.metadata.latencyMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Header Tab Selector: Unified Segmented Strip */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("diagrams")}
                  className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    activeTab === "diagrams"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📊 Diagram ({result.mermaidDiagrams?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("phases")}
                  className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    activeTab === "phases"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛣 Roadmap 6 Fase ({result.phases?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("experts")}
                  className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    activeTab === "experts"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  👥 Dewan Pakar ({result.blueprint?.roles?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prompt")}
                  className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    activeTab === "prompt"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📜 Master Prompt
                </button>
              </div>

              {/* Tab 1: Diagrams */}
              {activeTab === "diagrams" && (
                <div className="flex flex-col gap-3">
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
                    <div className="p-6 text-center text-xs text-muted-foreground rounded-lg border border-border/70 bg-card/40">
                      Tidak ada diagram visual yang dihasilkan untuk kriteria ini.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Execution Phases */}
              {activeTab === "phases" && (
                <div className="flex flex-col gap-2.5">
                  {result.phases &&
                    result.phases.map((ph: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-border/80 bg-card/60 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono text-[10px] flex items-center justify-center font-bold">
                              {ph.phaseNumber ?? idx}
                            </span>
                            <h4 className="text-xs font-semibold text-foreground">
                              {ph.title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {ph.deliverables?.length || 0} Deliverables
                          </span>
                        </div>

                        {/* Tasks */}
                        {ph.tasks && ph.tasks.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-mono">
                              Tugas Utama:
                            </span>
                            <ul className="space-y-1">
                              {ph.tasks.map((t: string, tidx: number) => (
                                <li
                                  key={tidx}
                                  className="text-xs text-muted-foreground flex items-start gap-1.5"
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
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                            {ph.deliverables.map((d: string, didx: number) => (
                              <span
                                key={didx}
                                className="px-2 py-0.5 text-[10px] font-mono rounded bg-muted/40 text-foreground border border-border/60"
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
                <div className="flex flex-col gap-3">
                  {/* Dewan Pakar */}
                  <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 shadow-2xs space-y-2.5">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase font-mono tracking-wider text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tim Dewan Pakar Multidisiplin</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.blueprint?.roles?.map((r: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-md border border-border/60 bg-muted/20 flex items-center gap-2"
                        >
                          <div className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs text-foreground font-medium">
                            {r}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Negative Constraints & DoD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 shadow-2xs space-y-2">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase font-mono tracking-wider text-muted-foreground">
                        <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                        <span>Guardrails Mutlak</span>
                      </h4>
                      <ul className="space-y-1">
                        {result.blueprint?.negativeConstraints?.map((c: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                          >
                            <span className="text-destructive font-bold shrink-0">✕</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-lg border border-border/80 bg-card/60 shadow-2xs space-y-2">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase font-mono tracking-wider text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Definition of Done</span>
                      </h4>
                      <ul className="space-y-1">
                        {result.blueprint?.definitionOfDone?.map((d: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-[11px] text-muted-foreground flex items-start gap-1.5"
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
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                      Master Prompt Markdown (Siap Digunakan di Cursor / Claude Code):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMasterPrompt}
                      className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-medium font-mono cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Tersalin!" : "Salin Teks"}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg border border-border/80 bg-zinc-950 text-foreground font-mono text-[11px] max-h-[500px] overflow-auto whitespace-pre-wrap leading-relaxed shadow-2xs">
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
