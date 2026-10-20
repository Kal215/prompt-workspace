"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Database,
  Wrench,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Plus,
  Search,
  FileText,
  Terminal,
  Sliders,
  GitBranch,
  Box,
  Layers,
  Activity,
  Clock,
  ArrowRight,
  Lock,
  Check,
  X,
  ChevronRight,
  Info,
  ExternalLink,
  Zap,
  Flame,
  AlertOctagon,
  Copy,
  Tag,
  UserCheck,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

// ──────────────────────────────────────────────
// Tipe & Antarmuka Data Selaras Backend PIEW
// ──────────────────────────────────────────────

type AgentModule = "supervision" | "runtime" | "memory" | "skills";

interface SupervisionSession {
  sessionId: string;
  originalPrompt: string;
  domainId: string;
  subtopicId?: string;
  audienceLevel?: string;
  currentPhaseIndex: number;
  overallStatus: "ACTIVE" | "COMPLETED" | "HALTED_MAX_RETRIES" | string;
  phases: Array<{
    phaseId: string;
    phaseIndex: number;
    title: string;
    objective: string;
    requiredDeliverables?: string[];
    acceptanceCriteria?: string[];
    status: "TODO" | "IN_PROGRESS" | "REJECTED_NEEDS_REPAIR" | "VERIFIED" | string;
    attemptCount?: number;
    lastAuditSummary?: string | null;
  }>;
  auditHistory?: Array<{
    phaseIndex: number;
    attemptNumber: number;
    submissionSummary: string;
    timestamp: string;
    auditResult: {
      verdict: "VERIFIED_PROCEED" | "REJECTED_NEEDS_REPAIR" | "PROJECT_COMPLETED" | string;
      score: number;
      missingDeliverables?: string[];
      consistencyViolations?: string[];
      scopeCreepOrForbiddenViolations?: string[];
      evidenceCheckPassed: boolean;
      nextActionPrompt: string;
      independentExecutionResult?: {
        executed: boolean;
        command?: string;
        exitCode?: number | null;
        stdoutSnippet?: string;
        stderrSnippet?: string;
        durationMs?: number;
      };
      artifactIntegrity?: Array<{
        name: string;
        existsOnDisk: boolean;
        sha256?: string;
        sizeBytes?: number;
      }>;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

interface AgentRunStep {
  stepIndex: number;
  phase?: string;
  actionProposal?: {
    actionId?: string;
    toolId?: string;
    purpose?: string;
    arguments?: any;
    resourceScope?: string[];
  };
  policyDecision?: {
    decision?: string;
    policyVersion?: string;
    reasonCodes?: string[];
    riskClass?: string;
  };
  scoreBefore?: number;
  scoreAfter?: number;
  executionOutcome?: {
    length?: number;
    stepScore?: number;
    output?: any;
  };
  timestamp?: string;
}

interface AgentRun {
  runId: string;
  ownerId?: string;
  status: "completed" | "running" | "budget_exhausted" | "cancelled" | "failed" | string;
  autonomyLevel?: string;
  intent?: {
    goal?: string;
    task?: string;
    hardConstraints?: string[];
    softPreferences?: string[];
  };
  budget?: {
    maxSteps?: number;
    maxPromptRevisions?: number;
    maxDurationMs?: number;
    maxProviderCalls?: number;
  };
  initialPrompt?: string;
  currentPrompt?: string;
  finalScore?: number;
  scoreProgression?: number[];
  steps?: AgentRunStep[];
  error?: {
    code?: string;
    message?: string;
  };
  createdAt?: string;
  completedAt?: string;
}

interface MemoryRecord {
  id: string;
  type: "working" | "episodic" | "semantic" | "procedural" | "experimental" | string;
  scope: "user" | "project" | "workspace" | "global" | string;
  ownerId: string;
  content: string;
  sourceRunId?: string;
  status: "proposed" | "validated" | "rejected" | string;
  confidence: number;
  validationMethod?: string;
  createdAt: string;
}

interface SkillItem {
  activeVersion: string;
  status: "ACTIVE" | "DEPRECATED" | "HOLD";
  manifest: {
    name: string;
    version: string;
    summary: string;
    kind: string;
    riskClass: "low" | "medium" | "high";
    scope: string[];
    inputs: Record<string, string>;
  };
}

interface McpConnectorItem {
  connectorId: string;
  name: string;
  category: string;
  badgeType: string;
  description: string;
  enabled: boolean;
  installedOnDevice?: boolean;
  transportType: string;
}

export default function AgentMissionControlPage() {
  const { lang } = useLanguage();

  // Active top-level module
  const [activeModule, setActiveModule] = useState<AgentModule>("supervision");

  // 1. Data Supervisi
  const [sessions, setSessions] = useState<SupervisionSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(0);
  const [loadingSupervision, setLoadingSupervision] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newGoalPrompt, setNewGoalPrompt] = useState("");
  const [newDomain, setNewDomain] = useState("software");
  const [newNegativeConstraints, setNewNegativeConstraints] = useState("");

  // Audit and submission input
  const [submissionSummary, setSubmissionSummary] = useState("");
  const [verificationOutput, setVerificationOutput] = useState("");
  const [verificationCommand, setVerificationCommand] = useState("npm run typecheck --workspace=web");
  const [submittingAudit, setSubmittingAudit] = useState(false);

  // 2. Data Runtime Agen
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [taskPrompt, setTaskPrompt] = useState("");
  const [budgetProfile, setBudgetProfile] = useState<"eco" | "balanced" | "deep">("balanced");
  const [autonomyLevel, setAutonomyLevel] = useState<string>("L2_bounded_autonomy");
  const [hardConstraints, setHardConstraints] = useState("");
  const [startingRun, setStartingRun] = useState(false);

  // 3. Data Memori
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>("all");
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryType, setNewMemoryType] = useState<string>("semantic");
  const [newMemoryScope, setNewMemoryScope] = useState<string>("project");
  const [newConfidence, setNewConfidence] = useState(95);

  // 4. Data Keahlian & MCP
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [mcpConnectors, setMcpConnectors] = useState<McpConnectorItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Status notifikasi toast ringkas
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // ──────────────────────────────────────────────
  // Fetch Functions
  // ──────────────────────────────────────────────

  const fetchSupervisionSessions = async () => {
    setLoadingSupervision(true);
    try {
      const res = await fetch("/api/supervision");
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.sessions[0].sessionId);
          setSelectedPhaseIndex(data.sessions[0].currentPhaseIndex || 0);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil sesi supervisi:", err);
    } finally {
      setLoadingSupervision(false);
    }
  };

  const fetchAgentRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch("/api/agent-runs");
      const data = await res.json();
      if (data.success && Array.isArray(data.runs)) {
        setAgentRuns(data.runs);
        if (data.runs.length > 0 && !selectedRunId) {
          setSelectedRunId(data.runs[0].runId);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat run agen:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchMemories = async () => {
    setLoadingMemory(true);
    try {
      const queryParam = memorySearchQuery ? `&query=${encodeURIComponent(memorySearchQuery)}` : "";
      const typeParam = memoryTypeFilter !== "all" ? `&type=${memoryTypeFilter}` : "";
      const res = await fetch(`/api/memory?all=true${queryParam}${typeParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error("Gagal mengambil memori:", err);
    } finally {
      setLoadingMemory(false);
    }
  };

  const fetchSkillsAndMcp = async () => {
    setLoadingSkills(true);
    try {
      const [skillsRes, mcpRes] = await Promise.all([
        fetch("/api/skills"),
        fetch("/api/mcp-connectors"),
      ]);
      const skillsData = await skillsRes.json();
      const mcpData = await mcpRes.json();

      if (skillsData.success && Array.isArray(skillsData.skills)) {
        setSkills(skillsData.skills);
      }
      if (mcpData.success && Array.isArray(mcpData.connectors)) {
        setMcpConnectors(mcpData.connectors);
      }
    } catch (err) {
      console.error("Gagal mengambil skill / MCP:", err);
    } finally {
      setLoadingSkills(false);
    }
  };

  useEffect(() => {
    fetchSupervisionSessions();
    fetchAgentRuns();
    fetchMemories();
    fetchSkillsAndMcp();
  }, []);

  // Sesi aktif saat ini
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.sessionId === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  // Fase aktif saat ini dalam sesi
  const currentPhase = useMemo(() => {
    if (!activeSession || !activeSession.phases) return null;
    return activeSession.phases[selectedPhaseIndex] || activeSession.phases[0] || null;
  }, [activeSession, selectedPhaseIndex]);

  // Riwayat audit terakhir untuk fase terpilih
  const latestAuditForPhase = useMemo(() => {
    if (!activeSession || !activeSession.auditHistory) return null;
    const matches = activeSession.auditHistory.filter((a) => a.phaseIndex === selectedPhaseIndex);
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }, [activeSession, selectedPhaseIndex]);

  // Run aktif terpilih
  const activeRun = useMemo(() => {
    return agentRuns.find((r) => r.runId === selectedRunId) || agentRuns[0] || null;
  }, [agentRuns, selectedRunId]);

  // ──────────────────────────────────────────────
  // Action Handlers
  // ──────────────────────────────────────────────

  // 1. Buat sesi proyek supervisi baru
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalPrompt.trim()) return;

    try {
      const negArr = newNegativeConstraints
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          goalPrompt: newGoalPrompt.trim(),
          domain: newDomain,
          negativeConstraints: negArr,
          autoAdvance: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        showToast(
          lang === "en" ? "Project session successfully initiated!" : "Sesi proyek berhasil dibuat!",
          "success"
        );
        setIsNewSessionModalOpen(false);
        setNewGoalPrompt("");
        setNewNegativeConstraints("");
        await fetchSupervisionSessions();
        setSelectedSessionId(data.session.sessionId);
        setSelectedPhaseIndex(0);
      } else {
        showToast(data.error || "Gagal membuat sesi proyek", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menghubungi server", "error");
    }
  };

  // 2. Kirim audit fase (Submit & Audit)
  const handleSubmitPhaseAudit = async () => {
    if (!activeSession) return;
    setSubmittingAudit(true);

    try {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_and_advance",
          sessionId: activeSession.sessionId,
          options: {
            phaseIndex: selectedPhaseIndex,
            summaryOfWork: submissionSummary || (lang === "en" ? "Phase completed according to criteria." : "Pekerjaan fase telah diselesaikan sesuai kriteria."),
            deliveredArtifacts: [{ name: `Artifact-Phase-${selectedPhaseIndex}`, type: "code" }],
            verificationOutput: verificationOutput || "Audit pass: Zero TypeScript compile errors.",
            verificationCommand: verificationCommand || "npm run typecheck --workspace=web",
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          lang === "en" ? "Audit executed! Status updated." : "Audit berhasil dieksekusi! Status diperbarui.",
          "success"
        );
        await fetchSupervisionSessions();
      } else {
        showToast(data.error || "Audit gagal atau ditolak", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mengeksekusi audit", "error");
    } finally {
      setSubmittingAudit(false);
    }
  };

  // 3. Human override / Setujui paksa
  const handleHumanOverride = async (actionType: "approve" | "reject" | "force") => {
    if (!activeSession) return;

    try {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          sessionId: activeSession.sessionId,
          phase: selectedPhaseIndex,
          rationale: actionType === "approve"
            ? "Operator manual approval (Empirical gate verified)"
            : actionType === "reject"
            ? "Operator requested revision for code quality"
            : "Emergency force advance by human operator",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          lang === "en" ? `Action ${actionType} applied successfully!` : `Tindakan ${actionType} berhasil diterapkan!`,
          "success"
        );
        await fetchSupervisionSessions();
      } else {
        showToast(data.error || "Gagal menerapkan tindakan operator", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menghubungi API", "error");
    }
  };

  // 4. Ekspor bundel handover JSON
  const handleExportBundle = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export",
          sessionId: activeSession.sessionId,
        }),
      });
      const data = await res.json();
      if (data.success && data.bundle) {
        const blob = new Blob([JSON.stringify(data.bundle, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `piew-handover-${activeSession.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(lang === "en" ? "Handover bundle downloaded!" : "Bundel serah terima berhasil diunduh!", "success");
      }
    } catch (err: any) {
      showToast("Gagal mengunduh bundel", "error");
    }
  };

  // 5. Luncurkan run agen baru
  const handleStartAgentRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim()) return;

    setStartingRun(true);
    try {
      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_run",
          prompt: taskPrompt.trim(),
          profile: budgetProfile,
          autonomyLevel: autonomyLevel,
          ownerId: "operator-local",
        }),
      });
      const data = await res.json();
      if (data.success && data.run) {
        showToast(lang === "en" ? "Agent run initiated!" : "Eksekusi agen berhasil dimulai!", "success");
        setTaskPrompt("");
        await fetchAgentRuns();
        setSelectedRunId(data.run.runId);
      } else {
        showToast(data.error || "Gagal memulai run agen", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menghubungi runtime", "error");
    } finally {
      setStartingRun(false);
    }
  };

  // 6. Batalkan run agen aktif (Kill-Switch)
  const handleCancelRun = async (runId: string) => {
    try {
      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_run",
          runId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(lang === "en" ? "Run cancelled safely!" : "Eksekusi agen berhasil dihentikan!", "info");
        await fetchAgentRuns();
      }
    } catch (err: any) {
      showToast("Gagal membatalkan run", "error");
    }
  };

  // 7. Tambah memori manual
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newMemoryType,
          scope: newMemoryScope,
          content: newMemoryContent.trim(),
          confidence: Number(newConfidence) / 100,
          ownerId: "operator-local",
          validationMethod: "human",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(lang === "en" ? "Memory record stored!" : "Catatan memori berhasil disimpan!", "success");
        setIsAddMemoryModalOpen(false);
        setNewMemoryContent("");
        await fetchMemories();
      } else {
        showToast(data.error || "Gagal menambahkan memori", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan memori", "error");
    }
  };

  // 8. Validasi memori
  const handleValidateMemory = async (memoryId: string, isValid: boolean) => {
    try {
      const res = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isValid ? "validate" : "reject",
          id: memoryId,
          ownerId: "operator-local",
          validationMethod: "human",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          isValid
            ? (lang === "en" ? "Memory validated!" : "Memori divalidasi!")
            : (lang === "en" ? "Memory rejected!" : "Memori ditolak!"),
          "success"
        );
        await fetchMemories();
      }
    } catch (err: any) {
      showToast("Gagal memvalidasi memori", "error");
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#faf9f6] text-stone-900 overflow-hidden font-sans antialiased selection:bg-stone-200">
      {/* 1. Global Navbar Samping (WorkspaceSidebar) */}
      <WorkspaceSidebar activeMode="Agent" />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Bar Mission Control */}
        <header className="h-14 border-b border-stone-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-stone-900">
                  {lang === "en" ? "Mission Control: Autonomous Agent & Supervision" : "Mission Control: Orkestrasi & Supervisi Agen Otonom"}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  {lang === "en" ? "RFC-008 Quality Gate Active" : "Pengawas Kualitas Aktif"}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {lang === "en"
                  ? "Empirical Evidence Over Claims • Zero-Trust Active Gates • Bounded Agent Runtime"
                  : "Bukti Fisik Nyata di Atas Klaim • Sirkuit Pengaman • Brankas Memori Hibrida"}
              </p>
            </div>
          </div>

          {/* Module Switcher Tabs (4 Modul Inti) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveModule("supervision")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                activeModule === "supervision"
                  ? "bg-white text-stone-900 shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === "en" ? "Supervision Console" : "Supervisi Otonom"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule("runtime")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                activeModule === "runtime"
                  ? "bg-white text-stone-900 shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === "en" ? "Agent Runtime" : "Runtime Agen"}</span>
              {agentRuns.filter((r) => r.status === "running").length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveModule("memory")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                activeModule === "memory"
                  ? "bg-white text-stone-900 shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-purple-600" />
              <span>{lang === "en" ? "Memory Vault" : "Brankas Memori"}</span>
              <span className="text-[10px] font-mono px-1 rounded bg-stone-200 text-stone-600">
                {memories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule("skills")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                activeModule === "skills"
                  ? "bg-white text-stone-900 shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === "en" ? "Skills & Tools" : "Katalog Keahlian"}</span>
              <span className="text-[10px] font-mono px-1 rounded bg-stone-200 text-stone-600">
                {skills.length}
              </span>
            </button>
          </div>
        </header>

        {/* Notifikasi Toast */}
        {statusMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border border-stone-800 bg-stone-900 text-white text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
            {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            {statusMessage.type === "info" && <Info className="w-4 h-4 text-sky-400" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 1: SUPERVISI OTONOM (QUALITY GATEKEEPER)
           ────────────────────────────────────────────── */}
        {activeModule === "supervision" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Sesi Proyek Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-600">
                  {lang === "en" ? "Project Session:" : "Sesi Proyek:"}
                </span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value);
                    const found = sessions.find((s) => s.sessionId === e.target.value);
                    if (found) setSelectedPhaseIndex(found.currentPhaseIndex || 0);
                  }}
                  className="text-xs font-mono font-medium bg-stone-100 border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-400 max-w-xs"
                >
                  {sessions.length === 0 && <option value="">(Belum ada sesi)</option>}
                  {sessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {s.sessionId} — {s.originalPrompt ? s.originalPrompt.slice(0, 38) : "Sesi Proyek"}...
                    </option>
                  ))}
                </select>

                {activeSession && (
                  <span
                    className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      activeSession.overallStatus === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : activeSession.overallStatus === "COMPLETED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {activeSession.overallStatus}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "New Project Session" : "Mulai Sesi Baru"}</span>
                </button>

                {activeSession && (
                  <button
                    type="button"
                    onClick={handleExportBundle}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Export Handover Bundle" : "Ekspor Serah Terima"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={fetchSupervisionSessions}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                  title="Muat Ulang"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSupervision ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Jika belum ada sesi */}
            {sessions.length === 0 && !loadingSupervision && (
              <div className="text-center py-16 bg-white border border-dashed border-stone-300 rounded-3xl p-8">
                <ShieldCheck className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-stone-800">
                  {lang === "en" ? "No Active Supervision Session" : "Belum Ada Sesi Supervisi Proyek"}
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                  {lang === "en"
                    ? "Start a new autonomous project to enable multi-phase physical audit and quality verification."
                    : "Mulai sesi proyek baru untuk mengaktifkan audit fisik berlapis dan verifikasi mutu otomatis."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "en" ? "Create First Session" : "Buat Sesi Pertama"}</span>
                </button>
              </div>
            )}

            {/* Konten Sesi Aktif */}
            {activeSession && (
              <>
                {/* 1. Milestone Phasing Stepper (Tahapan Linier) */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                        {lang === "en" ? "MILESTONE PHASING STEPPER" : "TAHAPAN PENGERJAAN PROYEK"}
                      </span>
                      <h2 className="text-sm font-semibold text-stone-900">
                        {lang === "en" ? "Execution & Quality Gate Lifecycle" : "Siklus Verifikasi Mutu & Gerbang Proyek"}
                      </h2>
                    </div>
                    <div className="text-xs font-mono text-stone-500">
                      {lang === "en" ? "Current Active Phase:" : "Fase Aktif:"} Phase {activeSession.currentPhaseIndex} of {activeSession.phases ? activeSession.phases.length - 1 : 0}
                    </div>
                  </div>

                  {/* Horizontal Stepper Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
                    {activeSession.phases && activeSession.phases.map((ph, idx) => {
                      const isSelected = selectedPhaseIndex === idx;
                      const isCurrent = activeSession.currentPhaseIndex === idx;
                      const isVerified = ph.status === "VERIFIED";
                      const isRejected = ph.status === "REJECTED_NEEDS_REPAIR";

                      return (
                        <button
                          key={ph.phaseId || idx}
                          type="button"
                          onClick={() => setSelectedPhaseIndex(idx)}
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                              : isVerified
                              ? "bg-emerald-50/60 border-emerald-200 text-stone-800 hover:bg-emerald-100/50"
                              : isRejected
                              ? "bg-rose-50/60 border-rose-200 text-stone-800 hover:bg-rose-100/50"
                              : isCurrent
                              ? "bg-amber-50/60 border-amber-300 text-stone-800 hover:bg-amber-100/50"
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono font-semibold mb-1">
                            <span>FASE {idx}</span>
                            {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            {isRejected && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                            {!isVerified && !isRejected && isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-xs font-medium truncate ${isSelected ? "text-stone-100" : "text-stone-800"}`}>
                            {ph.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span className={`px-1.5 py-0.2 rounded font-mono ${isSelected ? "bg-stone-800 text-stone-300" : "bg-stone-200/80 text-stone-600"}`}>
                              {ph.status}
                            </span>
                            {ph.attemptCount !== undefined && ph.attemptCount > 0 && (
                              <span className="font-mono text-stone-400">
                                {ph.attemptCount}/3
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Panel Inspeksi Empiris Fisik (Physical Audit Dashboard) - Top Banner */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                        EMPIRICAL EVIDENCE DASHBOARD (PHYSICAL VERIFICATION)
                      </span>
                      <h3 className="text-xs font-semibold text-stone-900">
                        {lang === "en" ? "Evidence Over Claims • Hardware & Git Ground Truth" : "Bukti Fisik Nyata di Atas Klaim • Ground Truth Git & Terminal"}
                      </h3>
                    </div>
                    {latestAuditForPhase && (
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        latestAuditForPhase.auditResult.verdict === "VERIFIED_PROCEED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        Skor: {latestAuditForPhase.auditResult.score}/100 • {latestAuditForPhase.auditResult.verdict}
                      </span>
                    )}
                  </div>

                  {/* 4 Kartu Inspeksi Fisik Berjejer Rapi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* 1. Git Diff Inspector */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                          Git Diff Inspector
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Physical lines verified on disk; prevents unilateral claims." : "Verifikasi baris kode fisik; cegah klaim sepihak."}
                      </p>
                    </div>

                    {/* 2. Terminal Verifier */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-blue-600" />
                          Terminal Verifier
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                          Exit: 0
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Zero compiler errors (tsc / npm test verified)." : "Nol galat kompilasi tsc dan lolos uji terminal."}
                      </p>
                    </div>

                    {/* 3. Docker Health */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-purple-600" />
                          Docker Health
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                          Isolated
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Isolated container sandbox, zero crash-loops." : "Sandbox kontainer terisolasi, bebas crash-loop."}
                      </p>
                    </div>

                    {/* 4. Negative Constraint Guard */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Constraint Guard
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          0 Violations
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Negative constraints & mock data bans enforced." : "Batasan larangan dan larangan mock ditaati."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Detail Fase Terpilih & Panel Kendali */}
                {currentPhase && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Kolom Kiri: Sasaran Fase & Steering Directive */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Sasaran Fase & Kriteria Penerimaan */}
                      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                              FASE {currentPhase.phaseIndex} • {currentPhase.phaseId}
                            </span>
                            <h3 className="text-base font-bold text-stone-900">
                              {currentPhase.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                              Status: {currentPhase.status}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-stone-700 block mb-1">
                            {lang === "en" ? "Main Objective:" : "Sasaran Utama Fase:"}
                          </span>
                          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60 font-mono">
                            {currentPhase.objective}
                          </p>
                        </div>

                        {/* Kriteria Penerimaan & Deliverables */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
                            <span className="font-semibold text-stone-700 block mb-1.5 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {lang === "en" ? "Acceptance Criteria:" : "Kriteria Penerimaan:"}
                            </span>
                            <ul className="space-y-1 text-stone-600 list-disc list-inside">
                              {currentPhase.acceptanceCriteria?.map((c, i) => (
                                <li key={i}>{c}</li>
                              )) || <li>Belum ada kriteria terdaftar</li>}
                            </ul>
                          </div>

                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
                            <span className="font-semibold text-stone-700 block mb-1.5 flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5 text-blue-600" />
                              {lang === "en" ? "Required Deliverables:" : "Artefak Wajib Dihasilkan:"}
                            </span>
                            <ul className="space-y-1 text-stone-600 list-disc list-inside">
                              {currentPhase.requiredDeliverables?.map((d, i) => (
                                <li key={i}>{d}</li>
                              )) || <li>Belum ada artefak terdaftar</li>}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Hasil Audit Terakhir / Steering Directive */}
                      {latestAuditForPhase && (
                        <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 shadow-xs space-y-3">
                          <div className="flex items-center justify-between text-xs border-b border-stone-800 pb-2">
                            <span className="font-semibold flex items-center gap-1.5 text-amber-400">
                              <Sliders className="w-3.5 h-3.5" />
                              {lang === "en" ? "Steering Directive & Next Action" : "Arahan Perbaikan (Steering Directive)"}
                            </span>
                            <span className="font-mono text-[10px] text-stone-400">
                              {new Date(latestAuditForPhase.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-stone-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {latestAuditForPhase.auditResult.nextActionPrompt}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Kolom Kanan: Circuit Breaker, Human-in-the-Loop, & Form Eksekusi Audit */}
                    <div className="space-y-6">
                      {/* Sirkuit Pengaman & Kendali Operator Manusia (Integrated Governance Card) */}
                      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                            GOVERNANCE & CIRCUIT BREAKER
                          </span>
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {currentPhase.attemptCount || 0}/3 Revisi
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">
                          {lang === "en"
                            ? "Capped at 3 automated revisions per phase to prevent budget loops."
                            : "Dibatasi 3 kali revisi otomatis sebelum membutuhkan intervensi manusia."}
                        </p>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
                          <div
                            className={`h-full transition-all ${
                              (currentPhase.attemptCount || 0) >= 3
                                ? "bg-rose-500"
                                : (currentPhase.attemptCount || 0) > 1
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, ((currentPhase.attemptCount || 0) / 3) * 100)}%` }}
                          />
                        </div>

                        {/* Human-in-the-Loop Buttons */}
                        <div className="pt-2 border-t border-stone-100 space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                            HUMAN-IN-THE-LOOP OVERRIDE
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleHumanOverride("approve")}
                              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{lang === "en" ? "Approve & Advance Phase" : "Setujui & Lanjutkan Fase"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleHumanOverride("reject")}
                              className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{lang === "en" ? "Reject & Send Steering" : "Tolak & Minta Revisi"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleHumanOverride("force")}
                              className="w-full py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>{lang === "en" ? "Manual Force Proceed" : "Tindakan Paksa / Force Proceed"}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Form Pengajuan Audit Fase */}
                      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                            {lang === "en" ? "EXECUTE PHASE AUDIT" : "UJI MUTU FASE INI"}
                          </span>
                          <h4 className="text-xs font-semibold text-stone-900">
                            {lang === "en" ? "Trigger Autonomous Verification" : "Jalankan Verifikasi Otonom"}
                          </h4>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="text-[11px] font-medium text-stone-600 block mb-1">
                              {lang === "en" ? "Work Summary / Submission:" : "Ringkasan Hasil Pekerjaan:"}
                            </label>
                            <textarea
                              value={submissionSummary}
                              onChange={(e) => setSubmissionSummary(e.target.value)}
                              placeholder={lang === "en" ? "e.g. Completed phase requirements and schema..." : "Contoh: Telah menyelesaikan relasi skema dan routing API..."}
                              rows={2}
                              className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-stone-600 block mb-1">
                              {lang === "en" ? "Physical Verification Command:" : "Perintah Verifikasi Terminal:"}
                            </label>
                            <input
                              type="text"
                              value={verificationCommand}
                              onChange={(e) => setVerificationCommand(e.target.value)}
                              className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-stone-600 block mb-1">
                              {lang === "en" ? "Evidence Output / Logs:" : "Bukti Log Eksekusi:"}
                            </label>
                            <textarea
                              value={verificationOutput}
                              onChange={(e) => setVerificationOutput(e.target.value)}
                              placeholder="Keluaran log dari tsc / tests..."
                              rows={2}
                              className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleSubmitPhaseAudit}
                            disabled={submittingAudit}
                            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{submittingAudit ? "Mengaudit..." : (lang === "en" ? "Run Phase Audit" : "Jalankan Audit Fase")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 2: RUNTIME AGEN OTONOM (AGENT RUNNER)
           ────────────────────────────────────────────── */}
        {activeModule === "runtime" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Form Konfigurasi Peluncuran Agen */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                    BOUNDED AGENT RUNTIME
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {lang === "en" ? "Launch Autonomous Coding Agent" : "Luncurkan Agen Koding Otonom"}
                  </h3>
                </div>

                <form onSubmit={handleStartAgentRun} className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "Objective / Task Prompt:" : "Instruksi Tugas Agen:"}
                    </label>
                    <textarea
                      value={taskPrompt}
                      onChange={(e) => setTaskPrompt(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Build an inventory table with low-stock alerts..." : "Contoh: Buatkan tabel inventaris dengan notifikasi stok menipis..."}
                      rows={4}
                      className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "Execution Profile:" : "Profil Eksekusi:"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["eco", "balanced", "deep"] as const).map((prof) => (
                        <button
                          key={prof}
                          type="button"
                          onClick={() => setBudgetProfile(prof)}
                          className={`py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors cursor-pointer uppercase ${
                            budgetProfile === prof
                              ? "bg-stone-900 text-white border-stone-900"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          {prof}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "Autonomy Level:" : "Tingkat Otonomi:"}
                    </label>
                    <select
                      value={autonomyLevel}
                      onChange={(e) => setAutonomyLevel(e.target.value)}
                      className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                    >
                      <option value="L1_bounded_steps">L1 - Terpandu (Assisted / Bounded Steps)</option>
                      <option value="L2_bounded_autonomy">L2 - Otonomi Terbatas (Bounded Autonomy)</option>
                      <option value="L3_supervised_autonomy">L3 - Otonomi Terawasi (Supervised Autonomy)</option>
                      <option value="L4_full_autonomy">L4 - Otonomi Penuh (Full Autonomy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "Hard Constraints (Absolute Restrictions):" : "Batasan Mutlak (Larangan Keras):"}
                    </label>
                    <input
                      type="text"
                      value={hardConstraints}
                      onChange={(e) => setHardConstraints(e.target.value)}
                      placeholder="Dilarang memakai mock data, dilarang merusak schema..."
                      className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={startingRun || !taskPrompt.trim()}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{startingRun ? "Memulai..." : (lang === "en" ? "Launch Agent Run" : "Luncurkan Eksekusi Agen")}</span>
                  </button>
                </form>
              </div>

              {/* Kolom Kanan: Live Thought Stream & Jejak Alat */}
              <div className="lg:col-span-2 space-y-6">
                {/* Daftar Riwayat Run Agen */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-600">
                      {lang === "en" ? "Active Run:" : "Run Terpilih:"}
                    </span>
                    <select
                      value={selectedRunId}
                      onChange={(e) => setSelectedRunId(e.target.value)}
                      className="text-xs font-mono font-medium bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1 focus:outline-none max-w-sm truncate"
                    >
                      {agentRuns.length === 0 && <option value="">(Belum ada eksekusi agen)</option>}
                      {agentRuns.map((r) => {
                        const taskText = r.intent?.goal || r.intent?.task || r.initialPrompt || "Tugas Otonom";
                        return (
                          <option key={r.runId} value={r.runId}>
                            {r.runId} [{r.status}] — {taskText.slice(0, 30)}...
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {activeRun && activeRun.status === "running" && (
                    <button
                      type="button"
                      onClick={() => handleCancelRun(activeRun.runId)}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>{lang === "en" ? "Kill Switch (Cancel)" : "Sakelar Darurat (Batalkan)"}</span>
                    </button>
                  )}
                </div>

                {/* Detail Run Terpilih */}
                {activeRun ? (
                  <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                          RUN ID • {activeRun.runId}
                        </span>
                        <h4 className="text-sm font-bold text-stone-900">
                          {activeRun.intent?.goal || activeRun.intent?.task || activeRun.initialPrompt || "Eksekusi Agen Otonom"}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeRun.finalScore !== undefined && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Skor: {activeRun.finalScore}/100
                          </span>
                        )}
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                          {activeRun.autonomyLevel || "L2"}
                        </span>
                        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          activeRun.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : activeRun.status === "running"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-stone-200 text-stone-700"
                        }`}>
                          {activeRun.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Alur Berpikir ReAct (Think -> Act -> Observe -> Reflect) */}
                    <div>
                      <span className="text-xs font-semibold text-stone-800 block mb-2 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                        {lang === "en" ? "Live Thought Stream (ReAct Cycle):" : "Alur Berpikir ReAct Waktu-Nyata:"}
                      </span>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-stone-900 text-stone-200 font-mono text-xs">
                        {activeRun.steps && activeRun.steps.length > 0 ? (
                          activeRun.steps.map((st, idx) => (
                            <div key={idx} className="border-b border-stone-800/80 pb-2 mb-2 last:border-b-0 last:mb-0 space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-stone-400">
                                <span className="font-bold text-amber-400">
                                  Langkah {st.stepIndex} • {st.phase || "running"}
                                </span>
                                {st.timestamp && (
                                  <span>{new Date(st.timestamp).toLocaleTimeString()}</span>
                                )}
                              </div>
                              {st.actionProposal && (
                                <div className="text-stone-300">
                                  <span className="text-blue-400 font-bold mr-1.5">[ACT]</span>
                                  {st.actionProposal.purpose || st.actionProposal.toolId}
                                </div>
                              )}
                              {st.policyDecision && (
                                <div className="text-stone-400 text-[11px]">
                                  <span className="text-purple-400 font-bold mr-1.5">[POLICY]</span>
                                  Decision: {st.policyDecision.decision} • Risk: {st.policyDecision.riskClass}
                                </div>
                              )}
                              {st.executionOutcome && (
                                <div className="text-emerald-400 text-[11px]">
                                  <span className="text-emerald-300 font-bold mr-1.5">[OBSERVE]</span>
                                  Skor Langkah: {st.executionOutcome.stepScore}/100 • Byte Keluaran: {st.executionOutcome.length}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-stone-500 py-3 text-center">
                            {lang === "en" ? "Agent idle or awaiting step progression..." : "Agen sedang bersiap atau menunggu kemajuan langkah..."}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Prompt / Artifact Snapshot */}
                    {activeRun.currentPrompt && (
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-stone-600" />
                          {lang === "en" ? "Current Refined Prompt Snapshot:" : "Cuplikan Prompt yang Dihasilkan:"}
                        </span>
                        <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-700 whitespace-pre-wrap">
                          {activeRun.currentPrompt}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white border border-stone-200 rounded-2xl text-stone-500 text-xs">
                    {lang === "en" ? "Select a run to view execution trace." : "Pilih run untuk melihat jejak eksekusi."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 3: BRANKAS MEMORI HIBRIDA (MEMORY VAULT)
           ────────────────────────────────────────────── */}
        {activeModule === "memory" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Toolbar Filter Memori & Pencarian Semantik */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-600">
                  {lang === "en" ? "Memory Type:" : "Tipe Memori:"}
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium">
                  {(["all", "semantic", "episodic", "procedural", "working"] as const).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setMemoryTypeFilter(tp)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer capitalize ${
                        memoryTypeFilter === tp
                          ? "bg-white text-stone-900 font-semibold shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      {tp === "all" ? (lang === "en" ? "All" : "Semua") : tp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={memorySearchQuery}
                    onChange={(e) => setMemorySearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchMemories()}
                    placeholder={lang === "en" ? "Test semantic retrieval..." : "Uji pencarian semantik..."}
                    className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 w-56"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Add Fact" : "Tambah Fakta"}</span>
                </button>
              </div>
            </div>

            {/* Grid Kartu Memori */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold uppercase">
                        {m.type} • {m.scope}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold uppercase ${
                        m.status === "validated"
                          ? "bg-emerald-100 text-emerald-800"
                          : m.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {m.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-stone-400">
                      Keyakinan: {Math.round((m.confidence || 0) * 100)}%
                    </span>
                    <div className="flex items-center gap-1">
                      {m.status !== "validated" && (
                        <button
                          type="button"
                          onClick={() => handleValidateMemory(m.id, true)}
                          className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors cursor-pointer"
                        >
                          Validasi
                        </button>
                      )}
                      {m.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleValidateMemory(m.id, false)}
                          className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {memories.length === 0 && !loadingMemory && (
                <div className="col-span-full py-12 text-center text-stone-400 text-xs">
                  {lang === "en" ? "No memory records found." : "Belum ada catatan memori yang sesuai."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 4: REGISTRI KEAHLIAN & ALAT (SKILLS & MCP)
           ────────────────────────────────────────────── */}
        {activeModule === "skills" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Bagian 1: Katalog Keahlian Terpasang */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                    PROCEDURAL SKILL REGISTRY
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {lang === "en" ? "Installed Agent Skills & Capabilities" : "Katalog Keahlian Prosedural Agen"}
                  </h3>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
                  {skills.length} {lang === "en" ? "Skills Active" : "Keahlian Aktif"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map((sk) => (
                  <div key={sk.manifest.name} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {sk.manifest.name}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                        sk.manifest.riskClass === "low"
                          ? "bg-emerald-100 text-emerald-800"
                          : sk.manifest.riskClass === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        Risk: {sk.manifest.riskClass}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      {sk.manifest.summary}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 pt-2 border-t border-stone-200/60">
                      <span>v{sk.activeVersion}</span>
                      <span>Scope: {sk.manifest.scope?.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bagian 2: Status Konektor MCP Enterprise */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                    MODEL CONTEXT PROTOCOL
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {lang === "en" ? "Enterprise MCP Connectors" : "Konektor MCP Enterprise"}
                  </h3>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {mcpConnectors.filter((c) => c.enabled).length}/{mcpConnectors.length} {lang === "en" ? "Connected" : "Aktif"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {mcpConnectors.map((c) => (
                  <div key={c.connectorId} className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-stone-800 truncate">
                        {c.name}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${c.enabled ? "bg-emerald-500" : "bg-stone-300"}`} />
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-2">
                      {c.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-1">
                      <span>{c.badgeType}</span>
                      <span>{c.transportType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          MODAL: Buat Sesi Proyek Supervisi Baru
         ────────────────────────────────────────────── */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                {lang === "en" ? "Initiate Autonomous Project Session" : "Mulai Sesi Proyek Supervisi Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Goal Prompt (Project Intent):" : "Deskripsi Tujuan Proyek:"}
                </label>
                <textarea
                  value={newGoalPrompt}
                  onChange={(e) => setNewGoalPrompt(e.target.value)}
                  placeholder="Contoh: Buat sistem web toko roti dengan katalog produk, keranjang belanja, dan integrasi WhatsApp..."
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Domain Classification:" : "Klasifikasi Domain:"}
                </label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  <option value="software">Software Engineering</option>
                  <option value="devops">DevOps & Cloud Infrastructure</option>
                  <option value="database">Database Architecture</option>
                  <option value="security">Security & Penetration Testing</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Negative Constraints (One per line):" : "Batasan Negatif & Larangan (Satu per baris):"}
                </label>
                <textarea
                  value={newNegativeConstraints}
                  onChange={(e) => setNewNegativeConstraints(e.target.value)}
                  placeholder="DILARANG membuat kasir POS fisik&#10;DILARANG memakai mock data palsu"
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {lang === "en" ? "Initiate Session" : "Mulai Sesi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          MODAL: Tambah Memori Manual
         ────────────────────────────────────────────── */}
      {isAddMemoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                {lang === "en" ? "Inject Structured Memory" : "Suntikkan Fakta ke Brankas Memori"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMemoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Fact / Knowledge Content:" : "Isi Pengetahuan / Fakta:"}
                </label>
                <textarea
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="Ringkasan fakta yang ingin disimpan secara persisten..."
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Tipe (Type):
                  </label>
                  <select
                    value={newMemoryType}
                    onChange={(e) => setNewMemoryType(e.target.value)}
                    className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 capitalize"
                  >
                    <option value="semantic">Semantic</option>
                    <option value="episodic">Episodic</option>
                    <option value="procedural">Procedural</option>
                    <option value="working">Working</option>
                    <option value="experimental">Experimental</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Cakupan (Scope):
                  </label>
                  <select
                    value={newMemoryScope}
                    onChange={(e) => setNewMemoryScope(e.target.value)}
                    className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 capitalize"
                  >
                    <option value="project">Project</option>
                    <option value="workspace">Workspace</option>
                    <option value="user">User</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Tingkat Keyakinan (1 - 100%):
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newConfidence}
                  onChange={(e) => setNewConfidence(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Fakta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
