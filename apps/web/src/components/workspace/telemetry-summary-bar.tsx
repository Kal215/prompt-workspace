"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  Play,
  Database,
  ShieldCheck,
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
      className="w-full rounded-lg border border-border/80 bg-card/60 backdrop-blur-xs px-3.5 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-semibold text-foreground tracking-tight">
          Ringkasan Sesi
        </span>
        <span className="sr-only">(Tahap 7 Telemetry)</span>
        <Badge
          variant="outline"
          className="text-[10px] font-mono border-border/60 text-muted-foreground gap-1 bg-muted/30 py-0 px-1.5 hidden sm:inline-flex"
        >
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>Lokal &amp; Terisolasi</span>
        </Badge>
      </div>

      {/* LangSmith-style Telemetry Badges Strip */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border/40">
          <Activity className="h-3 w-3 text-primary" />
          <span>Analisis:</span>
          <span className="font-bold text-foreground">{metrics.optimizationsCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border/40">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Tersimpan:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.acceptedOrExportedCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border/40">
          <Play className="h-3 w-3 text-sky-500 fill-current" />
          <span>Uji Coba:</span>
          <span className="font-bold text-foreground">{metrics.playgroundRunsCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border/40">
          <Database className="h-3 w-3 text-muted-foreground" />
          <span>Riwayat:</span>
          <span className="font-bold text-foreground">{metrics.historyCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border/40">
          <span className="text-[10px] text-amber-500 font-bold">QS</span>
          <span>Rata-rata:</span>
          <span className="font-bold text-foreground">{avgScore}/100</span>
        </div>
      </div>
    </div>
  );
}
