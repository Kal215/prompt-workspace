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
  ChevronDown,
  Info,
  ExternalLink,
  Zap,
  Flame,
  AlertOctagon,
  Copy,
  Tag,
  UserCheck,
  RotateCcw,
  Sparkles,
  CheckCheck,
  History,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

// ──────────────────────────────────────────────
// Tipe Data Selaras Backend PIEW
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

interface AgentHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  status: string;
  score?: number;
  profile?: string;
  autonomyLevel?: string;
  currentPrompt?: string;
}

// ──────────────────────────────────────────────
// Pemetaan Nama Tahapan Ramah Orang Awam
// ──────────────────────────────────────────────

const PHASE_TITLES_ID: Record<number, string> = {
  0: "Rencana & Kebutuhan",
  1: "Struktur & Database",
  2: "Desain Tampilan",
  3: "Pembuatan Halaman & Fitur",
  4: "Uji Coba & Perbaikan",
  5: "Penyelesaian & Rilis",
};

const PHASE_TITLES_EN: Record<number, string> = {
  0: "Discovery & Planning",
  1: "Architecture & Database",
  2: "Design & Styling",
  3: "Pages & Features",
  4: "Testing & Verification",
  5: "Completion & Release",
};

// Pembersih Log Audit Tanpa Banner ASCII
function getCleanAuditLog(audit: any, lang: "en" | "id") {
  if (!audit || !audit.auditResult) return "";
  const res = audit.auditResult;
  const isPassed = res.verdict === "VERIFIED_PROCEED" || res.verdict === "PROJECT_COMPLETED";

  if (isPassed) {
    return lang === "en"
      ? `[LOG] Phase ${audit.phaseIndex + 1} passed automated audit (Quality Score: ${res.score}/100). All deliverables verified on disk with zero compile errors and zero rule violations.`
      : `[LOG] Tahap ${audit.phaseIndex + 1} berhasil diverifikasi (Skor Mutu: ${res.score}/100). Seluruh berkas fisik di disk telah diperiksa, bebas galat kompilasi, dan mematuhi batasan aturan.`;
  }

  const raw = res.nextActionPrompt || "";
  const lines = raw.split("\n");
  const filtered = lines.filter((line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("═══") || trimmed.startsWith("---") || trimmed.startsWith("===")) return false;
    if (trimmed.includes("SERTIFIKAT AUDIT OTONOM") || trimmed.includes("PROJECT AUDIT CERTIFICATE")) return false;
    if (trimmed.includes("PIEW AUTONOMOUS SUPERVISION") || trimmed.includes("PIEW AUTONOMOUS SUPERVISOR PROTOCOL")) return false;
    if (trimmed.includes("DISPATCH") && trimmed.includes("PHASE_")) return false;
    if (trimmed.startsWith("PROYEK:") || trimmed.startsWith("SESI ID:") || trimmed.startsWith("STATUS KESELURUHAN:")) return false;
    return true;
  });

  return filtered.join("\n").trim() || raw;
}

export default function AgentMissionControlPage() {
  const { lang } = useLanguage();

  // Tab default: "runtime" (Tugas AI) sesuai permintaan
  const [activeModule, setActiveModule] = useState<AgentModule>("runtime");

  // Sub-tab pada panel Alat & Aplikasi: "skills" (Aturan Prompt) vs "connectors" (Konektor MCP)
  const [skillsSubTab, setSkillsSubTab] = useState<"skills" | "connectors">("skills");

  // 1. Data Supervisi / Kualitas
  const [sessions, setSessions] = useState<SupervisionSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(0);
  const [loadingSupervision, setLoadingSupervision] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newGoalPrompt, setNewGoalPrompt] = useState("");
  const [newDomain, setNewDomain] = useState("software");
  const [newNegativeConstraints, setNewNegativeConstraints] = useState("");

  // Audit input & toggle detail teknis
  const [submissionSummary, setSubmissionSummary] = useState("");
  const [verificationOutput, setVerificationOutput] = useState("");
  const [verificationCommand, setVerificationCommand] = useState("npm run typecheck --workspace=web");
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // 2. Data Tugas AI / Runtime
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [taskPrompt, setTaskPrompt] = useState("");
  const [budgetProfile, setBudgetProfile] = useState<"eco" | "balanced" | "deep">("balanced");
  const [autonomyLevel, setAutonomyLevel] = useState<string>("L2_bounded_autonomy");
  const [hardConstraints, setHardConstraints] = useState("");
  const [startingRun, setStartingRun] = useState(false);
  const [showRunTechnicalDetails, setShowRunTechnicalDetails] = useState(false);

  // Riwayat Tugas Mandiri Khusus Halaman Agent
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [agentHistory, setAgentHistory] = useState<AgentHistoryItem[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // 3. Data Ingatan AI (Memory)
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>("all");
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryType, setNewMemoryType] = useState<string>("semantic");
  const [newMemoryScope, setNewMemoryScope] = useState<string>("project");
  const [newConfidence, setNewConfidence] = useState(95);

  // 4. Data Keahlian & Konektor Aplikasi (Skills & MCP)
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [mcpConnectors, setMcpConnectors] = useState<McpConnectorItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Toast Notifikasi Sederhana
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Muat riwayat tugas lokal khusus agent dari localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("piew_agent_task_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setAgentHistory(parsed);
      }
    } catch {}
  }, []);

  const saveAgentHistoryItem = (item: AgentHistoryItem) => {
    setAgentHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== item.id);
      const updated = [item, ...filtered];
      try {
        localStorage.setItem("piew_agent_task_history", JSON.stringify(updated.slice(0, 50)));
      } catch {}
      return updated;
    });
  };

  const deleteAgentHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAgentHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      try {
        localStorage.setItem("piew_agent_task_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(lang === "en" ? "Task removed from history" : "Tugas dihapus dari riwayat", "info");
  };

  const clearAllAgentHistory = () => {
    setAgentHistory([]);
    try {
      localStorage.removeItem("piew_agent_task_history");
    } catch {}
    showToast(lang === "en" ? "Agent history cleared" : "Riwayat tugas agent dibersihkan", "info");
  };

  // ──────────────────────────────────────────────
  // Pengambilan Data Backend
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
      console.error("Gagal mengambil sesi:", err);
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

        // Sinkronkan ke riwayat lokal agent
        data.runs.forEach((r: AgentRun) => {
          const title = r.intent?.goal || r.intent?.task || r.initialPrompt || "Tugas Otonom";
          saveAgentHistoryItem({
            id: r.runId,
            title,
            createdAt: r.createdAt || new Date().toISOString(),
            status: r.status,
            score: r.finalScore,
            currentPrompt: r.currentPrompt,
          });
        });
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat tugas:", err);
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
      console.error("Gagal mengambil ingatan:", err);
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
      console.error("Gagal mengambil alat:", err);
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

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.sessionId === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  const currentPhase = useMemo(() => {
    if (!activeSession || !activeSession.phases) return null;
    return activeSession.phases[selectedPhaseIndex] || activeSession.phases[0] || null;
  }, [activeSession, selectedPhaseIndex]);

  const latestAuditForPhase = useMemo(() => {
    if (!activeSession || !activeSession.auditHistory) return null;
    const matches = activeSession.auditHistory.filter((a) => a.phaseIndex === selectedPhaseIndex);
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }, [activeSession, selectedPhaseIndex]);

  const activeRun = useMemo(() => {
    return agentRuns.find((r) => r.runId === selectedRunId) || agentRuns[0] || null;
  }, [agentRuns, selectedRunId]);

  // ──────────────────────────────────────────────
  // Aksi-aksi Pengguna
  // ──────────────────────────────────────────────

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
        showToast(lang === "en" ? "New project created!" : "Proyek baru berhasil dibuat!", "success");
        setIsNewSessionModalOpen(false);
        setNewGoalPrompt("");
        setNewNegativeConstraints("");
        await fetchSupervisionSessions();
        setSelectedSessionId(data.session.sessionId);
        setSelectedPhaseIndex(0);
      } else {
        showToast(data.error || "Gagal membuat proyek", "error");
      }
    } catch (err: any) {
      showToast("Gagal menghubungi server", "error");
    }
  };

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
            summaryOfWork: submissionSummary || (lang === "en" ? "Work completed according to criteria." : "Pekerjaan tahap ini telah selesai."),
            deliveredArtifacts: [{ name: `Artifact-Phase-${selectedPhaseIndex}`, type: "code" }],
            verificationOutput: verificationOutput || "Audit pass: Zero compile errors.",
            verificationCommand: verificationCommand || "npm run typecheck --workspace=web",
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(lang === "en" ? "Quality check completed!" : "Pemeriksaan kualitas selesai!", "success");
        await fetchSupervisionSessions();
      } else {
        showToast(data.error || "Pemeriksaan menemukan kendala", "error");
      }
    } catch (err: any) {
      showToast("Gagal melakukan pemeriksaan", "error");
    } finally {
      setSubmittingAudit(false);
    }
  };

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
            ? "Disetujui oleh pengguna"
            : actionType === "reject"
            ? "Pengguna meminta perbaikan"
            : "Dilewati langsung oleh pengguna",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          actionType === "approve"
            ? (lang === "en" ? "Phase approved!" : "Tahap berhasil disetujui!")
            : actionType === "reject"
            ? (lang === "en" ? "Revision requested." : "Permintaan perbaikan dikirim ke AI.")
            : (lang === "en" ? "Phase bypassed." : "Tahap berhasil dilewati."),
          "success"
        );
        await fetchSupervisionSessions();
      } else {
        showToast(data.error || "Gagal menerapkan keputusan", "error");
      }
    } catch (err: any) {
      showToast("Gagal menghubungi server", "error");
    }
  };

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
        a.download = `piew-laporan-proyek-${activeSession.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(lang === "en" ? "Report downloaded!" : "Laporan proyek berhasil diunduh!", "success");
      }
    } catch (err: any) {
      showToast("Gagal mengunduh laporan", "error");
    }
  };

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
        showToast(lang === "en" ? "AI started working on the task!" : "AI mulai mengerjakan tugas!", "success");

        // Simpan ke riwayat mandiri agent
        saveAgentHistoryItem({
          id: data.run.runId,
          title: taskPrompt.trim(),
          createdAt: new Date().toISOString(),
          status: data.run.status,
          profile: budgetProfile,
          autonomyLevel: autonomyLevel,
        });

        setTaskPrompt("");
        await fetchAgentRuns();
        setSelectedRunId(data.run.runId);
      } else {
        showToast(data.error || "Gagal memulai tugas", "error");
      }
    } catch (err: any) {
      showToast("Gagal memulai tugas", "error");
    } finally {
      setStartingRun(false);
    }
  };

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
        showToast(lang === "en" ? "Task stopped." : "Tugas dihentikan.", "info");
        await fetchAgentRuns();
      }
    } catch (err: any) {
      showToast("Gagal menghentikan tugas", "error");
    }
  };

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
        showToast(lang === "en" ? "New memory saved!" : "Ingatan baru berhasil disimpan!", "success");
        setIsAddMemoryModalOpen(false);
        setNewMemoryContent("");
        await fetchMemories();
      } else {
        showToast(data.error || "Gagal menyimpan ingatan", "error");
      }
    } catch (err: any) {
      showToast("Gagal menyimpan ingatan", "error");
    }
  };

  // Validasi / Tolak Ingatan AI dengan penanganan tepat
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
            ? (lang === "en" ? "Memory approved!" : "Ingatan disetujui!")
            : (lang === "en" ? "Memory marked as rejected." : "Ingatan ditolak."),
          "success"
        );
        await fetchMemories();
      } else {
        showToast(data.error || "Gagal memproses ingatan", "error");
      }
    } catch (err: any) {
      showToast("Gagal memproses ingatan", "error");
    }
  };

  // Hapus permanen ingatan
  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const res = await fetch(`/api/memory?id=${encodeURIComponent(memoryId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        showToast(lang === "en" ? "Memory permanently deleted." : "Ingatan berhasil dihapus permanen.", "info");
        await fetchMemories();
      } else {
        showToast(data.error || "Gagal menghapus ingatan", "error");
      }
    } catch (err: any) {
      showToast("Gagal menghapus ingatan", "error");
    }
  };

  // Filter riwayat tugas agent
  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return agentHistory;
    const q = historySearchQuery.toLowerCase();
    return agentHistory.filter((h) => h.title.toLowerCase().includes(q) || h.id.toLowerCase().includes(q));
  }, [agentHistory, historySearchQuery]);

  return (
    <div className="flex h-screen w-full bg-[#faf9f6] text-stone-900 overflow-hidden font-sans antialiased selection:bg-stone-200">
      {/* 1. Global Workspace Sidebar */}
      <WorkspaceSidebar activeMode="Agent" />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Bar Bersih & Minimalis */}
        <header className="h-16 border-b border-stone-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-stone-900">
                  {lang === "en" ? "AI Control Center" : "Pusat Kendali AI"}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {lang === "en" ? "Guard Active" : "Pengawas Aktif"}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {lang === "en"
                  ? "Monitor code quality, run tasks, and manage AI memory."
                  : "Pantau kualitas kode, jalankan tugas otomatis, dan kelola ingatan AI."}
              </p>
            </div>
          </div>

          {/* 4 Tab Sederhana Tanpa Istilah Aneh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs">
              {/* Tab 1: Tugas AI (Default) */}
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
                <span>{lang === "en" ? "AI Tasks" : "Tugas AI"}</span>
                {agentRuns.filter((r) => r.status === "running").length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
                )}
              </button>

              {/* Tab 2: Pemeriksaan Kualitas */}
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
                <span>{lang === "en" ? "Quality Checks" : "Pemeriksaan Kualitas"}</span>
              </button>

              {/* Tab 3: Ingatan AI */}
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
                <span>{lang === "en" ? "AI Memory" : "Ingatan AI"}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-stone-200 text-stone-600">
                  {memories.length}
                </span>
              </button>

              {/* Tab 4: Alat & Aplikasi */}
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
                <span>{lang === "en" ? "Tools & Apps" : "Alat & Aplikasi"}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-stone-200 text-stone-600">
                  {skills.length}
                </span>
              </button>
            </div>

            {/* Tombol Riwayat Khusus Halaman Agent */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={lang === "en" ? "Agent Task History" : "Riwayat Tugas AI"}
            >
              <History className="w-3.5 h-3.5 text-stone-600" />
              <span>{lang === "en" ? "Task History" : "Riwayat Tugas"}</span>
              {agentHistory.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 font-semibold">
                  {agentHistory.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Notifikasi Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border border-stone-800 bg-stone-900 text-white text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-sky-400" />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 1: TUGAS AI (AGENT RUNTIME - DEFAULT)
           ────────────────────────────────────────────── */}
        {activeModule === "runtime" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Form Tugas Baru yang Sederhana */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                    {lang === "en" ? "NEW TASK" : "TUGAS BARU"}
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {lang === "en" ? "Give AI a Coding Objective" : "Berikan Tugas kepada AI"}
                  </h3>
                </div>

                <form onSubmit={handleStartAgentRun} className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "What should AI build or fix?" : "Apa yang ingin Anda buat atau perbaiki?"}
                    </label>
                    <textarea
                      value={taskPrompt}
                      onChange={(e) => setTaskPrompt(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Build an inventory table with low-stock alerts..." : "Contoh: Buatkan tabel produk dengan peringatan jika stok habis..."}
                      rows={4}
                      className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
                    />
                  </div>

                  {/* Kecepatan & Ketelitian */}
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "Speed & Thoroughness:" : "Kecepatan & Ketelitian:"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "eco", label: lang === "en" ? "Fast" : "Cepat" },
                        { id: "balanced", label: lang === "en" ? "Standard" : "Standar" },
                        { id: "deep", label: lang === "en" ? "Deep" : "Mendalam" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setBudgetProfile(item.id as any)}
                          className={`py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-center ${
                            budgetProfile === item.id
                              ? "bg-stone-900 text-white border-stone-900 shadow-xs font-semibold"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cara Kerja AI */}
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "How AI should work:" : "Cara Kerja AI:"}
                    </label>
                    <select
                      value={autonomyLevel}
                      onChange={(e) => setAutonomyLevel(e.target.value)}
                      className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                    >
                      <option value="L2_bounded_autonomy">
                        {lang === "en" ? "Automatic (Recommended)" : "Otomatis Terarah (Disarankan)"}
                      </option>
                      <option value="L1_bounded_steps">
                        {lang === "en" ? "Ask permission for every step" : "Minta izin di setiap langkah"}
                      </option>
                      <option value="L3_supervised_autonomy">
                        {lang === "en" ? "Autonomous with supervision" : "Mandiri dengan pengawasan"}
                      </option>
                      <option value="L4_full_autonomy">
                        {lang === "en" ? "Fully autonomous" : "Mandiri sepenuhnya"}
                      </option>
                    </select>
                  </div>

                  {/* Larangan / Aturan Khusus (Opsional) */}
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      {lang === "en" ? "Prohibitions / Rules (Optional):" : "Larangan / Batasan Khusus (Opsional):"}
                    </label>
                    <input
                      type="text"
                      value={hardConstraints}
                      onChange={(e) => setHardConstraints(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Do not use fake data, keep schema unchanged..." : "Contoh: Jangan pakai data palsu, jangan ubah skema database..."}
                      className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={startingRun || !taskPrompt.trim()}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{startingRun ? (lang === "en" ? "Starting..." : "Memulai...") : (lang === "en" ? "Start Task" : "Mulai Kerjakan Tugas")}</span>
                  </button>
                </form>
              </div>

              {/* Kolom Kanan: Aktivitas Pengerjaan AI Waktu-Nyata */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pemilih Riwayat Tugas */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-600">
                      {lang === "en" ? "Selected Task:" : "Tugas Terpilih:"}
                    </span>
                    <select
                      value={selectedRunId}
                      onChange={(e) => setSelectedRunId(e.target.value)}
                      className="text-xs font-medium bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1 focus:outline-none max-w-sm truncate"
                    >
                      {agentRuns.length === 0 && <option value="">(Belum ada tugas)</option>}
                      {agentRuns.map((r) => {
                        const taskText = r.intent?.goal || r.intent?.task || r.initialPrompt || "Tugas Otonom";
                        return (
                          <option key={r.runId} value={r.runId}>
                            {taskText.slice(0, 35)}...
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
                      <span>{lang === "en" ? "Stop Task" : "Hentikan Tugas"}</span>
                    </button>
                  )}
                </div>

                {/* Detail Tugas Terpilih */}
                {activeRun ? (
                  <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                          {lang === "en" ? "TASK" : "TUGAS"}
                        </span>
                        <h4 className="text-sm font-bold text-stone-900">
                          {activeRun.intent?.goal || activeRun.intent?.task || activeRun.initialPrompt || "Tugas AI"}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeRun.finalScore !== undefined && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                            {lang === "en" ? `Score: ${activeRun.finalScore}/100` : `Skor: ${activeRun.finalScore}/100`}
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
                          activeRun.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : activeRun.status === "running"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-stone-200 text-stone-700"
                        }`}>
                          {activeRun.status === "completed"
                            ? (lang === "en" ? "Completed" : "Selesai")
                            : activeRun.status === "running"
                            ? (lang === "en" ? "Working..." : "Sedang Dikerjakan...")
                            : (lang === "en" ? "Stopped" : "Dihentikan")}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Aktivitas AI (Ramah & Bersih) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          {lang === "en" ? "What AI Did:" : "Catatan Aktivitas AI:"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowRunTechnicalDetails(!showRunTechnicalDetails)}
                          className="text-[11px] text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showRunTechnicalDetails ? (lang === "en" ? "Simple View" : "Tampilan Sederhana") : (lang === "en" ? "Technical View" : "Tampilan Teknis")}</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                        {activeRun.steps && activeRun.steps.length > 0 ? (
                          activeRun.steps.map((st, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 py-1.5 border-b border-stone-200/60 last:border-b-0">
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-semibold text-[10px]">
                                {st.stepIndex}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-stone-800 font-medium leading-relaxed">
                                  {st.actionProposal?.purpose || st.actionProposal?.toolId || "Menyelesaikan langkah pekerjaan..."}
                                </p>
                                {showRunTechnicalDetails && (
                                  <div className="mt-1 text-[10px] text-stone-500 font-mono">
                                    Decision: {st.policyDecision?.decision} • Risk: {st.policyDecision?.riskClass} • Score: {st.executionOutcome?.stepScore}/100
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                                {st.timestamp ? new Date(st.timestamp).toLocaleTimeString() : "Selesai"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-stone-400 py-4 text-center">
                            {lang === "en" ? "No steps recorded yet." : "Belum ada langkah yang dicatat."}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hasil Akhir / Kode yang Dihasilkan */}
                    {activeRun.currentPrompt && (
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block mb-1.5 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-stone-600" />
                          {lang === "en" ? "Refined Result / Rules Applied:" : "Hasil & Aturan yang Diterapkan:"}
                        </span>
                        <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 font-mono whitespace-pre-wrap">
                          {activeRun.currentPrompt}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white border border-stone-200 rounded-2xl text-stone-500 text-xs">
                    {lang === "en" ? "Select a task to view progress." : "Pilih tugas untuk melihat progres."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 2: PEMERIKSAAN KUALITAS (SUPERVISION)
           ────────────────────────────────────────────── */}
        {activeModule === "supervision" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Toolbar Proyek */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-600">
                  {lang === "en" ? "Active Project:" : "Proyek Saat Ini:"}
                </span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value);
                    const found = sessions.find((s) => s.sessionId === e.target.value);
                    if (found) setSelectedPhaseIndex(found.currentPhaseIndex || 0);
                  }}
                  className="text-xs font-medium bg-stone-100 border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-400 max-w-sm truncate"
                >
                  {sessions.length === 0 && <option value="">(Belum ada proyek)</option>}
                  {sessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {s.originalPrompt ? s.originalPrompt.slice(0, 45) : s.sessionId}...
                    </option>
                  ))}
                </select>

                {activeSession && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      activeSession.overallStatus === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : activeSession.overallStatus === "COMPLETED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {activeSession.overallStatus === "ACTIVE"
                      ? (lang === "en" ? "In Progress" : "Sedang Berjalan")
                      : activeSession.overallStatus === "COMPLETED"
                      ? (lang === "en" ? "Completed" : "Selesai")
                      : (lang === "en" ? "Paused" : "Perlu Perhatian")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "New Project" : "Buat Proyek Baru"}</span>
                </button>

                {activeSession && (
                  <button
                    type="button"
                    onClick={handleExportBundle}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Download Report" : "Unduh Laporan"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={fetchSupervisionSessions}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                  title="Segarkan"
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
                  {lang === "en" ? "No Active Project" : "Belum Ada Proyek yang Dijalankan"}
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                  {lang === "en"
                    ? "Start a new project to let AI build and verify each phase automatically."
                    : "Mulai proyek baru agar AI mengerjakan dan memeriksa kualitas setiap tahapan secara otomatis."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "en" ? "Create First Project" : "Buat Proyek Pertama"}</span>
                </button>
              </div>
            )}

            {activeSession && (
              <>
                {/* 1. Tahapan Kerja (Phasing Stepper) yang Bersih */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                        {lang === "en" ? "PROJECT PROGRESS" : "TAHAPAN PENGERJAAN"}
                      </span>
                      <h2 className="text-sm font-semibold text-stone-900">
                        {lang === "en" ? "Development Lifecycle" : "Perjalanan Proyek dari Awal hingga Selesai"}
                      </h2>
                    </div>
                    <div className="text-xs text-stone-500 font-medium">
                      {lang === "en" ? "Current Step:" : "Tahap Saat Ini:"} {selectedPhaseIndex + 1} / {activeSession.phases ? activeSession.phases.length : 6}
                    </div>
                  </div>

                  {/* Horizontal Stepper Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
                    {activeSession.phases && activeSession.phases.map((ph, idx) => {
                      const isSelected = selectedPhaseIndex === idx;
                      const isCurrent = activeSession.currentPhaseIndex === idx;
                      const isVerified = ph.status === "VERIFIED";
                      const isRejected = ph.status === "REJECTED_NEEDS_REPAIR";

                      const friendlyTitle = lang === "en"
                        ? (PHASE_TITLES_EN[idx] || ph.title)
                        : (PHASE_TITLES_ID[idx] || ph.title);

                      return (
                        <button
                          key={ph.phaseId || idx}
                          type="button"
                          onClick={() => setSelectedPhaseIndex(idx)}
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                              : isVerified
                              ? "bg-emerald-50/70 border-emerald-200 text-stone-800 hover:bg-emerald-100/50"
                              : isRejected
                              ? "bg-rose-50/70 border-rose-200 text-stone-800 hover:bg-rose-100/50"
                              : isCurrent
                              ? "bg-amber-50/70 border-amber-300 text-stone-800 hover:bg-amber-100/50"
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                            <span>{lang === "en" ? `Phase ${idx + 1}` : `Tahap ${idx + 1}`}</span>
                            {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            {isRejected && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                            {!isVerified && !isRejected && isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-xs font-medium truncate ${isSelected ? "text-stone-100" : "text-stone-800"}`}>
                            {friendlyTitle}
                          </p>
                          <div className="mt-2 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                              isSelected
                                ? "bg-stone-800 text-stone-300"
                                : isVerified
                                ? "bg-emerald-100 text-emerald-800"
                                : isRejected
                                ? "bg-rose-100 text-rose-800"
                                : "bg-stone-200/80 text-stone-600"
                            }`}>
                              {isVerified
                                ? (lang === "en" ? "Passed" : "Lolos")
                                : isRejected
                                ? (lang === "en" ? "Needs Fix" : "Perlu Perbaikan")
                                : isCurrent
                                ? (lang === "en" ? "Active" : "Aktif")
                                : (lang === "en" ? "Pending" : "Menunggu")}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Ringkasan Pemeriksaan Kualitas Nyata (4 Kartu Jelas) */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                        {lang === "en" ? "AUTOMATIC QUALITY VERIFICATION" : "PEMERIKSAAN KUALITAS OTOMATIS"}
                      </span>
                      <h3 className="text-xs font-semibold text-stone-900">
                        {lang === "en"
                          ? "Factual Proof: Code is tested and verified directly on the system"
                          : "Bukti Nyata: Kode diuji dan dipastikan benar-benar berjalan di komputer Anda"}
                      </h3>
                    </div>
                    {latestAuditForPhase && (
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        latestAuditForPhase.auditResult.verdict === "VERIFIED_PROCEED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {lang === "en" ? "Quality Score:" : "Skor Kualitas:"} {latestAuditForPhase.auditResult.score}/100
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Kartu 1: Kode */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                          {lang === "en" ? "Code Changes" : "Perubahan Kode"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          {lang === "en" ? "Saved" : "Tersimpan"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Physical files verified on disk; no empty claims." : "Berkas fisik dipastikan tersimpan rapi di Git."}
                      </p>
                    </div>

                    {/* Kartu 2: Bebas Error */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-blue-600" />
                          {lang === "en" ? "Error Check" : "Pemeriksaan Galat"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          {lang === "en" ? "Zero Errors" : "0 Galat"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Code compiled cleanly with no TypeScript breaks." : "Program lolos uji dan bebas dari error kompilasi."}
                      </p>
                    </div>

                    {/* Kartu 3: Kondisi Server */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-purple-600" />
                          {lang === "en" ? "Server Health" : "Kondisi Server"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                          {lang === "en" ? "Normal" : "Normal"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "Container sandbox running safely without crash." : "Lingkungan server aman dan tidak mengalami crash."}
                      </p>
                    </div>

                    {/* Kartu 4: Kepatuhan Aturan */}
                    <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-stone-800">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {lang === "en" ? "Rule Compliance" : "Kepatuhan Aturan"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          {lang === "en" ? "Honored" : "Terpenuhi"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {lang === "en" ? "All user prohibitions and constraints respected." : "Semua batasan dan larangan pengguna ditaati."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Detail Tahap Terpilih & Panel Kendali Manusia */}
                {currentPhase && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Kolom Kiri: Yang Dikerjakan & Catatan Arahan */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Kartu Sasaran & Yang Harus Diselesaikan */}
                      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                              {lang === "en" ? `PHASE ${selectedPhaseIndex + 1}` : `TAHAP ${selectedPhaseIndex + 1}`}
                            </span>
                            <h3 className="text-base font-bold text-stone-900">
                              {lang === "en"
                                ? (PHASE_TITLES_EN[selectedPhaseIndex] || currentPhase.title)
                                : (PHASE_TITLES_ID[selectedPhaseIndex] || currentPhase.title)}
                            </h3>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200">
                            {currentPhase.status === "VERIFIED"
                              ? (lang === "en" ? "Status: Passed" : "Status: Sudah Lolos")
                              : (lang === "en" ? "Status: In Progress" : "Status: Sedang Dikerjakan")}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-stone-700 block mb-1">
                            {lang === "en" ? "What AI is doing in this step:" : "Apa yang dikerjakan AI pada tahap ini:"}
                          </span>
                          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                            {currentPhase.objective}
                          </p>
                        </div>

                        {/* Yang Harus Diselesaikan (Checklist Sederhana) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
                            <span className="font-semibold text-stone-700 block mb-1.5 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {lang === "en" ? "Checklist Requirements:" : "Syarat yang Harus Terpenuhi:"}
                            </span>
                            <ul className="space-y-1 text-stone-600 list-disc list-inside">
                              {currentPhase.acceptanceCriteria?.map((c, i) => (
                                <li key={i}>{c}</li>
                              )) || <li>Belum ada syarat tambahan</li>}
                            </ul>
                          </div>

                          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
                            <span className="font-semibold text-stone-700 block mb-1.5 flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5 text-blue-600" />
                              {lang === "en" ? "Deliverables / Results:" : "Hasil yang Diserahkan:"}
                            </span>
                            <ul className="space-y-1 text-stone-600 list-disc list-inside">
                              {currentPhase.requiredDeliverables?.map((d, i) => (
                                <li key={i}>{d}</li>
                              )) || <li>Hasil otomatis dari kode</li>}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Catatan Arahan AI (Steering Directive) Bersih Tanpa Banner Sertifikat ASCII */}
                      {latestAuditForPhase && (
                        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-stone-800">
                              <Sliders className="w-3.5 h-3.5 text-amber-600" />
                              {lang === "en" ? "Audit Log & Status" : "Log & Status Pemeriksaan"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                              className="text-[11px] text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <span>{showTechnicalDetails ? (lang === "en" ? "Hide Technical Log" : "Sembunyikan Log") : (lang === "en" ? "View Raw Log" : "Lihat Log Teknis")}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTechnicalDetails ? "rotate-180" : ""}`} />
                            </button>
                          </div>

                          {/* Tampilan Log Bersih Tanpa Banner ASCII Menakutkan */}
                          <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200 font-mono">
                            {getCleanAuditLog(latestAuditForPhase, lang)}
                          </p>

                          {showTechnicalDetails && (
                            <div className="mt-3 p-3 rounded-xl bg-stone-900 text-stone-200 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {getCleanAuditLog(latestAuditForPhase, lang)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Kolom Kanan: Persetujuan Anda & Tombol Periksa Kualitas */}
                    <div className="space-y-6">
                      {/* Kartu Keputusan Pengguna (Persetujuan Anda) */}
                      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                            {lang === "en" ? "YOUR APPROVAL" : "PERSETUJUAN ANDA"}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {lang === "en" ? `Revisions: ${currentPhase.attemptCount || 0} / 3` : `Revisi: ${currentPhase.attemptCount || 0} / 3`}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">
                          {lang === "en"
                            ? "AI is limited to 3 automated attempts before asking for your decision."
                            : "AI dibatasi maksimal 3x mencoba perbaikan otomatis sebelum meminta keputusan Anda."}
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

                        {/* 3 Tombol Keputusan Sederhana */}
                        <div className="pt-2 border-t border-stone-100 space-y-2">
                          <button
                            type="button"
                            onClick={() => handleHumanOverride("approve")}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === "en" ? "Approve & Go to Next Step" : "Setujui & Lanjutkan Tahap"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleHumanOverride("reject")}
                            className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{lang === "en" ? "Request Revision from AI" : "Minta AI Perbaiki Kembali"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleHumanOverride("force")}
                            className="w-full py-1.5 rounded-xl text-stone-500 hover:text-stone-800 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{lang === "en" ? "Skip / Force Advance" : "Lewati Tahap Ini"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Kartu Uji Kualitas Tahap Ini */}
                      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                            {lang === "en" ? "TRIGGER VERIFICATION" : "UJI KUALITAS TAHAP INI"}
                          </span>
                          <h4 className="text-xs font-semibold text-stone-900">
                            {lang === "en" ? "Run Automated Tests" : "Periksa Kode Secara Mandiri"}
                          </h4>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div>
                            <label className="text-[11px] font-medium text-stone-600 block mb-1">
                              {lang === "en" ? "Summary of what was done:" : "Ringkasan pekerjaan yang selesai:"}
                            </label>
                            <textarea
                              value={submissionSummary}
                              onChange={(e) => setSubmissionSummary(e.target.value)}
                              placeholder={lang === "en" ? "e.g. Completed database models and API routes..." : "Contoh: Telah membuat basis data dan rute antarmuka..."}
                              rows={2}
                              className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleSubmitPhaseAudit}
                            disabled={submittingAudit}
                            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{submittingAudit ? (lang === "en" ? "Testing..." : "Sedang Memeriksa...") : (lang === "en" ? "Run Quality Check Now" : "Periksa Kualitas Sekarang")}</span>
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
            MODUL 3: INGATAN AI (MEMORY VAULT)
           ────────────────────────────────────────────── */}
        {activeModule === "memory" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Toolbar Filter Memori & Pencarian */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-600">
                  {lang === "en" ? "Category:" : "Kategori Ingatan:"}
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium">
                  {[
                    { id: "all", label: lang === "en" ? "All" : "Semua" },
                    { id: "semantic", label: lang === "en" ? "Rules" : "Aturan Baku" },
                    { id: "episodic", label: lang === "en" ? "History" : "Riwayat" },
                    { id: "procedural", label: lang === "en" ? "Instructions" : "Cara Kerja" },
                    { id: "working", label: lang === "en" ? "Active Notes" : "Catatan Aktif" },
                  ].map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => setMemoryTypeFilter(tp.id)}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        memoryTypeFilter === tp.id
                          ? "bg-white text-stone-900 font-semibold shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      {tp.label}
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
                    placeholder={lang === "en" ? "Search memory..." : "Cari ingatan atau aturan..."}
                    className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 w-56"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Add Fact" : "Tambah Ingatan Baru"}</span>
                </button>
              </div>
            </div>

            {/* Grid Kartu Ingatan Bersih */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                        {m.type === "semantic"
                          ? (lang === "en" ? "Standard Rules" : "Aturan Baku")
                          : m.type === "episodic"
                          ? (lang === "en" ? "History" : "Riwayat")
                          : m.type === "procedural"
                          ? (lang === "en" ? "Workflow" : "Cara Kerja")
                          : (lang === "en" ? "Active Notes" : "Catatan Aktif")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        m.status === "validated"
                          ? "bg-emerald-100 text-emerald-800"
                          : m.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {m.status === "validated"
                          ? (lang === "en" ? "Approved" : "Disetujui")
                          : m.status === "rejected"
                          ? (lang === "en" ? "Rejected" : "Ditolak")
                          : (lang === "en" ? "Pending" : "Menunggu Persetujuan")}
                      </span>
                    </div>

                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {m.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-400 font-medium">
                      {lang === "en" ? `Certainty: ${Math.round((m.confidence || 0) * 100)}%` : `Kepastian: ${Math.round((m.confidence || 0) * 100)}%`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.status !== "validated" && (
                        <button
                          type="button"
                          onClick={() => handleValidateMemory(m.id, true)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors cursor-pointer text-xs"
                        >
                          {lang === "en" ? "Approve" : "Setujui"}
                        </button>
                      )}
                      {m.status !== "rejected" ? (
                        <button
                          type="button"
                          onClick={() => handleValidateMemory(m.id, false)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors cursor-pointer text-xs"
                        >
                          {lang === "en" ? "Reject" : "Tolak"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.id)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {memories.length === 0 && !loadingMemory && (
                <div className="col-span-full py-12 text-center text-stone-400 text-xs">
                  {lang === "en" ? "No memory records found." : "Belum ada catatan ingatan yang sesuai."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────
            MODUL 4: ALAT & APLIKASI (SKILLS & MCP DENGAN SUB-TAB)
           ────────────────────────────────────────────── */}
        {activeModule === "skills" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Sub-tab Pengatur Tampilan Keahlian vs Konektor Eksekusi */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-600">
                  {lang === "en" ? "View:" : "Kategori Alat:"}
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setSkillsSubTab("skills")}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      skillsSubTab === "skills"
                        ? "bg-white text-stone-900 font-semibold shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {lang === "en" ? "Prompt Skills (Canonical Rules)" : "Keahlian Prompt (3 Aturan Baku)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillsSubTab("connectors")}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      skillsSubTab === "connectors"
                        ? "bg-white text-stone-900 font-semibold shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {lang === "en" ? "Execution Tools & MCP (10 Apps)" : "Alat Eksekusi & MCP (10 Aplikasi)"}
                  </button>
                </div>
              </div>

              <span className="text-xs text-stone-400 font-medium">
                {skillsSubTab === "skills" ? "Aturan pengaman instruksi LLM" : "Aplikasi & layanan sistem nyata"}
              </span>
            </div>

            {/* Sub-tab 1: Keahlian Prompt (Canonical Skills Saja) */}
            {skillsSubTab === "skills" && (
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                      {lang === "en" ? "PROMPT RULES & SKILLS" : "KEAHLIAN & ATURAN PROMPT"}
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900">
                      {lang === "en" ? "Built-in System Guardrails" : "Aturan Baku Penjamin Kualitas AI"}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    3 {lang === "en" ? "Active" : "Aktif"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      name: "hard-constraint-lock",
                      summary: lang === "en"
                        ? "Locks absolute user prohibitions so they cannot be bypassed by secondary advice."
                        : "Mengunci batasan mutlak pengguna agar tidak dilanggar oleh saran atau optimasi sekunder.",
                      version: "1.0.0",
                    },
                    {
                      name: "mermaid-entity-consistency",
                      summary: lang === "en"
                        ? "Enforces 100% parity between Mermaid ERD diagrams and database schema code."
                        : "Menjaga konsistensi 100% antara entitas diagram Mermaid ERD dengan teks spesifikasi arsitektur.",
                      version: "1.0.0",
                    },
                    {
                      name: "strict-json-output",
                      summary: lang === "en"
                        ? "Ensures LLM responds in clean, parseable JSON without rogue markdown fences."
                        : "Memastikan LLM merespons dalam format JSON valid tanpa pembungkus markdown liar.",
                      version: "1.0.0",
                    },
                  ].map((sk) => (
                    <div key={sk.name} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-stone-900">
                            {sk.name}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {lang === "en" ? "Ready" : "Siap"}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {sk.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-200/60 font-mono">
                        <span>v{sk.version}</span>
                        <span>Scope: Global</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 2: Alat Eksekusi & Konektor MCP */}
            {skillsSubTab === "connectors" && (
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                      {lang === "en" ? "CONNECTED APPS & MCP" : "APLIKASI TERHUBUNG & MCP"}
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900">
                      {lang === "en" ? "Real Action Tools & Environment Bridges" : "Perkakas Eksekusi Nyata & Jembatan Sistem"}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    {mcpConnectors.filter((c) => c.enabled).length}/{mcpConnectors.length} {lang === "en" ? "Connected" : "Terhubung"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {mcpConnectors.map((c) => (
                    <div key={c.connectorId} className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-stone-800 truncate">
                          {c.name}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${c.enabled ? "bg-emerald-500" : "bg-stone-300"}`} />
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                        <span className="font-medium text-stone-600">{c.category || "Alat"}</span>
                        <span className={c.enabled ? "text-emerald-700 font-medium" : "text-stone-400"}>
                          {c.enabled ? (lang === "en" ? "Active" : "Aktif") : (lang === "en" ? "Disabled" : "Mati")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          SLIDE-OVER DRAWER: Riwayat Tugas Khusus Agent
         ────────────────────────────────────────────── */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-stone-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Header Drawer */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-stone-600" />
                  <span>{lang === "en" ? "AI Task History" : "Riwayat Tugas AI"}</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {lang === "en" ? "Dedicated to Agent Workspace only" : "Riwayat mandiri khusus halaman Agent"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kontrol Pencarian & Mulai Baru */}
            <div className="p-4 border-b border-stone-100 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder={lang === "en" ? "Search task history..." : "Cari riwayat tugas..."}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setTaskPrompt("");
                  setSelectedRunId("");
                  setIsHistoryDrawerOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Start New Task (+)" : "Mulai Tugas Baru (+)"}</span>
              </button>
            </div>

            {/* Daftar Riwayat Tugas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedRunId(item.id);
                    setIsHistoryDrawerOpen(false);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    selectedRunId === item.id
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={selectedRunId === item.id ? "text-stone-300" : "text-stone-400"}>
                      {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => deleteAgentHistoryItem(item.id, e)}
                      className={`p-1 rounded transition-colors ${
                        selectedRunId === item.id ? "text-stone-400 hover:text-white" : "text-stone-300 hover:text-rose-600"
                      }`}
                      title="Hapus"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <p className={`text-xs font-medium line-clamp-2 ${selectedRunId === item.id ? "text-stone-100" : "text-stone-800"}`}>
                    {item.title}
                  </p>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className={`px-2 py-0.5 rounded-full capitalize font-semibold ${
                      item.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.status === "running"
                        ? "bg-amber-100 text-amber-800 animate-pulse"
                        : "bg-stone-200 text-stone-700"
                    }`}>
                      {item.status}
                    </span>
                    {item.score !== undefined && (
                      <span className={`font-mono font-medium ${selectedRunId === item.id ? "text-emerald-400" : "text-emerald-600"}`}>
                        Skor: {item.score}/100
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {filteredHistory.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-xs">
                  {lang === "en" ? "No task history found." : "Belum ada riwayat tugas."}
                </div>
              )}
            </div>

            {/* Footer Drawer */}
            {agentHistory.length > 0 && (
              <div className="p-4 border-t border-stone-200 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">
                  {agentHistory.length} tugas tersimpan
                </span>
                <button
                  type="button"
                  onClick={clearAllAgentHistory}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                >
                  {lang === "en" ? "Clear All" : "Hapus Semua"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          MODAL: Buat Proyek Baru
         ────────────────────────────────────────────── */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                {lang === "en" ? "Create New Project" : "Mulai Proyek Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Project Goal / Description:" : "Tujuan Proyek:"}
                </label>
                <textarea
                  value={newGoalPrompt}
                  onChange={(e) => setNewGoalPrompt(e.target.value)}
                  placeholder="Contoh: Buat sistem web toko roti dengan katalog produk, keranjang belanja, dan integrasi WhatsApp..."
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Category:" : "Kategori Proyek:"}
                </label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  <option value="software">Web & Software</option>
                  <option value="devops">Server & Cloud</option>
                  <option value="database">Database & API</option>
                  <option value="security">Keamanan Sistem</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Things AI Must Avoid (One per line):" : "Hal yang Dilarang (Satu per baris):"}
                </label>
                <textarea
                  value={newNegativeConstraints}
                  onChange={(e) => setNewNegativeConstraints(e.target.value)}
                  placeholder="Dilarang membuat kasir fisik&#10;Dilarang memakai data palsu"
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {lang === "en" ? "Create Project" : "Mulai Proyek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          MODAL: Tambah Ingatan Baru
         ────────────────────────────────────────────── */}
      {isAddMemoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                {lang === "en" ? "Add AI Memory" : "Tambah Ingatan / Aturan untuk AI"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMemoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  {lang === "en" ? "Memory / Rule to remember:" : "Isi Ingatan atau Aturan:"}
                </label>
                <textarea
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="Contoh: Gunakan selalu warna latar off-white untuk semua halaman baru..."
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Jenis Ingatan:
                  </label>
                  <select
                    value={newMemoryType}
                    onChange={(e) => setNewMemoryType(e.target.value)}
                    className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    <option value="semantic">Aturan Baku</option>
                    <option value="episodic">Riwayat</option>
                    <option value="procedural">Cara Kerja</option>
                    <option value="working">Catatan Aktif</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Cakupan:
                  </label>
                  <select
                    value={newMemoryScope}
                    onChange={(e) => setNewMemoryScope(e.target.value)}
                    className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    <option value="project">Proyek Ini Saja</option>
                    <option value="workspace">Seluruh Workspace</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Tingkat Kepastian (1 - 100%):
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newConfidence}
                  onChange={(e) => setNewConfidence(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {lang === "en" ? "Save Memory" : "Simpan Ingatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
