"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Square,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Zap,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { AutonomyLevel } from "@prompt-workspace/prompt-contracts";
import { AgentRunRecord, AgentStepAudit } from "@prompt-workspace/prompt-engine";

export function AgentRuntimePanel() {
  const [objective, setObjective] = useState(
    "Bangun modul validasi webhook Stripe dengan signature verification dan idempotency lock di Redis."
  );
  const [profile, setProfile] = useState<"eco" | "balanced" | "deep">("balanced");
  const [autonomyLevel, setAutonomyLevel] =
    useState<AutonomyLevel>("L2_bounded_autonomy");
  const [hardConstraint, setHardConstraint] = useState(
    "Jangan izinkan transaksi tanpa verifikasi tanda tangan cryptographic"
  );

  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<AgentRunRecord | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRunRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      const res = await fetch("/api/agent-runs");
      const json = await res.json();
      if (json.success && Array.isArray(json.runs)) {
        setRecentRuns(json.runs);
        if (json.runs.length > 0 && !currentRun) {
          setCurrentRun(json.runs[0]);
        }
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartRun = async () => {
    if (!objective.trim()) {
      setErrorMessage("Sasaran objektif agent tidak boleh kosong.");
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_run",
          prompt: objective,
          profile,
          autonomyLevel,
          hardConstraints: hardConstraint.trim() ? [hardConstraint.trim()] : [],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengeksekusi agent run.");
      }

      setCurrentRun(json.run);
      setSuccessMessage(
        `Agent run ${json.run.runId} selesai dengan status: ${json.run.status} (Skor Akhir: ${json.run.finalScore})`
      );
      fetchRuns();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancelRun = async () => {
    if (!currentRun) return;

    try {
      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_run",
          runId: currentRun.runId,
        }),
      });

      const json = await res.json();
      if (json.success && json.run) {
        setCurrentRun(json.run);
        setSuccessMessage("Kill-Switch aktif: Run berhasil dibatalkan oleh operator.");
        fetchRuns();
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  const stateMachineOrder = [
    "created",
    "understanding",
    "planning",
    "retrieving_context",
    "running_action",
    "evaluating",
    "completed",
  ];

  return (
    <div
      data-testid="agent-runtime-panel"
      className="space-y-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs"
    >
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Zap className="w-3.5 h-3.5 text-sky-500" />
            <span>PILAR 1 • BOUNDED AGENT RUNTIME v1.0</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Autonomous State Machine &amp; Policy Guard</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Sistem runtime otonom berbatas ketat (Bounded Autonomy) dengan 12-status State Machine,
            verifikasi kebijakan Policy Engine (Fail-Closed), dan pemantauan anggaran multi-dimensi.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRuns}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-neutral-50 dark:hover:bg-zinc-900 text-xs font-mono text-muted-foreground transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Runs ({recentRuns.length})</span>
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Goal, Profile, and Autonomy */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Sasaran Objektif (Task Intent / Goal)</span>
              <span className="font-mono text-[11px] text-muted-foreground">IntentSpec.goal</span>
            </label>
            <textarea
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Masukkan instruksi atau tujuan yang harus dicapai agent..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-foreground resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Hard Constraint (Zero-Tolerance)</span>
              <span className="font-mono text-[11px] text-rose-500">Fail-Closed Gate</span>
            </label>
            <input
              type="text"
              value={hardConstraint}
              onChange={(e) => setHardConstraint(e.target.value)}
              placeholder="Contoh: Jangan pernah mengekspos API key atau token rahasia"
              className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Profile Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Profil Anggaran (Budget)
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-zinc-900 border border-border text-xs font-mono">
                {(["eco", "balanced", "deep"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProfile(p)}
                    className={`py-1.5 rounded-lg text-center font-medium capitalize transition-all cursor-pointer ${
                      profile === p
                        ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Autonomy Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Level Otonomi (Autonomy)
              </label>
              <select
                value={autonomyLevel}
                onChange={(e) => setAutonomyLevel(e.target.value as AutonomyLevel)}
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="L0_assist">L0 Assist (Human Approval All)</option>
                <option value="L1_approved_execution">L1 Approved Execution</option>
                <option value="L2_bounded_autonomy">L2 Bounded Autonomy (Default)</option>
                <option value="L3_controlled_learning">L3 Controlled Learning</option>
              </select>
            </div>
          </div>

          {/* Action Execution Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="btn-start-run"
              onClick={handleStartRun}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengeksekusi Loop...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Jalankan Agent Loop</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="btn-kill-switch"
              onClick={handleCancelRun}
              disabled={!currentRun || currentRun.status === "completed" || currentRun.status === "cancelled"}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              <Square className="w-3.5 h-3.5 fill-rose-500" />
              <span>Operator Kill-Switch</span>
            </button>
          </div>
        </div>

        {/* Right Status Card: Live Timeline & Budget Tracker */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl border border-border bg-neutral-50/60 dark:bg-zinc-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-500" />
                <span>Status Eksekusi &amp; State Machine</span>
              </div>
              {currentRun && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    currentRun.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : currentRun.status === "cancelled" || currentRun.status === "failed"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  }`}
                >
                  {currentRun.status}
                </span>
              )}
            </div>

            {/* 7-Step State Machine Timeline */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-muted-foreground">State Transitions:</div>
              <div className="grid grid-cols-7 gap-1">
                {stateMachineOrder.map((stepName, idx) => {
                  const stepIndexInHistory = currentRun
                    ? currentRun.steps.findIndex((s: AgentStepAudit) => s.phase === stepName)
                    : -1;
                  const isCurrent = currentRun?.status === stepName;
                  const isReached = stepIndexInHistory >= 0 || isCurrent;

                  return (
                    <div
                      key={stepName}
                      className={`p-1.5 rounded-lg text-center text-[10px] font-mono border transition-all ${
                        isCurrent
                          ? "bg-sky-500 text-white font-bold border-sky-500 shadow-2xs"
                          : isReached
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                          : "bg-background text-neutral-400 border-border"
                      }`}
                    >
                      <div className="truncate">{idx + 1}. {stepName.slice(0, 5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Budget Meter Bar */}
            {currentRun && (
              <div className="space-y-2 pt-2 border-t border-border text-xs font-mono">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Konsumsi Anggaran (Budget Spent)</span>
                  <span>
                    Steps: {currentRun.steps.length} / {currentRun.budget.maxSteps}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (currentRun.steps.length / (currentRun.budget.maxSteps || 12)) * 100
                      )}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-muted-foreground">
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <span className="block text-[10px]">Skor Awal:</span>
                    <strong className="text-foreground">{currentRun.scoreProgression[0] ?? 0}/100</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <span className="block text-[10px]">Skor Akhir:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {currentRun.finalScore}/100
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <span className="block text-[10px]">Total Langkah:</span>
                    <strong className="text-foreground">{currentRun.steps.length} Iterasi</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Audit & Policy Decision Table */}
      {currentRun && currentRun.steps.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>Step-by-Step Audit &amp; Policy Engine Decisions ({currentRun.steps.length})</span>
            </h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              Run ID: <code className="text-sky-600 dark:text-sky-400">{currentRun.runId}</code>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-100 dark:bg-zinc-900 border-b border-border text-muted-foreground text-[11px]">
                <tr>
                  <th className="p-2.5">Step</th>
                  <th className="p-2.5">Transisi State</th>
                  <th className="p-2.5">Action Proposal</th>
                  <th className="p-2.5">Policy Decision</th>
                  <th className="p-2.5">Risk Class</th>
                  <th className="p-2.5">Skor</th>
                  <th className="p-2.5">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentRun.steps.map((st: AgentStepAudit, i: number) => (
                  <tr
                    key={st.stepIndex ?? i}
                    className="hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="p-2.5 font-bold text-foreground">#{st.stepIndex}</td>
                    <td className="p-2.5 text-muted-foreground">
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">{st.phase}</span>
                    </td>
                    <td className="p-2.5">
                      {st.actionProposal ? (
                        <span className="text-foreground font-medium">{st.actionProposal.toolId}</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      {st.policyDecision ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            st.policyDecision.decision === "allow"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : st.policyDecision.decision === "deny"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {st.policyDecision.decision === "allow" ? (
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-rose-500" />
                          )}
                          <span>{st.policyDecision.decision}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-zinc-800 text-muted-foreground uppercase">
                        {st.policyDecision?.riskClass || "low"}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {st.scoreBefore !== undefined && st.scoreAfter !== undefined ? (
                        <span className="text-foreground">
                          {st.scoreBefore} &rarr;{" "}
                          <strong className="text-emerald-600 dark:text-emerald-400">{st.scoreAfter}</strong>
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {new Date(st.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
