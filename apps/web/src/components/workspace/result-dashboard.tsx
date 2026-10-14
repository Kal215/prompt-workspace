import React, { useState } from "react";
import { PromptOptimizationResult } from "@/types/prompt";
import { IntentGuardCard } from "./intent-guard-card";
import { FindingsPanel } from "./findings-panel";
import { PromptDiffViewer } from "./prompt-diff-viewer";
import { ChangesTracker } from "./changes-tracker";
import { Card, CardContent } from "@/components/ui/card";
import { exportOptimizationResultToMarkdown } from "@/lib/export";
import { toast } from "sonner";
import { Activity, Clock, Zap, Cpu } from "lucide-react";

interface ResultDashboardProps {
  result: PromptOptimizationResult;
  onRegenerate: () => void;
  onAccept?: (result: PromptOptimizationResult) => void;
  onRefreshHistory?: () => void;
}

export function ResultDashboard({
  result,
  onRegenerate,
  onAccept,
  onRefreshHistory,
}: ResultDashboardProps) {
  const [isSaving, setIsSaving] = useState(false);

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

  const handleExportMarkdown = () => {
    try {
      const filename = exportOptimizationResultToMarkdown(result);
      toast.info("Laporan Markdown berhasil diunduh!", {
        description: `Disimpan sebagai ${filename}`,
      });
    } catch (err) {
      console.error("Gagal mengekspor Markdown:", err);
      toast.error("Gagal mengekspor laporan Markdown.");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Strip */}
      <Card className="border-border/60 bg-muted/30 shadow-none">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  Clarity Index
                </span>
                <span className="text-sm font-bold text-foreground">
                  {clarityScore}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2 border-l border-border/40">
              <div className="h-8 w-8 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  Constraint Coverage
                </span>
                <span className="text-sm font-bold text-foreground">
                  {constraintCoverage}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2 border-l border-border/40">
              <div className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  Engine Latency
                </span>
                <span className="text-sm font-bold text-foreground">
                  {latencyMs} ms
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2 border-l border-border/40">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  Target Runtime
                </span>
                <span
                  className="text-xs font-semibold text-foreground truncate block max-w-[120px]"
                  title={modelTarget}
                >
                  {modelTarget}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Diff & Prompt Comparison Viewer with Action Buttons */}
      <PromptDiffViewer
        originalPrompt={result.originalPrompt}
        optimizedPrompt={result.optimizedPrompt}
        onRegenerate={onRegenerate}
        onExportMarkdown={handleExportMarkdown}
        onAcceptAndSave={handleAcceptAndSave}
        isSaving={isSaving}
      />

      {/* 2. Intent Guard Card */}
      <IntentGuardCard
        intent={result.detectedIntent}
        appliedDomainRule={
          result.appliedDomainRule || result.metadata?.appliedDomainRule
        }
        providerId={
          result.providerId || (result.metadata?.providerId as string)
        }
        model={
          result.model || (result.metadata?.model as string) || (result.metadata?.modelTarget as string)
        }
      />

      {/* 3. Findings & Changes Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <FindingsPanel findings={findings} score={score} status={status} />
        </div>
        <div className="lg:col-span-5">
          <ChangesTracker changes={result.changes} />
        </div>
      </div>
    </div>
  );
}
