"use client";

import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Play,
  RefreshCw,
  Trophy,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  BaselineLevel,
  DatasetSplit,
  PairedExperimentReport,
} from "@prompt-workspace/prompt-contracts";

export function PairedExperimentsPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [reports, setReports] = useState<PairedExperimentReport[]>([]);
  const [currentReport, setCurrentReport] = useState<PairedExperimentReport | null>(null);
  const [split, setSplit] = useState<DatasetSplit>("holdout");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/experiments");
      const json = await res.json();
      if (json.success && Array.isArray(json.artifacts)) {
        setReports(json.artifacts);
        if (json.artifacts.length > 0 && !currentReport) {
          setCurrentReport(json.artifacts[0]);
        }
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunExperiment = async () => {
    setIsRunning(true);
    setNotification(null);

    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          split,
          baselines: ["B0", "B1", "B2", "B3", "B4"],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menjalankan paired experiment.");
      }

      setCurrentReport(json.report);
      setNotification({
        type: "success",
        message: `Eksperimen ${json.report.experimentId} selesai. Winner: ${json.report.winnerBaseline} (SHA-256: ${json.report.immutableArtifactSha256.slice(0, 12)}…)`,
      });
      fetchReports();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: (err as Error).message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const baselineLabels: Record<BaselineLevel, string> = {
    B0: "Raw Prompt (Unassisted)",
    B1: "Standard Optimizer",
    B2: "Bounded Agent Loop",
    B3: "Agent + Hybrid Memory",
    B4: "Agent + Memory + Skill Registry",
  };

  return (
    <div
      data-testid="paired-experiments-panel"
      className="space-y-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
            <span>PILAR 4 • SCIENTIFIC PAIRED EXPERIMENT (B0..B4) · {reports.length} ARTIFACTS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Paired Benchmark Experiments &amp; Holdout Gate</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Evaluasi ilmiah berdampingan 5 tingkat baseline (B0 s/d B4) pada partisi dataset
            Tuning vs Holdout, diverifikasi dengan Fail-Closed Hard Constraint Gate dan Immutable Artifact.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Split Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-zinc-900 border border-border text-xs font-mono">
            {(["holdout", "tuning"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSplit(s)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                  split === s
                    ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-run-experiment"
            onClick={handleRunExperiment}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mengevaluasi...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Jalankan Eksperimen B0..B4</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[11px] font-mono underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Experiment Display */}
      {currentReport ? (
        <div className="space-y-6">
          {/* Winner Banner & Metadata */}
          <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                  Pemenang Evaluasi Komparatif:
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-xs font-extrabold shadow-2xs">
                  {currentReport.winnerBaseline}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({baselineLabels[currentReport.winnerBaseline]})
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dataset: <code className="text-foreground">{currentReport.datasetId}</code> • Partisi:{" "}
                <span className="uppercase font-semibold text-foreground">{currentReport.split}</span> • Waktu:{" "}
                {new Date(currentReport.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
              <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Immutable Artifact:</span>
              <span className="text-foreground font-semibold" title={currentReport.immutableArtifactSha256}>
                {currentReport.immutableArtifactSha256.slice(0, 16)}…
              </span>
            </div>
          </div>

          {/* Matrix Comparison Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Matriks Perbandingan Baseline (B0..B4)</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-100 dark:bg-zinc-900 border-b border-border text-muted-foreground text-[11px]">
                  <tr>
                    <th className="p-3">Baseline</th>
                    <th className="p-3">Konfigurasi Arsitektur</th>
                    <th className="p-3">Skor Rata-rata</th>
                    <th className="p-3">Hard Constraint Gate</th>
                    <th className="p-3">Kasus Lulus</th>
                    <th className="p-3">Median Latency</th>
                    <th className="p-3">Token Digunakan</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(["B0", "B1", "B2", "B3", "B4"] as BaselineLevel[]).map((b) => {
                    const metrics = currentReport.aggregateMetrics[b];
                    const isWinner = currentReport.winnerBaseline === b;
                    if (!metrics) return null;

                    const allHardConstraintsPassed = metrics.gateFailedCases === 0;

                    return (
                      <tr
                        key={b}
                        className={`transition-colors ${
                          isWinner
                            ? "bg-amber-500/10 font-medium"
                            : "hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50"
                        }`}
                      >
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold ${
                              isWinner
                                ? "bg-amber-500 text-white shadow-2xs"
                                : "bg-neutral-200 dark:bg-zinc-800 text-foreground"
                            }`}
                          >
                            {isWinner && <Trophy className="w-3 h-3 text-white" />}
                            <span>{b}</span>
                          </span>
                        </td>
                        <td className="p-3 text-foreground">{baselineLabels[b]}</td>
                        <td className="p-3">
                          <span
                            className={`text-sm font-bold ${
                              isWinner
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground"
                            }`}
                          >
                            {metrics.averageScore} / 100
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              allHardConstraintsPassed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {allHardConstraintsPassed ? (
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <ShieldAlert className="w-3 h-3 text-rose-500" />
                            )}
                            <span>{allHardConstraintsPassed ? "PASS" : "GATE_FAILED"}</span>
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {metrics.passedCases} / {metrics.totalCases}
                        </td>
                        <td className="p-3 text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>{metrics.medianLatencyMs}ms</span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {metrics.totalTokensUsed.toLocaleString()} tkn
                        </td>
                        <td className="p-3">
                          {isWinner ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]">
                              ★ WINNER
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test Case Breakdown Details */}
          {currentReport.caseResults && currentReport.caseResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                Rincian Kasus Uji Holdout ({currentReport.caseResults.length} Evaluasi)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                {currentReport.caseResults.map((cr, idx) => (
                  <div
                    key={`${cr.caseId}-${cr.baseline}-${idx}`}
                    className="p-3.5 rounded-xl border border-border bg-neutral-50/50 dark:bg-zinc-900/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-background border border-border font-bold">
                          {cr.baseline}
                        </span>
                        <span className="text-muted-foreground">{cr.caseId}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          cr.verdict === "PASSED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {cr.verdict}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                      <span>Skor: <strong className="text-foreground">{cr.score}/100</strong></span>
                      <span>Latensi: {cr.latencyMs}ms</span>
                      <span>Token: {cr.tokensUsed}</span>
                    </div>

                    {cr.failureReasons.length > 0 && (
                      <div className="text-[10px] text-rose-500 bg-rose-500/5 p-2 rounded-lg border border-rose-500/20">
                        {cr.failureReasons.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-xs font-mono text-muted-foreground space-y-3">
          <FlaskConical className="w-8 h-8 text-neutral-400 mx-auto" />
          <p>Belum ada eksperimen yang dijalankan. Klik &quot;Jalankan Eksperimen B0..B4&quot; di atas untuk mengevaluasi benchmark.</p>
        </div>
      )}
    </div>
  );
}
