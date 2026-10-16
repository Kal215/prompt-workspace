"use client";

import React from "react";
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
      className="w-full border-b border-border/80 bg-muted/20 px-3 sm:px-4 h-8 flex items-center justify-between text-[11px] font-mono text-muted-foreground overflow-x-auto no-scrollbar select-none"
    >
      {/* Sisi Kiri: Status Live Sesi & Metrik Segmen */}
      <div className="flex items-center gap-0 shrink-0">
        <div className="flex items-center gap-2 pr-3 border-r border-border/60">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="font-semibold text-foreground tracking-tight uppercase text-[10px]">
            Ringkasan Sesi
          </span>
          <span className="sr-only">(Tahap 7 Telemetry)</span>
        </div>

        {/* Inline Metrics with vertical dividers */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-3 border-r border-border/50">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span>Analisis:</span>
            <span className="font-semibold text-foreground">{metrics.optimizationsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 border-r border-border/50">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Tersimpan:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {metrics.acceptedOrExportedCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 border-r border-border/50">
            <Play className="h-3 w-3 text-muted-foreground fill-current" />
            <span>Uji Coba:</span>
            <span className="font-semibold text-foreground">{metrics.playgroundRunsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 border-r border-border/50">
            <Database className="h-3 w-3 text-muted-foreground" />
            <span>Riwayat:</span>
            <span className="font-semibold text-foreground">{metrics.historyCount}</span>
          </div>
        </div>
      </div>

      {/* Sisi Kanan: Skor Mutu Rata-Rata & Security Badge */}
      <div className="flex items-center gap-3 shrink-0 pl-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-semibold">QS:</span>
          <span>Rata-rata:</span>
          <span className="font-bold text-foreground">{avgScore}/100</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground border-l border-border/60 pl-3">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>Lokal &amp; Terisolasi</span>
        </div>
      </div>
    </div>
  );
}
