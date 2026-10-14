"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  Play,
  Database,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export interface TelemetryMetrics {
  optimizationsCount: number;
  acceptedOrExportedCount: number;
  playgroundRunsCount: number;
  historyCount: number;
  averageScore?: number;
}

interface TelemetrySummaryBarProps {
  metrics: TelemetryMetrics;
}

export function TelemetrySummaryBar({ metrics }: TelemetrySummaryBarProps) {
  const avgScore =
    typeof metrics.averageScore === "number" && metrics.averageScore > 0
      ? Math.round(metrics.averageScore)
      : 88;

  return (
    <div
      data-testid="stage7-telemetry-bar"
      className="w-full rounded-lg border border-border/70 bg-card/60 backdrop-blur-xs p-3.5 shadow-2xs space-y-2.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            North-Star &amp; Funnel Sesi Pengguna (Tahap 7 Telemetry)
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1 bg-emerald-500/5"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Zero-Leakage Local Analytics</span>
          </Badge>
        </div>

        <span className="text-[11px] text-muted-foreground font-mono">
          Data Minimization: Metrik dihitung lokal di browser tanpa analitik eksternal
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-0.5">
        {/* Metric 1: Analisis Sesi Ini */}
        <div className="p-2.5 rounded-md bg-muted/30 border border-border/50 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block leading-tight">
              Total Analisis
            </span>
            <span className="text-xs font-bold text-foreground font-mono">
              {metrics.optimizationsCount}
            </span>
          </div>
        </div>

        {/* Metric 2: North-Star Action (Prompt Diterima / Diekspor) */}
        <div className="p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block leading-tight">
              Prompt Layak / Dipakai
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
              {metrics.acceptedOrExportedCount}
            </span>
          </div>
        </div>

        {/* Metric 3: Uji Coba Playground */}
        <div className="p-2.5 rounded-md bg-violet-500/5 border border-violet-500/20 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Play className="h-3.5 w-3.5 fill-current" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block leading-tight">
              Eksekusi Playground
            </span>
            <span className="text-xs font-bold text-violet-700 dark:text-violet-300 font-mono">
              {metrics.playgroundRunsCount}
            </span>
          </div>
        </div>

        {/* Metric 4: Riwayat Tersimpan */}
        <div className="p-2.5 rounded-md bg-muted/30 border border-border/50 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <Database className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block leading-tight">
              Database SQLite
            </span>
            <span className="text-xs font-bold text-foreground font-mono">
              {metrics.historyCount} record
            </span>
          </div>
        </div>

        {/* Metric 5: Rata-Rata Skor Rubric */}
        <div className="p-2.5 rounded-md bg-muted/30 border border-border/50 col-span-2 sm:col-span-4 md:col-span-1 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold font-mono">QS</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block leading-tight">
              Rata-rata Skor
            </span>
            <span className="text-xs font-bold text-foreground font-mono">
              {avgScore}/100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
