"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { PromptOptimizationResult } from "@/types/prompt";
import { IntentGuardCard } from "./intent-guard-card";
import { FindingsPanel } from "./findings-panel";
import { PromptDiffViewer } from "./prompt-diff-viewer";
import { ChangesTracker } from "./changes-tracker";
import { PlaygroundCard } from "./playground-card";
import { PromptVersionBar } from "./prompt-version-bar";
import { SpiderMatrixPanel } from "./spider-matrix-panel";
import {
  PromptVersionRecord,
  SpiderReportSummary,
  SpiderSecurityFinding,
} from "@/types/v2-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildMarkdownReport,
  buildSafeExportPayload,
  sanitizeExportFilename,
  downloadTextFile,
} from "@/lib/export-utils";
import { toast } from "sonner";
import { motion } from "motion/react";
import gsap from "gsap";
import {
  Activity,
  Clock,
  Zap,
  FileDown,
  FileCode,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  BookmarkCheck,
  LayoutGrid,
  GitCompare,
  ShieldCheck,
  Bug,
  Play,
  Loader2,
  Network,
} from "lucide-react";
import { MermaidViewer } from "../mission-control/mermaid-viewer";

interface ResultDashboardProps {
  result: PromptOptimizationResult;
  onRegenerate: () => void;
  onAccept?: (result: PromptOptimizationResult) => void;
  onRefreshHistory?: () => void;
  onTelemetryAction?: (actionType: "export" | "feedback_helpful" | "feedback_issue") => void;
  versions?: PromptVersionRecord[];
  activeVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
  spiderReport?: SpiderReportSummary | null;
  isSpiderLoading?: boolean;
  onRunSpider?: () => void;
  onRequestRefinement?: (findings: SpiderSecurityFinding[]) => void;
}

export type DashboardTabKey = "all" | "diff" | "evaluation" | "diagrams" | "spider" | "playground";

export function ResultDashboard({
  result,
  onRegenerate,
  onAccept,
  onRefreshHistory,
  onTelemetryAction,
  versions,
  activeVersionId,
  onSelectVersion,
  spiderReport,
  isSpiderLoading,
  onRunSpider,
  onRequestRefinement,
}: ResultDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("all");
  const [activeDiagramIdx, setActiveDiagramIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [utilityFeedback, setUtilityFeedback] = useState<"helpful" | "issue" | null>(null);

  const scoreRef = useRef<HTMLSpanElement>(null);

  const diagrams = useMemo(() => {
    if (Array.isArray(result.mermaidDiagrams) && result.mermaidDiagrams.length > 0) {
      return result.mermaidDiagrams;
    }
    if (Array.isArray(result.universalBlueprint?.diagrams) && result.universalBlueprint.diagrams.length > 0) {
      return result.universalBlueprint.diagrams;
    }
    return [];
  }, [result.mermaidDiagrams, result.universalBlueprint]);

  // Defensive fallbacks to gracefully handle both raw Engine results and enhanced mocks
  const score =
    result.analysis?.score ??
    result.analysis?.overallScore ??
    result.metrics?.clarityScore ??
    85;

  const clarityScore = result.metrics?.clarityScore ?? score;
  const constraintCoverage =
    result.metrics?.constraintCoverage ?? Math.min(95, Math.max(60, score + 10));
  const latencyMs =
    result.metrics?.latencyMs ??
    result.metadata?.processingTimeMs ??
    1150;
  const modelTarget =
    result.metadata?.modelTarget || "Groq llama-3.3-70b-versatile";
  const findings = result.analysis?.findings || [];
  const status = result.analysis?.status || "optimized";

  const activeVersion = versions?.find((v) => v.versionId === activeVersionId);
  const activeVersionNumber = activeVersion?.versionNumber || 1;

  // Animate score counter with GSAP on mount/update
  useEffect(() => {
    if (scoreRef.current) {
      const targetObj = { val: 0 };
      gsap.to(targetObj, {
        val: clarityScore,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => {
          if (scoreRef.current) {
            scoreRef.current.textContent = String(Math.round(targetObj.val));
          }
        },
      });
    }
  }, [clarityScore]);

  const v2Metadata =
    spiderReport || (versions && versions.length > 0)
      ? {
          versionNumber: activeVersionNumber,
          sourceRole: activeVersion?.source || "OPTIMIZER",
          versions: versions?.map((v) => ({
            versionNumber: v.versionNumber,
            sourceRole: v.source,
            createdAt: v.createdAt,
            changeSummary: v.changeSummary,
            criticalGatePassed: v.criticalGatePassed,
            qualityScore: v.qualityScore,
          })),
          spiderReport: spiderReport || undefined,
        }
      : undefined;

  const handleExportMarkdown = () => {
    try {
      const content = buildMarkdownReport(result, v2Metadata);
      const filename = sanitizeExportFilename(result.requestId, "md");
      downloadTextFile(filename, content, "text/markdown;charset=utf-8");
      setExportStatus(`Laporan Markdown berhasil diekspor: ${filename}`);
      toast.success("Laporan Markdown (.md) berhasil diunduh!", {
        description: `Disimpan sebagai ${filename}`,
      });
      onTelemetryAction?.("export");
    } catch (err) {
      console.error("Gagal mengekspor Markdown:", err);
      toast.error("Gagal mengekspor laporan Markdown.");
    }
  };

  const handleExportJson = () => {
    try {
      const payload = buildSafeExportPayload(result, v2Metadata);
      const content = JSON.stringify(payload, null, 2);
      const filename = sanitizeExportFilename(result.requestId, "json");
      downloadTextFile(filename, content, "application/json;charset=utf-8");
      setExportStatus(`Laporan JSON berhasil diekspor: ${filename}`);
      toast.success("Laporan JSON (.json) berhasil diunduh!", {
        description: `Disimpan sebagai ${filename}`,
      });
      onTelemetryAction?.("export");
    } catch (err) {
      console.error("Gagal mengekspor JSON:", err);
      toast.error("Gagal mengekspor data JSON.");
    }
  };

  const handleUtilityFeedback = (type: "helpful" | "issue") => {
    setUtilityFeedback(type);
    if (type === "helpful") {
      toast.success("Terima kasih! Umpan balik tercatat (Perbaikan ini dinilai membantu).");
      onTelemetryAction?.("feedback_helpful");
    } else {
      toast.warning("Laporan risiko makna tercatat untuk peninjauan rubrik.");
      onTelemetryAction?.("feedback_issue");
    }
  };

  const handleCopyPrompt = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.optimizedPrompt).catch(() => {});
      }
      setIsCopied(true);
      toast.success("Prompt hasil rekayasa berhasil disalin ke clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin prompt.");
    }
  };

  const handleAcceptAndSave = async () => {
    setIsSaving(true);
    try {
      // 1. Copy ke clipboard
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.optimizedPrompt).catch(() => {});
      }

      // 2. Format data intent summary
      const intentSummary =
        typeof result.detectedIntent === "string"
          ? result.detectedIntent
          : result.detectedIntent?.summary || null;

      // 3. Simpan ke database via POST /api/history
      const response = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: result.requestId || undefined,
          originalPrompt: result.originalPrompt,
          optimizedPrompt: result.optimizedPrompt,
          intentSummary,
          score,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan ke database.");
      }

      toast.success("Prompt diterima dan disimpan ke database!", {
        description:
          "Versi teroptimasi disalin ke clipboard dan tersimpan permanen di database SQLite.",
      });

      onAccept?.(result);
      onRefreshHistory?.();
    } catch (err) {
      console.error("Gagal menyimpan ke database:", err);
      toast.warning("Prompt disalin ke clipboard, tapi gagal tersimpan ke database.", {
        description:
          err instanceof Error ? err.message : "Periksa koneksi database SQLite.",
      });
      onAccept?.(result);
    } finally {
      setIsSaving(false);
    }
  };

  const tabsConfig = [
    { key: "all", label: "Ringkasan Eksekutif", icon: LayoutGrid },
    { key: "diff", label: "Inspeksi Diff Prompt", icon: GitCompare },
    { key: "evaluation", label: "Rubrik & Bukti", icon: ShieldCheck },
    { key: "diagrams", label: "Diagram Mermaid", icon: Network },
    { key: "spider", label: "Matriks Pengujian", icon: Bug },
    { key: "playground", label: "Uji Coba Model", icon: Play },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Silsilah Versi Prompt */}
      {versions && versions.length > 0 && activeVersionId && onSelectVersion && (
        <PromptVersionBar
          versions={versions}
          activeVersionId={activeVersionId}
          onSelectVersion={onSelectVersion}
        />
      )}

      {/* Top Bento Metric Strip: 3 Kartu Metrik Animasi + Aksi Cepat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Skor Kualitas (Progress Ring) */}
        <Card className="bento-spotlight border-border/80 shadow-xs p-3.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Skor Kualitas (Clarity)
            </span>
            <div className="flex items-baseline gap-1">
              <span ref={scoreRef} className="text-2xl font-bold font-mono text-foreground">
                {clarityScore}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/100</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Siap Produksi
            </span>
          </div>

          <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/40 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 stroke-current transition-all duration-1000 ease-out"
                strokeDasharray={`${Math.min(100, Math.max(0, clarityScore))}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400 absolute" />
          </div>
        </Card>

        {/* Metric 2: Batasan & Guardrails */}
        <Card className="bento-spotlight border-border/80 shadow-xs p-3.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Cakupan Batasan
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {constraintCoverage}%
              </span>
            </div>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
              Anti-Halusinasi
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
        </Card>

        {/* Metric 3: Latensi & Mesin */}
        <Card className="bento-spotlight border-border/80 shadow-xs p-3.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Latensi Pemrosesan
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-foreground">
                {latencyMs}
              </span>
              <span className="text-xs text-muted-foreground font-mono">ms</span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate block max-w-[130px]" title={modelTarget}>
              {modelTarget}
            </span>
            {result.synthesisMode && (
              <span className="inline-block mt-0.5 text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded">
                {result.synthesisMode === "live_llm_dynamic" ? "⚡ AI Dinamis" : "✓ Fallback"}
              </span>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        {/* Action Card: Salin Cepat & Simpan Permanen */}
        <Card className="bento-spotlight border-border/80 shadow-xs p-3 flex flex-col justify-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleCopyPrompt}
            className="w-full h-8 text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Tersalin ke Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Hasil Rekayasa</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAcceptAndSave}
            disabled={isSaving}
            className="w-full h-8 text-xs gap-1.5 cursor-pointer border-border hover:bg-muted/60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Terima &amp; Simpan</span>
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Gliding Pill Navigation Tab Bar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap z-10 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-background rounded-lg shadow-2xs border border-border/80 z-[-1]"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kontainer Panel Interaktif (Semua panel tetap ter-render di DOM agar E2E deterministik) */}
      <div className="space-y-6">
        {/* Panel 1: Hasil & Perbandingan (Diff Viewer + Master Task Spec Summary) */}
        <div className={activeTab === "all" || activeTab === "diff" ? "block space-y-4" : "hidden"}>
          <PromptDiffViewer
            originalPrompt={result.originalPrompt}
            optimizedPrompt={result.optimizedPrompt}
            onRegenerate={onRegenerate}
            onExportMarkdown={handleExportMarkdown}
            onAcceptAndSave={handleAcceptAndSave}
            isSaving={isSaving}
          />

          {/* Master Prompt Synthesis Engine: Task Specification Overview */}
          {result.analysis?.taskSpec && (
            <Card className="border-border/70 bg-card/60 shadow-2xs overflow-hidden">
              <div className="p-3.5 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Spesifikasi Tugas Master Prompt Engine (Task Spec)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  {result.analysis.taskSpec.detectedArchetype || "Engine Spec"}
                </Badge>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                {/* 1. Persyaratan Utama */}
                <div className="space-y-1.5 p-3 rounded-md bg-muted/20 border border-border/40">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block font-mono">
                    Persyaratan Utama ({result.analysis.taskSpec.explicitRequirements?.length || 0})
                  </span>
                  <ul className="space-y-1 text-muted-foreground">
                    {result.analysis.taskSpec.explicitRequirements?.slice(0, 4).map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-primary font-bold">&bull;</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Batasan Mutlak */}
                <div className="space-y-1.5 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                  <span className="text-[11px] font-semibold text-destructive uppercase tracking-wider block font-mono">
                    Batasan Mutlak ({result.analysis.taskSpec.negativeConstraints?.length || 0})
                  </span>
                  <ul className="space-y-1 text-muted-foreground">
                    {result.analysis.taskSpec.negativeConstraints?.slice(0, 4).map((con, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-destructive font-bold">&times;</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Keputusan Terbuka */}
                <div className="space-y-1.5 p-3 rounded-md bg-muted/20 border border-border/40">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block font-mono">
                    Keputusan Terbuka ({result.analysis.taskSpec.openDecisions?.length || 0})
                  </span>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {result.analysis.taskSpec.openDecisions?.slice(0, 4).map((dec, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-amber-500 font-bold shrink-0">?</span>
                        <div>
                          <strong className="text-foreground font-medium">{dec.topic}: </strong>
                          <span>{dec.guidance}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Panel Dynamic Mermaid & Meta-Blueprint Diagrams (PR #56) */}
        <div className={activeTab === "all" || activeTab === "diagrams" ? "block space-y-4" : "hidden"}>
          {diagrams.length > 0 && (
            <Card className="border-border/70 bg-card/60 shadow-2xs overflow-hidden">
              <div className="p-3.5 border-b border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-foreground">
                    Diagram Arsitektur Mermaid (Anti-Crash Layout)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-500 bg-amber-500/10">
                    {result.synthesisMode === "live_llm_dynamic" ? "⚡ Live LLM Dynamic" : "✓ Anti-Crash Syntax"}
                  </Badge>
                </div>

                {/* Tab selector for diagrams */}
                <div className="flex items-center gap-1">
                  {diagrams.map((d: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveDiagramIdx(idx)}
                      className={`px-2.5 py-1 text-[11px] rounded font-mono transition-colors cursor-pointer ${
                        activeDiagramIdx === idx
                          ? "bg-amber-500/20 text-amber-500 dark:text-amber-400 font-semibold border border-amber-500/40"
                          : "text-muted-foreground hover:text-foreground bg-muted/30"
                      }`}
                    >
                      {d.title || d.type || `Diagram ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <MermaidViewer
                  chart={diagrams[activeDiagramIdx]?.content || ""}
                  title={diagrams[activeDiagramIdx]?.title}
                  description={diagrams[activeDiagramIdx]?.type}
                />
              </div>
            </Card>
          )}
        </div>

        {/* Panel 2: Evaluasi & Perubahan (Intent Guard, Findings, Changes Tracker) */}
        <div className={activeTab === "all" || activeTab === "evaluation" ? "block space-y-6" : "hidden"}>
          <IntentGuardCard
            intent={result.detectedIntent}
            appliedDomainRule={
              result.appliedDomainRule || result.metadata?.appliedDomainRule
            }
            providerId={
              result.providerId || (result.metadata?.providerId as string)
            }
            model={
              result.model ||
              (result.metadata?.model as string) ||
              (result.metadata?.modelTarget as string)
            }
            taskSpec={result.analysis?.taskSpec}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <FindingsPanel findings={findings} score={score} status={status} />
            </div>
            <div className="lg:col-span-5">
              <ChangesTracker changes={result.changes} />
            </div>
          </div>
        </div>

        {/* Panel 3: Uji Ketahanan (Spider Matrix) */}
        <div
          data-testid="spider-matrix-section"
          className={activeTab === "all" || activeTab === "spider" ? "block" : "hidden"}
        >
          <SpiderMatrixPanel
            report={spiderReport}
            isLoading={isSpiderLoading}
            onRunSpider={onRunSpider}
            onRequestRefinement={onRequestRefinement}
          />
        </div>

        {/* Panel 4: Uji Coba Langsung (Playground) */}
        <div className={activeTab === "all" || activeTab === "playground" ? "block" : "hidden"}>
          <PlaygroundCard
            prompt={result.optimizedPrompt}
            originalPrompt={result.originalPrompt}
            providerId={
              result.providerId || (result.metadata?.providerId as string) || "groq"
            }
            model={
              result.model ||
              (result.metadata?.model as string) ||
              (result.metadata?.modelTarget as string) ||
              "llama-3.3-70b-versatile"
            }
          />
        </div>
      </div>

      {/* Ekspor Laporan Terverifikasi & Penilaian Kualitas Manusia (Global Footer) */}
      <Card className="bento-spotlight border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Unduh Dokumen Audit &amp; Umpan Balik Kualitas (Tahap 7)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  Reproducible
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Unduh dokumentasi lengkap audit semantik (Markdown/JSON) atau berikan rating kualitas untuk kalibrasi rubrik lokal.
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="export-markdown-btn"
                onClick={handleExportMarkdown}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-muted/60"
              >
                <FileDown className="h-3.5 w-3.5 text-primary" />
                <span>Ekspor Markdown (.md)</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                data-testid="export-json-btn"
                onClick={handleExportJson}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-muted/60"
              >
                <FileCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ekspor JSON (.json)</span>
              </Button>
            </div>
          </div>

          {/* Export Success Status Message */}
          {exportStatus && (
            <div
              data-testid="export-status-msg"
              className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{exportStatus}</span>
            </div>
          )}

          {/* Human Utility Rating */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Evaluasi Manusia:</span>
              <span className="font-medium text-foreground">
                Apakah hasil rekayasa ini meningkatkan kualitas instruksi Anda?
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={utilityFeedback === "helpful" ? "default" : "outline"}
                size="sm"
                data-testid="utility-feedback-helpful"
                onClick={() => handleUtilityFeedback("helpful")}
                className="h-7 text-xs gap-1.5 cursor-pointer"
              >
                <ThumbsUp className="h-3 w-3" />
                <span>Perbaikan Ini Membantu</span>
              </Button>

              <Button
                variant={utilityFeedback === "issue" ? "destructive" : "outline"}
                size="sm"
                data-testid="utility-feedback-intent-issue"
                onClick={() => handleUtilityFeedback("issue")}
                className="h-7 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Laporkan Risiko Makna</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
