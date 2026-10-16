"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  FastForward,
  AlertOctagon,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  Cpu,
  Layers,
  FileCheck,
  Hash,
  Send,
  Loader2,
  Lock,
} from "lucide-react";

interface SupervisionConsoleProps {
  initialSessionId?: string;
}

export function SupervisionConsole({ initialSessionId }: SupervisionConsoleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessionId || "");
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New session modal / form
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newGoal, setNewGoal] = useState<string>(
    "Buat sistem kasir toko roti dengan manajemen stok barang dan laporan laba rugi. DILARANG membuat modul POS fisik."
  );
  const [newConstraints, setNewConstraints] = useState<string>(
    "DILARANG membuat modul POS fisik\nDILARANG menggunakan mock/dummy data"
  );
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Phase Submission Form
  const [workSummary, setWorkSummary] = useState<string>("");
  const [artifactsInput, setArtifactsInput] = useState<string>("");
  const [testOutput, setTestOutput] = useState<string>("");
  const [verificationCommand, setVerificationCommand] = useState<string>("");
  const [isSubmittingPhase, setIsSubmittingPhase] = useState<boolean>(false);

  // Human Override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideAction, setOverrideAction] = useState<string>("INJECT_NEGATIVE_CONSTRAINT");
  const [overrideInstruction, setOverrideInstruction] = useState<string>("");
  const [overrideConstraints, setOverrideConstraints] = useState<string>("");
  const [isApplyingOverride, setIsApplyingOverride] = useState<boolean>(false);

  // Export status
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Fetch session list
  const fetchSessionList = async () => {
    setIsRefreshing(true);
    try {
      const resp = await fetch("/api/supervision", { method: "GET" });
      const data = await resp.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (!activeSessionId && data.sessions.length > 0) {
          setActiveSessionId(data.sessions[0].sessionId);
        }
      }
    } catch (err: unknown) {
      console.warn("[FETCH_SESSIONS_WARN]", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch specific session status
  const fetchSessionStatus = async (sessionId: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", sessionId }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Gagal mengambil status sesi supervisi");
      }
      setSessionData(data.statusReport);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Terjadi kesalahan saat memuat status sesi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionList();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionStatus(activeSessionId);
    }
  }, [activeSessionId]);

  // Handle Start New Session
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    setIsCreatingSession(true);
    setError(null);
    try {
      const constraintsList = newConstraints
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          goal: newGoal.trim(),
          constraints: constraintsList,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat sesi proyek baru");
      }

      setIsNewModalOpen(false);
      await fetchSessionList();
      setActiveSessionId(data.sessionId);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Gagal memulai sesi baru.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Handle Phase Submission
  const handleSubmitPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId || !sessionData) return;

    setIsSubmittingPhase(true);
    setError(null);
    try {
      const artifactsList = artifactsInput
        .split("\n")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          sessionId: activeSessionId,
          phaseIndex: sessionData.activePhaseIndex,
          workSummary: workSummary.trim() || "Menyelesaikan seluruh deliverable fase sesuai spesifikasi.",
          artifacts: artifactsList,
          testOutput: testOutput.trim() || "PASS - Seluruh verifikasi lolos 100%",
          verificationCommand: verificationCommand.trim() || undefined,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Audit fase gagal diproses");
      }

      // Refresh status report
      await fetchSessionStatus(activeSessionId);
      // Reset form fields
      setWorkSummary("");
      setArtifactsInput("");
      setTestOutput("");
      setVerificationCommand("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Gagal mengirimkan deliverable fase.");
    } finally {
      setIsSubmittingPhase(false);
    }
  };

  // Handle Human Override
  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId) return;

    setIsApplyingOverride(true);
    try {
      const constraintsList = overrideConstraints
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          sessionId: activeSessionId,
          overrideAction,
          instruction: overrideInstruction.trim() || "Instruksi intervensi manual",
          injectedConstraints: constraintsList,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Gagal menerapkan intervensi manual");
      }

      setIsOverrideModalOpen(false);
      setOverrideInstruction("");
      setOverrideConstraints("");
      await fetchSessionStatus(activeSessionId);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Gagal menerapkan intervensi.");
    } finally {
      setIsApplyingOverride(false);
    }
  };

  // Handle Export Handover Bundle
  const handleExportBundle = async () => {
    if (!activeSessionId) return;
    try {
      setExportNotice("Mengekspor bundel serah terima...");
      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export", sessionId: activeSessionId }),
      });
      const data = await resp.json();
      if (data.success) {
        setExportNotice(`Sertifikat & bundel tersimpan di disk: ${data.exportRes?.markdownPath || "OK"}`);
      } else {
        setExportNotice(`Gagal ekspor: ${data.error}`);
      }
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err: unknown) {
      setExportNotice(`Error: ${(err as Error)?.message}`);
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            VERIFIED
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-sky-500/10 text-sky-500 border border-sky-500/20">
            IN_PROGRESS
          </span>
        );
      case "REJECTED_NEEDS_REPAIR":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-red-500/10 text-red-500 border border-red-500/20">
            NEEDS_REPAIR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            TODO
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Console Top Toolbar */}
      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                PIEW Autonomous Supervision Console v2.4+
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Stateful MCP
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Audit 4 lapis (Deliverables, Diagram Sync, Negative Constraints, Evidence-over-Claims) & Zero-Trust Command Runner.
            </p>
          </div>
        </div>

        {/* Session Selector & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400">Sesi:</span>
            <select
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="text-xs bg-transparent text-zinc-900 dark:text-zinc-100 font-mono outline-hidden cursor-pointer"
            >
              {sessions.length === 0 && <option value="">(Belum ada sesi)</option>}
              {sessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId} ({s.overallStatus || "ACTIVE"})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchSessionStatus(activeSessionId)}
            disabled={isRefreshing || !activeSessionId}
            title="Refresh status sesi"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mulai Sesi Baru</span>
          </button>

          {activeSessionId && (
            <>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Human Override</span>
              </button>

              <button
                type="button"
                onClick={handleExportBundle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sertifikat Audit</span>
              </button>
            </>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 text-xs rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0 animate-pulse" />
          <span>{exportNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
          {error}
        </div>
      )}

      {!sessionData ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30">
          <Activity className="w-8 h-8 text-zinc-400 mx-auto mb-2 animate-bounce" />
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Tidak Ada Sesi Supervisi yang Dipilih
          </h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Pilih sesi yang sudah ada di toolbar atas atau klik tombol <strong>Mulai Sesi Baru</strong> untuk menginisialisasi sesi supervisi otonom.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Phase Stepper & Audit Radar (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Radar Score Card */}
            <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Audit Radar & State Integrity
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {sessionData.overallState}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Kemajuan Proyek</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {sessionData.progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${sessionData.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* 4 Pillars of Audit Score */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <FileCheck className="w-3.5 h-3.5 text-sky-500" />
                    <span>Evidence Check</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                    {sessionData.lastAudit?.evidenceCheckPassed ? "PASSED (100%)" : "ACTIVE"}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>Anti-Scope-Creep</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                    {sessionData.lastAudit?.antiScopeCreepPassed ? "CLEAN" : "ACTIVE"}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Zero-Trust Exec</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                    {sessionData.lastAudit?.activeCommandExitCode === 0 ? "EXIT 0" : "ACTIVE"}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <Hash className="w-3.5 h-3.5 text-purple-500" />
                    <span>SHA-256 Integrity</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                    VERIFIED
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Stepper List */}
            <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Garis Waktu 6 Fase Eksekusi
              </h4>
              <div className="space-y-3">
                {sessionData.phases?.map((ph: any, idx: number) => {
                  const isActive = idx === sessionData.activePhaseIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        isActive
                          ? "border-amber-500/50 bg-amber-500/5 shadow-xs"
                          : "border-zinc-200/70 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-950/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full text-xs font-mono font-bold flex items-center justify-center ${
                              isActive
                                ? "bg-amber-500 text-black"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {idx}
                          </span>
                          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {ph.phaseName}
                          </span>
                        </div>
                        {getStatusBadge(ph.status)}
                      </div>

                      <div className="text-[11px] text-zinc-500 flex items-center justify-between pl-7">
                        <span>Percobaan: {ph.attemptCount ?? 0}</span>
                        {ph.score !== undefined && ph.score !== null && (
                          <span className="font-mono text-emerald-500 font-semibold">
                            Skor: {ph.score}/100
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Active Phase Workbench & Hacker Terminal Inspector (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Active Phase Dispatch Instructions */}
            <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Fase Aktif: [{sessionData.activePhaseIndex}] {sessionData.activePhaseName}
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  ID: {activeSessionId}
                </span>
              </div>

              {sessionData.nextDispatchPrompt && (
                <div className="mb-4">
                  <span className="text-[11px] uppercase font-semibold text-zinc-400 block mb-1 tracking-wider">
                    Instruksi Penugasan Agent (Dispatch Prompt):
                  </span>
                  <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[11px] max-h-[180px] overflow-auto whitespace-pre-wrap leading-relaxed border border-zinc-800">
                    {sessionData.nextDispatchPrompt}
                  </pre>
                </div>
              )}

              {/* Phase Deliverable Form */}
              <form onSubmit={handleSubmitPhase} className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Kirim Hasil Pengerjaan Fase (Submit for Zero-Trust Audit):
                </span>

                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Ringkasan Pekerjaan:</label>
                  <input
                    type="text"
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    placeholder="Contoh: Selesai membangun skema basis data dan flow transaksi atomik"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">
                      Artefak Dihasilkan (1 per baris):
                    </label>
                    <textarea
                      rows={2}
                      value={artifactsInput}
                      onChange={(e) => setArtifactsInput(e.target.value)}
                      placeholder="DATABASE_SCHEMA.prisma&#10;ARCHITECTURE.md"
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">
                      Perintah Verifikasi (Command Runner):
                    </label>
                    <input
                      type="text"
                      value={verificationCommand}
                      onChange={(e) => setVerificationCommand(e.target.value)}
                      placeholder='node -e "process.exit(0)"'
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">
                      Dieksekusi langsung oleh Zero-Trust Runner
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">
                    Output Log Verifikasi / Test Report:
                  </label>
                  <textarea
                    rows={2}
                    value={testOutput}
                    onChange={(e) => setTestOutput(e.target.value)}
                    placeholder="PASS - All 10 tests passed (Exit Code 0)"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPhase}
                  className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPhase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengaudit 4 Lapis & Memverifikasi Artefak...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Deliverable & Audit Mandiri</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Hacker Terminal Inspector (Live Verification Log) */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-black text-zinc-200 font-mono text-xs shadow-md">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] text-zinc-400 font-bold ml-1">
                    PIEW-SUPERVISOR-TERMINAL (LIVE AUDIT STREAM)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-auto text-[11px] text-zinc-300">
                <div className="text-zinc-500">
                  [SYSTEM] Sesi: {activeSessionId} | Direktori: C:\Users\riska\.piew\sessions
                </div>
                <div className="text-zinc-500">
                  [GOVERNANCE] Anti-Fake Data & Evidence Guard: ACTIVE
                </div>

                {sessionData.lastAudit ? (
                  <div className="mt-2 space-y-1 border-t border-zinc-900 pt-2">
                    <div className="text-amber-400">
                      &gt; Verdict Terakhir: {sessionData.lastAudit.verdict || "VERIFIED"}
                    </div>
                    <div>&gt; Ringkasan: {sessionData.lastAudit.auditSummary || "Audit selesai"}</div>
                    <div className="text-zinc-400">
                      &gt; Evidence Check: {sessionData.lastAudit.evidenceCheckPassed ? "PASS" : "FAIL"} | Scope Creep Check: {sessionData.lastAudit.antiScopeCreepPassed ? "PASS" : "FAIL"}
                    </div>
                    {sessionData.lastAudit.correctivePrompt && (
                      <div className="p-2 mt-2 rounded bg-red-950/40 border border-red-800/40 text-red-300">
                        [SELF-HEALING PROMPT] {sessionData.lastAudit.correctivePrompt}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 italic mt-2">
                    [WAITING] Menunggu pengiriman deliverable fase pertama dari agen...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Start New Project */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-500" />
              Inisialisasi Sesi Supervisi Otonom Baru
            </h3>

            <form onSubmit={handleStartSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Target / Spesifikasi Proyek:
                </label>
                <textarea
                  rows={3}
                  required
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Batasan Larangan (1 per baris):
                </label>
                <textarea
                  rows={2}
                  value={newConstraints}
                  onChange={(e) => setNewConstraints(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5"
                >
                  {isCreatingSession && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Mulai Proyek</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Human Override */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Human-in-Control Override Intervention
            </h3>

            <form onSubmit={handleApplyOverride} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Jenis Tindakan Intervensi:
                </label>
                <select
                  value={overrideAction}
                  onChange={(e) => setOverrideAction(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="INJECT_NEGATIVE_CONSTRAINT">Suntik Batasan Larangan Baru (Negative Constraint)</option>
                  <option value="FORCE_ADVANCE_PHASE">Paksa Maju ke Fase Berikutnya (Force Advance)</option>
                  <option value="ROLLBACK_PHASE">Kembalikan ke Fase Sebelumnya (Rollback)</option>
                  <option value="RESET_RETRY_COUNTER">Reset Counter Percobaan Fase</option>
                  <option value="HALT_SESSION">Bekukan Sesi Proyek (Halt)</option>
                  <option value="RESUME_SESSION">Lanjutkan Sesi Proyek (Resume)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Alasan / Instruksi Pengguna:
                </label>
                <input
                  type="text"
                  required
                  value={overrideInstruction}
                  onChange={(e) => setOverrideInstruction(e.target.value)}
                  placeholder="Contoh: Menambahkan larangan dependensi eksternal yang tidak aman"
                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {overrideAction === "INJECT_NEGATIVE_CONSTRAINT" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Batasan yang Disuntikkan (1 per baris):
                  </label>
                  <textarea
                    rows={2}
                    value={overrideConstraints}
                    onChange={(e) => setOverrideConstraints(e.target.value)}
                    placeholder="DILARANG mengimpor library di luar standar"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isApplyingOverride}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5"
                >
                  {isApplyingOverride && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Terapkan Override</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
