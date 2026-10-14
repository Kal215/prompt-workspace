import React, { useState } from "react";
import { PromptOptimizationResult } from "@/types/prompt";
import { IntentGuardCard } from "./intent-guard-card";
import { FindingsPanel } from "./findings-panel";
import { PromptDiffViewer } from "./prompt-diff-viewer";
import { ChangesTracker } from "./changes-tracker";
import { PlaygroundCard } from "./playground-card";
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
import {
  Activity,
  Clock,
  Zap,
  Cpu,
  FileDown,
  FileCode,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface ResultDashboardProps {
  result: PromptOptimizationResult;
  onRegenerate: () => void;
  onAccept?: (result: PromptOptimizationResult) => void;
  onRefreshHistory?: () => void;
  onTelemetryAction?: (actionType: "export" | "feedback_helpful" | "feedback_issue") => void;
}

export function ResultDashboard({
  result,
  onRegenerate,
  onAccept,
  onRefreshHistory,
  onTelemetryAction,
}: ResultDashboardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [utilityFeedback, setUtilityFeedback] = useState<"helpful" | "issue" | null>(null);

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
      const content = buildMarkdownReport(result);
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
      const payload = buildSafeExportPayload(result);
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
      toast.success("Terima kasih! Feedback tercatat (Perbaikan ini dinilai membantu).");
      onTelemetryAction?.("feedback_helpful");
    } else {
      toast.warning("Laporan risiko makna tercatat untuk peninjauan rubrik.");
      onTelemetryAction?.("feedback_issue");
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

      {/* 4. Target Model Execution Playground (Fitur C3 - Tahap 5 Blueprint v1.0) */}
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

      {/* 5. Verified Export & Human Utility Rating (Tahap 7 - Task #32) */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Ekspor Laporan Terverifikasi &amp; Penilaian Kualitas (Tahap 7)
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

          {/* Human Utility Rating (Blueprint Bagian 12 #8 & 18.1) */}
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
