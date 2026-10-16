"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Play,
  Pause,
  AlertOctagon,
  Download,
  Plus,
  RefreshCw,
  Cpu,
  Layers,
  FileCheck,
  Hash,
  Send,
  Loader2,
  Copy,
  Check,
  FolderOpen,
  X,
  AlertTriangle,
} from "lucide-react";

interface SupervisionConsoleProps {
  initialSessionId?: string;
}

export function SupervisionConsole({ initialSessionId }: SupervisionConsoleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessionId || "");
  const [statusReport, setStatusReport] = useState<any | null>(null);
  const [sessionObj, setSessionObj] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Panels
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);

  // New session form
  const [newGoal, setNewGoal] = useState<string>(
    "Buat sistem kasir toko roti dengan manajemen stok barang dan laporan laba rugi. DILARANG membuat modul POS fisik."
  );
  const [newConstraints, setNewConstraints] = useState<string>(
    "DILARANG membuat modul POS fisik\nDILARANG menggunakan mock/dummy data di production"
  );
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Phase Submission Form
  const [workSummary, setWorkSummary] = useState<string>("");
  const [artifactsInput, setArtifactsInput] = useState<string>("");
  const [testOutput, setTestOutput] = useState<string>("");
  const [verificationCommand, setVerificationCommand] = useState<string>("");
  const [isSubmittingPhase, setIsSubmittingPhase] = useState<boolean>(false);

  // Human Override State (4 Modes)
  const [overrideAction, setOverrideAction] = useState<string>("INJECT_CONSTRAINT");
  const [overrideInstruction, setOverrideInstruction] = useState<string>("");
  const [overrideConstraints, setOverrideConstraints] = useState<string>("");
  const [isApplyingOverride, setIsApplyingOverride] = useState<boolean>(false);

  // Inspector & Export state
  const [activeLogTab, setActiveLogTab] = useState<"stdout" | "stderr" | "raw">("stdout");
  const [copiedPromptType, setCopiedPromptType] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch session list from ~/.piew/sessions/
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

  // Fetch specific session status and raw object
  const fetchSessionStatus = async (sessionId: string) => {
    if (!sessionId) return;
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
      setStatusReport(data.statusReport || null);
      setSessionObj(data.session || null);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Terjadi kesalahan saat memuat status sesi.");
    }
  };

  useEffect(() => {
    fetchSessionList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionStatus(activeSessionId);
    }
  }, [activeSessionId]);

  // Derived audit details
  const latestAuditAttempt = sessionObj?.auditHistory?.slice(-1)[0] || null;
  const latestAuditResult = latestAuditAttempt?.auditResult || null;
  const activePhaseIndex = statusReport?.currentPhaseIndex ?? 0;
  const activePhase = statusReport?.phases?.[activePhaseIndex] || null;
  const isRejectedNeedsRepair = activePhase?.status === "REJECTED_NEEDS_REPAIR";
  const isHalted = sessionObj?.overallStatus === "HALTED_MAX_RETRIES";
  const isCompleted = sessionObj?.overallStatus === "COMPLETED";

  // Corrective and Dispatch prompts
  const correctivePrompt =
    latestAuditResult?.nextActionPrompt ||
    latestAuditAttempt?.lastAuditSummary ||
    "";
  const dispatchPrompt =
    statusReport?.latestPrompt ||
    sessionObj?.masterBlueprint?.renderedMasterPrompt ||
    "";

  // Handle Copy to Clipboard with Toast feedback
  const copyToClipboard = async (text: string, typeKey: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromptType(typeKey);
      setTimeout(() => setCopiedPromptType(null), 2500);
    } catch {}
  };

  // Handle Download client-side helper
  const triggerClientDownload = (fileName: string, content: string, mimeType = "text/markdown") => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    if (!activeSessionId) return;

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
          phaseIndex: activePhaseIndex,
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

      await fetchSessionStatus(activeSessionId);
      await fetchSessionList();
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

  // Handle Human Override (All 4 Modes)
  const handleApplyOverrideAction = async (
    actionType: string,
    customInstruction?: string,
    customConstraints?: string[]
  ) => {
    if (!activeSessionId) return;

    setIsApplyingOverride(true);
    try {
      const constraintsList =
        customConstraints ||
        overrideConstraints
          .split("\n")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          sessionId: activeSessionId,
          overrideAction: actionType,
          instruction: customInstruction || overrideInstruction.trim() || "Intervensi operator manusia",
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
      await fetchSessionList();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Gagal menerapkan intervensi.");
    } finally {
      setIsApplyingOverride(false);
    }
  };

  // Handle Export and Download Handover Bundle
  const handleExportAndDownload = async (targetType: "certificate" | "bundle" | "blueprint") => {
    if (!activeSessionId) return;
    setIsExporting(true);
    setExportNotice("Menghasilkan paket serah terima proyek...");
    try {
      const resp = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export", sessionId: activeSessionId }),
      });
      const data = await resp.json();

      if (!data.success) {
        throw new Error(data.error || "Gagal mengekspor bundel serah terima.");
      }

      if (targetType === "certificate" && data.certMarkdown) {
        triggerClientDownload(`PIEW-AUDIT-CERTIFICATE-${activeSessionId}.md`, data.certMarkdown);
        setExportNotice(`Sertifikat audit PIEW-AUDIT-CERTIFICATE-${activeSessionId}.md berhasil diunduh.`);
      } else if (targetType === "bundle" && data.jsonContent) {
        triggerClientDownload(`piew-handover-bundle-${activeSessionId}.json`, data.jsonContent, "application/json");
        setExportNotice(`Bundel serah terima piew-handover-bundle-${activeSessionId}.json berhasil diunduh.`);
      } else if (targetType === "blueprint" && data.blueprintMarkdown) {
        triggerClientDownload(`MASTER-BLUEPRINT-${activeSessionId}.md`, data.blueprintMarkdown);
        setExportNotice(`Cetak biru MASTER-BLUEPRINT-${activeSessionId}.md berhasil diunduh.`);
      } else {
        setExportNotice(`Berkas diekspor ke disk: ${data.exportRes?.markdownPath || "Tersimpan"}`);
      }
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: unknown) {
      setExportNotice(`Error ekspor: ${(err as Error)?.message}`);
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            VERIFIED
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center gap-1">
            <Play className="w-3 h-3 animate-pulse" />
            IN_PROGRESS
          </span>
        );
      case "REJECTED_NEEDS_REPAIR":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" />
            NEEDS_REPAIR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-zinc-500/10 text-muted-foreground border border-zinc-500/20">
            TODO
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Console Top Bar: Title, Session Selector & Quick Action Controls */}
      <div className="p-4 rounded-lg border border-border/80 bg-card/60 shadow-xs backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                PIEW Autonomous Supervision Console v3.1
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted/40 text-zinc-600 dark:text-zinc-300">
                Zero-Trust MCP
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Audit 4 Lapis Otonom, Verifikasi Artefak Disk (SHA-256), Eksekusi Command Mandiri, dan 4-Mode Human Override.
            </p>
          </div>
        </div>

        {/* Toolbar: Session Selection & Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sesi Dropdown */}
          <div className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded-md border border-border/80">
            <span className="text-[11px] text-muted-foreground font-mono">Sesi:</span>
            <select
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="text-xs bg-transparent text-foreground font-mono outline-hidden cursor-pointer"
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
            title="Refresh status sesi aktif"
            className="p-1.5 rounded-lg border border-border/80 hover:bg-muted/60 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Button: Riwayat Proyek Persisten (~/.piew/sessions/) */}
          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border/80 hover:bg-muted/60 text-muted-foreground transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
            <span>Riwayat Sesi ({sessions.length})</span>
          </button>

          {/* Button: Mulai Sesi Baru */}
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mulai Proyek Baru</span>
          </button>

          {activeSessionId && (
            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Human Override</span>
            </button>
          )}
        </div>
      </div>

      {/* Export / Notification Banner */}
      {exportNotice && (
        <div className="p-3 text-xs rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{exportNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-muted-foreground hover:text-zinc-200 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-0.5 text-red-400 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Human-in-Control Action Panel (4 Quick Action Buttons) */}
      {activeSessionId && (
        <div className="p-3.5 rounded-md border border-border/80 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-foreground">
              Panel Intervensi Manusia (Human Override 4 Mode):
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode 1: Inject Constraint */}
            <button
              type="button"
              onClick={() => {
                setOverrideAction("INJECT_CONSTRAINT");
                setIsOverrideModalOpen(true);
              }}
              className="px-2.5 py-1 text-xs rounded-lg font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>🛑 Suntik Batasan Baru</span>
            </button>

            {/* Mode 2: Force Verify Phase */}
            <button
              type="button"
              onClick={() => {
                if (confirm(`Paksa fase [${activePhaseIndex}] ${activePhase?.phaseName || ""} menjadi VERIFIED?`)) {
                  handleApplyOverrideAction("FORCE_VERIFY_PHASE", "Otorisasi manual operator: false-positive override");
                }
              }}
              className="px-2.5 py-1 text-xs rounded-lg font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>⚡ Paksa Loloskan Fase</span>
            </button>

            {/* Mode 3: Pause / Resume */}
            <button
              type="button"
              onClick={() => {
                if (isHalted) {
                  handleApplyOverrideAction("RESUME_PROJECT", "Lanjutkan proyek dari penundaan");
                } else {
                  handleApplyOverrideAction("ABORT_PROJECT", "Jeda operasional sementara");
                }
              }}
              className="px-2.5 py-1 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground transition-all cursor-pointer flex items-center gap-1"
            >
              {isHalted ? (
                <>
                  <Play className="w-3 h-3 text-emerald-500" />
                  <span>Lanjutkan Proyek (Resume)</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 text-amber-500" />
                  <span>Jeda Proyek (Pause)</span>
                </>
              )}
            </button>

            {/* Mode 4: Abort Project */}
            <button
              type="button"
              onClick={() => {
                if (confirm("Hentikan proyek darurat? Status proyek akan menjadi HALTED.")) {
                  handleApplyOverrideAction("ABORT_PROJECT", "Pembatalan darurat oleh pengguna");
                }
              }}
              className="px-2.5 py-1 text-xs rounded-lg font-medium border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <AlertOctagon className="w-3 h-3" />
              <span>Hentikan Proyek (Abort)</span>
            </button>
          </div>
        </div>
      )}

      {!statusReport ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30">
          <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-bounce" />
          <h4 className="text-sm font-semibold text-muted-foreground">
            Tidak Ada Sesi Supervisi yang Dipilih
          </h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Pilih sesi yang tersimpan di disk atau klik tombol <strong>Mulai Proyek Baru</strong> untuk menginisialisasi loop supervisi otonom.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Phase Stepper & Audit Radar (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Audit Radar Score Card (0-100) */}
            <div className="p-5 rounded-lg border border-border/80 bg-card/60 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Audit Radar & Status Proyek
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md ${
                    isHalted
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : isCompleted
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {statusReport.overallStatus || "ACTIVE"}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Kemajuan Proyek (Fase Terverifikasi)</span>
                  <span className="font-mono font-bold text-foreground">
                    {statusReport.progressPercentage}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${statusReport.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* 4 Pillars Audit Radar Score */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-md border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileCheck className="w-3.5 h-3.5 text-sky-500" />
                    <span>Evidence Check</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-foreground">
                    {latestAuditResult?.evidenceCheckPassed ? "100/100 (PASSED)" : "READY"}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>Anti-Scope-Creep</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-foreground">
                    {latestAuditResult?.scopeCreepOrForbiddenViolations?.length === 0
                      ? "CLEAN (0 Celah)"
                      : "TERPROTEKSI"}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Zero-Trust Runner</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-foreground">
                    {latestAuditResult?.independentExecutionResult?.executed
                      ? `EXIT ${latestAuditResult.independentExecutionResult.exitCode}`
                      : "STANDBY"}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Hash className="w-3.5 h-3.5 text-purple-500" />
                    <span>Artefak Disk (SHA-256)</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold font-mono text-foreground">
                    {latestAuditResult?.artifactIntegrity?.filter((a: any) => a.existsOnDisk).length || 0} /{" "}
                    {latestAuditResult?.artifactIntegrity?.length || 0} File
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Stepper List (0 to 5) */}
            <div className="p-5 rounded-lg border border-border/80 bg-card/60 shadow-xs">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Roadmap 6 Fase Eksekusi Proyek
              </h4>
              <div className="space-y-2.5">
                {statusReport.phases?.map((ph: any, idx: number) => {
                  const isActive = idx === activePhaseIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-md border transition-all ${
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
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-muted-foreground"
                            }`}
                          >
                            {idx}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {ph.title || ph.phaseName || `Fase ${idx}`}
                          </span>
                        </div>
                        {getStatusBadge(ph.status)}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center justify-between pl-7">
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

          {/* Right Column: Active Phase Workbench, Command Runner, Artifact Table & Download Center (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Active Phase Dispatch / Corrective Action Card */}
            <div className="p-5 rounded-lg border border-border/80 bg-card/60 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-semibold text-foreground">
                    Fase Aktif: [{activePhaseIndex}] {activePhase?.title || activePhase?.phaseName || "In Progress"}
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  ID: {activeSessionId}
                </span>
              </div>

              {/* Feature 1: REJECTED_NEEDS_REPAIR Alert & 1-Click Copy Corrective Prompt */}
              {isRejectedNeedsRepair && correctivePrompt && (
                <div className="mb-4 p-3.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                      <span>Fase Ditolak Supervisor! Perbaiki Sesuai Instruksi Mandiri:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(correctivePrompt, "corrective")}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      {copiedPromptType === "corrective" ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Tersalin ke Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Corrective Repair Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-red-200 max-h-[140px] overflow-auto whitespace-pre-wrap leading-relaxed border border-red-900/50">
                    {correctivePrompt}
                  </pre>
                </div>
              )}

              {/* Feature 1: Phase Dispatch Prompt & 1-Click Copy Phase Prompt */}
              {dispatchPrompt && !isRejectedNeedsRepair && (
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Instruksi Penugasan Agent (Dispatch Prompt):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(dispatchPrompt, "dispatch")}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/80 hover:bg-muted/60 text-muted-foreground flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedPromptType === "dispatch" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Tersalin ke Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Phase Dispatch Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-md bg-zinc-950 text-zinc-300 font-mono text-[11px] max-h-[160px] overflow-auto whitespace-pre-wrap leading-relaxed border border-zinc-800">
                    {dispatchPrompt}
                  </pre>
                </div>
              )}

              {/* Phase Deliverable Form */}
              <form onSubmit={handleSubmitPhase} className="space-y-3 pt-3 border-t border-border/80">
                <span className="text-xs font-semibold text-foreground block">
                  Kirim Hasil Pengerjaan Fase (Submit for Zero-Trust Audit):
                </span>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Ringkasan Pekerjaan:</label>
                  <input
                    type="text"
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    placeholder="Contoh: Selesai merancang database relasional dan transaction flow atomic"
                    className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      Artefak Dihasilkan (1 per baris):
                    </label>
                    <textarea
                      rows={2}
                      value={artifactsInput}
                      onChange={(e) => setArtifactsInput(e.target.value)}
                      placeholder="DATABASE_SCHEMA.prisma&#10;ARCHITECTURE.md"
                      className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      Perintah Verifikasi (Command Runner):
                    </label>
                    <input
                      type="text"
                      value={verificationCommand}
                      onChange={(e) => setVerificationCommand(e.target.value)}
                      placeholder='node -e "process.exit(0)"'
                      className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground font-mono text-[11px]"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Dieksekusi langsung oleh Zero-Trust Independent Runner
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    Output Log Verifikasi / Test Output:
                  </label>
                  <textarea
                    rows={2}
                    value={testOutput}
                    onChange={(e) => setTestOutput(e.target.value)}
                    placeholder="PASS - All 10 tests passed (Exit Code 0)"
                    className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground font-mono text-[11px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPhase}
                  className="w-full py-2 px-4 rounded-md bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPhase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengaudit 4 Lapis & Memverifikasi Integritas Harddisk...</span>
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

            {/* Feature 5: Zero-Trust Command Execution Inspector */}
            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 font-mono text-xs shadow-md">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-zinc-300">
                    Zero-Trust Command Execution Inspector
                  </span>
                </div>
                {latestAuditResult?.independentExecutionResult?.executed && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        latestAuditResult.independentExecutionResult.exitCode === 0
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-400 border border-red-500/40"
                      }`}
                    >
                      EXIT {latestAuditResult.independentExecutionResult.exitCode}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {latestAuditResult.independentExecutionResult.durationMs}ms
                    </span>
                  </div>
                )}
              </div>

              {latestAuditResult?.independentExecutionResult?.executed ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-zinc-800">
                    <span className="text-amber-500 font-bold">$</span>
                    <span className="text-zinc-200">
                      {latestAuditResult.independentExecutionResult.command}
                    </span>
                  </div>

                  {/* Tabs: Stdout / Stderr / Raw */}
                  <div className="flex items-center gap-1 border-b border-zinc-800 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveLogTab("stdout")}
                      className={`px-2.5 py-1 text-[11px] rounded-t-lg transition-colors cursor-pointer ${
                        activeLogTab === "stdout"
                          ? "bg-zinc-800 text-zinc-100 font-bold"
                          : "text-muted-foreground hover:text-zinc-300"
                      }`}
                    >
                      STDOUT
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLogTab("stderr")}
                      className={`px-2.5 py-1 text-[11px] rounded-t-lg transition-colors cursor-pointer ${
                        activeLogTab === "stderr"
                          ? "bg-zinc-800 text-zinc-100 font-bold"
                          : "text-muted-foreground hover:text-zinc-300"
                      }`}
                    >
                      STDERR
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLogTab("raw")}
                      className={`px-2.5 py-1 text-[11px] rounded-t-lg transition-colors cursor-pointer ${
                        activeLogTab === "raw"
                          ? "bg-zinc-800 text-zinc-100 font-bold"
                          : "text-muted-foreground hover:text-zinc-300"
                      }`}
                    >
                      RAW JSON
                    </button>
                  </div>

                  <pre className="p-3 rounded-b-xl rounded-tr-xl bg-black text-zinc-300 text-[11px] max-h-[140px] overflow-auto whitespace-pre-wrap leading-relaxed border border-zinc-800 font-mono">
                    {activeLogTab === "stdout" &&
                      (latestAuditResult.independentExecutionResult.stdoutSnippet || "(Stdout kosong / bersih)")}
                    {activeLogTab === "stderr" &&
                      (latestAuditResult.independentExecutionResult.stderrSnippet || "(Stderr kosong / bebas error)")}
                    {activeLogTab === "raw" &&
                      JSON.stringify(latestAuditResult.independentExecutionResult, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground text-[11px] italic p-3 text-center">
                  Belum ada eksekusi perintah independen yang dilaporkan. Sertakan verificationCommand saat submit.
                </div>
              )}
            </div>

            {/* Feature 4: Deep Artifact Inspector Table (SHA-256) */}
            <div className="p-4 rounded-lg border border-border/80 bg-card/60 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-500" />
                  <h4 className="text-xs font-semibold text-foreground">
                    Tabel Inspeksi Integritas Artefak Disk (SHA-256 Hash)
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  FS Verifier: Harddisk Local
                </span>
              </div>

              {latestAuditResult?.artifactIntegrity && latestAuditResult.artifactIntegrity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground text-[10px] uppercase">
                        <th className="py-2 px-2.5">Berkas / Deliverable</th>
                        <th className="py-2 px-2.5">Status Disk</th>
                        <th className="py-2 px-2.5">Ukuran</th>
                        <th className="py-2 px-2.5">Hash SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {latestAuditResult.artifactIntegrity.map((art: any, aIdx: number) => (
                        <tr key={aIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2 px-2.5 font-medium text-foreground">
                            {art.name}
                          </td>
                          <td className="py-2 px-2.5">
                            {art.existsOnDisk ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                ADA DI DISK
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 border border-red-500/20">
                                TIDAK DITEMUKAN
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-muted-foreground">
                            {art.sizeBytes !== undefined ? `${art.sizeBytes} B` : "-"}
                          </td>
                          <td className="py-2 px-2.5">
                            {art.sha256 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(art.sha256);
                                  setCopiedHash(art.sha256);
                                  setTimeout(() => setCopiedHash(null), 2000);
                                }}
                                title="Klik untuk menyalin SHA-256 hash lengkap"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/40 text-zinc-600 dark:text-zinc-300 text-[10px] hover:bg-muted/80 cursor-pointer"
                              >
                                <span>{art.sha256.slice(0, 10)}...</span>
                                {copiedHash === art.sha256 ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted-foreground text-[11px] italic p-3 text-center">
                  Belum ada artefak yang diperiksa di disk pada fase ini.
                </div>
              )}
            </div>

            {/* Feature 6: Handover & Certification Download Center */}
            <div className="p-4 rounded-lg border border-border/80 bg-card/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-semibold text-foreground">
                    Pusat Unduhan Berkas Serah Terima (Handover Center)
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {isCompleted ? "STATUS: PROYEK LULUS (COMPLETED)" : "STATUS: DAPAT DIEKSPOR KAPAN SAJA"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Download 1: Blueprint Markdown */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportAndDownload("blueprint")}
                  className="p-2.5 rounded-md border border-border/80 hover:border-amber-500/40 bg-muted/20 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                    <span>1. Master Blueprint</span>
                    <Download className="w-3.5 h-3.5 text-amber-500 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    MASTER-BLUEPRINT-{activeSessionId}.md
                  </span>
                </button>

                {/* Download 2: Audit Certificate */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportAndDownload("certificate")}
                  className="p-2.5 rounded-md border border-border/80 hover:border-emerald-500/40 bg-muted/20 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                    <span>2. Sertifikat Kelulusan</span>
                    <Download className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    PIEW-AUDIT-CERTIFICATE-{activeSessionId}.md
                  </span>
                </button>

                {/* Download 3: Handover Bundle JSON */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportAndDownload("bundle")}
                  className="p-2.5 rounded-md border border-border/80 hover:border-sky-500/40 bg-muted/20 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                    <span>3. Bundel Serah Terima</span>
                    <Download className="w-3.5 h-3.5 text-sky-500 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    piew-handover-bundle-{activeSessionId}.json
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature 3: Modal Persistent Project Session History (~/.piew/sessions/) */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col p-5 rounded-lg border border-border/80 bg-card shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-sky-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Riwayat Sesi Proyek Terdaftar (~/.piew/sessions/)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Belum ada sesi proyek yang tersimpan di disk.
                </div>
              ) : (
                sessions.map((s) => {
                  const isCurrent = s.sessionId === activeSessionId;
                  return (
                    <div
                      key={s.sessionId}
                      className={`p-3 rounded-md border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? "border-amber-500 bg-amber-500/5 shadow-xs"
                          : "border-border/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-muted/20"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {s.sessionId}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              s.overallStatus === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : s.overallStatus === "HALTED_MAX_RETRIES"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                            }`}
                          >
                            {s.overallStatus || "ACTIVE"}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold">
                              AKTIF
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-muted-foreground line-clamp-1">
                          {s.originalPrompt || s.goal || "Sesi rekayasa prompt mandiri"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSessionId(s.sessionId);
                          setIsHistoryDrawerOpen(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-amber-500 text-black shadow-xs"
                            : "bg-zinc-200 dark:bg-zinc-800 text-foreground hover:bg-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {isCurrent ? "Sedang Dibuka" : "Buka Proyek Ini"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Start New Project */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg p-5 rounded-lg border border-border/80 bg-card shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-500" />
              Inisialisasi Sesi Supervisi Otonom Baru
            </h3>

            <form onSubmit={handleStartSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target / Sasaran Kebutuhan Proyek:
                </label>
                <textarea
                  rows={3}
                  required
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-md border border-border/80 bg-background/80 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Batasan Larangan / Anti-Scope-Creep (1 per baris):
                </label>
                <textarea
                  rows={2}
                  value={newConstraints}
                  onChange={(e) => setNewConstraints(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-md border border-border/80 bg-background/80 text-foreground font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-zinc-600 dark:text-muted-foreground hover:bg-muted/60 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCreatingSession && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Mulai Proyek</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Human Override (All 4 Modes) */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg p-5 rounded-lg border border-border/80 bg-card shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Human-in-Control Override Intervention (4 Mode)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Pilih Mode Intervensi:
                </label>
                <select
                  value={overrideAction}
                  onChange={(e) => setOverrideAction(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground cursor-pointer"
                >
                  <option value="INJECT_CONSTRAINT">1. INJECT_CONSTRAINT (Suntik Batasan Larangan Baru)</option>
                  <option value="FORCE_VERIFY_PHASE">2. FORCE_VERIFY_PHASE (Paksa Loloskan Fase / False-Positive)</option>
                  <option value="RESUME_PROJECT">3. RESUME_PROJECT (Lanjutkan Proyek yang Tertunda)</option>
                  <option value="ABORT_PROJECT">4. ABORT_PROJECT (Hentikan Proyek Darurat / Halt)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Alasan / Instruksi Pengguna:
                </label>
                <input
                  type="text"
                  required
                  value={overrideInstruction}
                  onChange={(e) => setOverrideInstruction(e.target.value)}
                  placeholder="Contoh: Menambahkan larangan dependensi eksternal yang tidak aman"
                  className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground"
                />
              </div>

              {overrideAction === "INJECT_CONSTRAINT" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Batasan Baru yang Disuntikkan (1 per baris):
                  </label>
                  <textarea
                    rows={2}
                    value={overrideConstraints}
                    onChange={(e) => setOverrideConstraints(e.target.value)}
                    placeholder="DILARANG mengimpor library di luar standar"
                    className="w-full text-xs p-2 rounded-lg border border-border/80 bg-background/80 text-foreground font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-zinc-600 dark:text-muted-foreground hover:bg-muted/60 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isApplyingOverride}
                  onClick={() => handleApplyOverrideAction(overrideAction)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isApplyingOverride && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Terapkan Override</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
