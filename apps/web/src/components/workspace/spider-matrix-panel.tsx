"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Activity,
  Bug,
} from "lucide-react";
import {
  SpiderReportSummary,
  SpiderSecurityFinding,
  SpiderFindingSeverity,
  SpiderCaseStatus,
} from "@/types/v2-workspace";
import {
  evaluateSpiderGateBanner,
  SpiderGateBannerEvaluation,
} from "@/lib/v2-workspace-helpers";

export interface SpiderMatrixPanelProps {
  report?: SpiderReportSummary | null;
  isLoading?: boolean;
  onRunSpider?: () => void;
  onRequestRefinement?: (findings: SpiderSecurityFinding[]) => void;
  className?: string;
}

function getSeverityBadge(severity: SpiderFindingSeverity) {
  switch (severity) {
    case "critical":
      return (
        <Badge className="bg-red-600 text-white text-[10px] uppercase font-mono">
          CRITICAL
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-orange-500 text-white text-[10px] uppercase font-mono">
          HIGH
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500 text-white text-[10px] uppercase font-mono">
          MEDIUM
        </Badge>
      );
    case "low":
      return (
        <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-500 font-mono">
          LOW
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground font-mono">
          INFO
        </Badge>
      );
  }
}

function getCaseStatusBadge(status: SpiderCaseStatus) {
  switch (status) {
    case "PASS":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-[10px] font-mono gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          PASS
        </Badge>
      );
    case "FAIL":
      return (
        <Badge
          variant="outline"
          className="border-destructive/40 text-destructive bg-destructive/5 text-[10px] font-mono gap-1"
        >
          <XCircle className="h-3 w-3" />
          FAIL
        </Badge>
      );
    case "ERROR":
      return (
        <Badge
          variant="outline"
          className="border-red-500/40 text-red-500 bg-red-500/5 text-[10px] font-mono gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          ERROR
        </Badge>
      );
    case "INDETERMINATE":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 text-amber-500 bg-amber-500/5 text-[10px] font-mono gap-1"
        >
          <HelpCircle className="h-3 w-3" />
          INDETERMINATE
        </Badge>
      );
  }
}

export function SpiderMatrixPanel({
  report,
  isLoading = false,
  onRunSpider,
  onRequestRefinement,
  className = "",
}: SpiderMatrixPanelProps) {
  if (!report && !isLoading) {
    return (
      <div
        data-testid="spider-matrix-empty"
        className={`rounded-xl border border-border/80 bg-card/60 p-5 space-y-4 shadow-2xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Uji Ketahanan Adversarial (Prompt Spider Matrix v2.0)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluasi 5 skenario serangan (Prompt Injection, System Leakage, Jailbreak, &amp; Bypass).
              </p>
            </div>
          </div>
          {onRunSpider && (
            <Button
              type="button"
              data-testid="run-spider-btn"
              onClick={onRunSpider}
              className="gap-2 text-xs h-9 shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Jalankan Uji Ketahanan (Spider)</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const banner: SpiderGateBannerEvaluation = report
    ? evaluateSpiderGateBanner(report)
    : {
        passed: false,
        variant: "warning",
        badgeText: "Memproses...",
        title: "Menjalankan Pengujian Spider",
        message: "Sedang mengeksekusi matriks pengujian adversarial secara paralel...",
        hasErrorsOrIndeterminate: false,
        metrics: {
          passCount: 0,
          failCount: 0,
          errorCount: 0,
          indeterminateCount: 0,
          criticalFindingsCount: 0,
        },
      };

  const findings = report?.securityFindings || [];
  const hasActionableFindings = findings.length > 0;

  return (
    <div
      data-testid="spider-matrix-panel"
      className={`rounded-xl border border-border/80 bg-card p-5 space-y-5 shadow-sm ${className}`}
    >
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Hasil Uji Ketahanan Prompt Spider Matrix
              </h3>
              {report && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  Job: {report.jobId.slice(0, 8)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prinsip ADR-002: Evidence Over Claims &bull; Fail Visibly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRunSpider && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRunSpider}
              disabled={isLoading}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Uji Ulang</span>
            </Button>
          )}

          {onRequestRefinement && (
            <Button
              type="button"
              data-testid="spider-refine-button"
              onClick={() => onRequestRefinement(findings)}
              disabled={isLoading || !hasActionableFindings}
              className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Perbaiki dari Temuan Spider (Buat Versi Baru)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Gerbang Kritis Banner (Honest & Explicit Gate Badge) */}
      <div
        data-testid="spider-gate-banner"
        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          banner.variant === "success"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
            : banner.variant === "warning"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
            : "border-destructive/40 bg-destructive/10 text-destructive-foreground"
        }`}
      >
        <div className="flex items-start gap-3">
          {banner.variant === "success" ? (
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : banner.variant === "warning" ? (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold leading-tight">
                {banner.title}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono uppercase ${
                  banner.variant === "success"
                    ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                    : banner.variant === "warning"
                    ? "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                    : "border-destructive/50 text-destructive bg-destructive/10"
                }`}
              >
                {banner.badgeText}
              </Badge>
            </div>
            <p className="text-xs opacity-90 mt-1">
              {banner.message}
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-3 text-xs font-mono shrink-0 pl-8 sm:pl-0">
            <span>Pass: {banner.metrics.passCount}</span>
            <span>Fail: {banner.metrics.failCount}</span>
            {banner.metrics.errorCount > 0 && (
              <span className="text-red-500 font-bold">Error: {banner.metrics.errorCount}</span>
            )}
            {banner.metrics.indeterminateCount > 0 && (
              <span className="text-amber-500 font-bold">Indet: {banner.metrics.indeterminateCount}</span>
            )}
          </div>
        )}
      </div>

      {/* Grid 2 Kolom: Quality Metrics (Kiri) vs Security Findings (Kanan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Kolom Kiri: Quality Metrics */}
        <div className="space-y-3 p-4 rounded-lg border border-border/70 bg-card/60">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Metrik Kualitas &amp; Performa
            </h4>
            <span className="text-[11px] font-mono text-muted-foreground">
              Latensi Rata-rata: {report?.qualityMetrics.averageLatencyMs ?? 0}ms
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-md border border-border/50 bg-background/50 space-y-1">
              <span className="text-[10px] text-muted-foreground block">
                Skor Ketahanan (Robustness)
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {report?.qualityMetrics.robustnessScore ?? 0}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
            </div>

            <div className="p-3 rounded-md border border-border/50 bg-background/50 space-y-1">
              <span className="text-[10px] text-muted-foreground block">
                Tingkat Kelulusan (Pass Rate)
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {Math.round((report?.qualityMetrics.passRate ?? 0) * 100)}%
              </span>
            </div>

            <div className="p-3 rounded-md border border-border/50 bg-background/50 space-y-1">
              <span className="text-[10px] text-muted-foreground block">
                Kepatuhan Instruksi
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {report?.qualityMetrics.instructionAdherenceScore ?? 0}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
            </div>

            <div className="p-3 rounded-md border border-border/50 bg-background/50 space-y-1">
              <span className="text-[10px] text-muted-foreground block">
                Konsistensi Format
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {report?.qualityMetrics.consistencyScore ?? 0}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
            </div>
          </div>

          {/* Skenario Kasus Uji Detail */}
          {report?.testCases && report.testCases.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                Kasus Uji Terverifikasi:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {report.testCases.map((tc) => (
                  <div
                    key={tc.id}
                    className="flex items-center justify-between p-2 rounded border border-border/40 bg-background/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{tc.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({tc.category})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {tc.latencyMs}ms
                      </span>
                      {getCaseStatusBadge(tc.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Security Findings */}
        <div className="space-y-3 p-4 rounded-lg border border-border/70 bg-card/60">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
              Temuan Keamanan ({findings.length})
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {findings.filter((f) => f.severity === "critical" || f.severity === "high").length} Risiko Kritis/Tinggi
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-center space-y-2">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-foreground">
                Tidak Ditemukan Kerentanan Keamanan
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Prompt berhasil menolak upaya injeksi, peretasan batasan (jailbreak), dan kebocoran sistem pada seluruh kasus uji yang dijalankan.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {finding.title}
                    </span>
                    {getSeverityBadge(finding.severity)}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {finding.description}
                  </p>

                  {finding.evidenceSnippet && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        Bukti Cuplikan (Tersanitasi):
                      </span>
                      <pre className="text-[11px] font-mono p-2 rounded bg-background/80 border border-border/40 text-foreground overflow-x-auto whitespace-pre-wrap">
                        {finding.evidenceSnippet}
                      </pre>
                    </div>
                  )}

                  <div className="p-2 rounded bg-background/40 border border-border/40 text-[11px] text-foreground/90 flex items-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong>Rekomendasi Perbaikan:</strong> {finding.recommendation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
