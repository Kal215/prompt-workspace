"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { MermaidViewer } from "@/components/ui/mermaid-viewer";
import { CrawlerDialog } from "@/components/workspace/crawler-dialog";
import { HistorySheet } from "@/components/workspace/history-sheet";
import { SpiderMatrixCard } from "@/components/workspace/spider-matrix-card";
import {
  Sparkles,
  Copy,
  Check,
  Save,
  Globe,
  History,
  ArrowRight,
  Code2,
  GitCompare,
  FileCode,
  ShieldAlert,
  Loader2,
  Trash2,
  Layers,
  CheckCircle2,
  Cpu,
  Download,
  Plus,
  X,
  SlidersHorizontal,
  ShieldCheck,
  CheckSquare,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface DiagramItem {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  entities?: string[];
  mermaidCode?: string;
  diagram?: string;
}

interface ExecutionPhaseItem {
  phaseNumber: number;
  name: string;
  tasks: string[];
  deliverables: string[];
}

interface AnalysisFinding {
  category?: string;
  severity?: "minor" | "moderate" | "major" | "critical" | string;
  evidence?: string;
  recommendation?: string;
  type?: string;
  message?: string;
}

interface SynthesisResponse {
  success: boolean;
  requestId?: string;
  optimizedPrompt?: string;
  originalPrompt?: string;
  detectedIntent?: string;
  changes?: string[];
  warnings?: string[];
  providerId?: string;
  model?: string;
  synthesisMode?: string;
  appliedDomainRule?: {
    domainId?: string;
    ruleVersion?: string;
    name?: string;
  };
  analysis?: {
    score?: number;
    status?: string;
    findings?: AnalysisFinding[];
    taskSpec?: Record<string, any>;
    intentPreservationScore?: number;
  };
  synthesisValidation?: {
    passed?: boolean;
    overallSynthesisScore?: number;
    checks?: {
      intentPreserved?: boolean;
      explicitRequirementsCovered?: boolean;
      negativeConstraintsEnforced?: boolean;
      notShallowRewrite?: boolean;
      notPlaceholderDumping?: boolean;
      hasOperationalStages?: boolean;
      hasVerificationAndDoD?: boolean;
      noDeceptiveTechFabrication?: boolean;
    };
    missingRequirements?: string[];
    violatedNegativeConstraints?: string[];
    failureReasons?: string[];
    repairPassesTriggered?: number;
  };
  universalBlueprint?: {
    title?: string;
    domain?: string;
    audienceLevel?: string;
    summary?: string;
    roles?: string[];
    contextParameters?: Record<string, string>;
    smartAssumptions?: string[];
    primaryObjectives?: string[];
    coreSpecification?: string;
    diagrams?: DiagramItem[];
    executionPhases?: ExecutionPhaseItem[];
    negativeConstraints?: string[];
    executionProtocol?: string[];
    definitionOfDone?: string[];
    renderedMasterPrompt?: string;
  };
  mermaidDiagrams?: DiagramItem[];
  appliedMcpConnectors?: Array<{
    connectorId: string;
    source: string;
    factsCount: number;
  }>;
  metadata?: {
    providerId?: string;
    model?: string;
    latencyMs?: number;
    processingTimeMs?: number;
    tokensUsed?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

const TEMPLATES = [
  {
    titleEn: "Online Store & Shopping Cart",
    titleId: "Toko Online & Keranjang Belanja",
    promptEn:
      "Build a clean online store system with product catalog, shopping cart, automatic shipping fee calculation, and customer order history.",
    promptId:
      "Buat sistem toko online dengan katalog produk, keranjang belanja, perhitungan ongkos kirim otomatis, dan riwayat pesanan pembeli.",
  },
  {
    titleEn: "Appointment Booking System",
    titleId: "Sistem Reservasi & Janji Temu",
    promptEn:
      "Design a customer appointment booking system with available date/time slots, daily quota limits, and automatic confirmation alerts.",
    promptId:
      "Rancang sistem reservasi janji temu pelanggan dengan pilihan jadwal tanggal dan jam, batas kuota harian, serta notifikasi konfirmasi.",
  },
  {
    titleEn: "Cash Flow & Daily Bookkeeping",
    titleId: "Catatan Kas & Pembukuan Harian",
    promptEn:
      "Build a daily bookkeeping system to record sales income, operational expenses, profit and loss calculations, and monthly financial summaries.",
    promptId:
      "Buat sistem pencatatan keuangan harian untuk merekap pemasukan penjualan, pengeluaran operasional, laba rugi, dan ringkasan bulanan.",
  },
];

const DOMAIN_PRESETS: Record<
  string,
  {
    labelEn: string;
    labelId: string;
    placeholderEn: string;
    placeholderId: string;
  }
> = {
  coding: {
    labelEn: "Coding",
    labelId: "Pemrograman",
    placeholderEn:
      "Describe your software requirements, architectural constraints, target tech stack, or rules to enforce...",
    placeholderId:
      "Jelaskan kebutuhan perangkat lunak, batasan arsitektur, teknologi yang digunakan, atau aturan yang wajib dipatuhi...",
  },
  general: {
    labelEn: "General",
    labelId: "Umum",
    placeholderEn:
      "Describe the task or goal you want to achieve, context, tone of voice, and expected output format...",
    placeholderId:
      "Jelaskan tugas atau tujuan yang ingin Anda capai, konteks, gaya bahasa, dan format luaran yang diinginkan...",
  },
  debugging: {
    labelEn: "Debugging",
    labelId: "Perbaikan Bug",
    placeholderEn:
      "Paste the error message, problematic code snippet, what you expected vs what actually happened...",
    placeholderId:
      "Tuliskan pesan error, cuplikan kode yang bermasalah, hasil yang diharapkan vs yang terjadi saat ini...",
  },
  business: {
    labelEn: "Business",
    labelId: "Bisnis",
    placeholderEn:
      "Describe your business problem, target audience, strategic goals, operational flow, or proposal needs...",
    placeholderId:
      "Jelaskan kebutuhan bisnis, target audiens, tujuan strategis, alur operasional, atau dokumen yang ingin disusun...",
  },
  academic: {
    labelEn: "Academic",
    labelId: "Akademik",
    placeholderEn:
      "Describe your research topic, theoretical framework, study methodology, or essay structure...",
    placeholderId:
      "Jelaskan topik penelitian, kerangka teori, metodologi pembahasan, atau struktur karya tulis ilmiah...",
  },
};

export interface InstalledModelOption {
  id: string;
  providerId: string;
  name: string;
  model: string;
  label: string;
}

export default function ClassicWorkspacePage() {
  const { lang, setLang } = useLanguage();

  // Synthesis Workspace Inputs
  const [prompt, setPrompt] = useState("");
  const [domain, setDomain] = useState("coding");
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [installedModels, setInstalledModels] = useState<InstalledModelOption[]>([]);

  // Load dynamically installed providers and models from /api/providers
  const loadInstalledProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const modelsList: InstalledModelOption[] = [];

      // 1. Providers from catalog that have keys configured
      if (Array.isArray(data.catalogProviders)) {
        data.catalogProviders.forEach((p: any) => {
          if (p.configured) {
            const m = p.defaultModel || "default";
            modelsList.push({
              id: `${p.providerId}:${m}`,
              providerId: p.providerId,
              name: p.displayName || p.providerId,
              model: m,
              label: `${p.displayName || p.providerId} (${m.split("/").pop()})`,
            });
          }
        });
      }

      // 2. Cloud keys that have hasKey === true
      if (Array.isArray(data.cloudKeys)) {
        data.cloudKeys.forEach((k: any) => {
          if (k.hasKey && !modelsList.some((m) => m.providerId === k.providerId)) {
            const defaultModelMap: Record<string, string> = {
              groq: "llama-3.3-70b-versatile",
              gemini: "gemini-2.5-flash",
              openrouter: "meta-llama/llama-3.3-70b-instruct",
              anthropic: "claude-3-5-sonnet-20241022",
              xai: "grok-2-1212",
              deepseek: "deepseek-chat",
              fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
            };
            const m = defaultModelMap[k.providerId] || "default";
            modelsList.push({
              id: `${k.providerId}:${m}`,
              providerId: k.providerId,
              name: k.name || k.providerId,
              model: m,
              label: `${k.name || k.providerId} (${m.split("/").pop()})`,
            });
          }
        });
      }

      // 3. Custom Endpoints
      if (Array.isArray(data.customEndpoints)) {
        data.customEndpoints.forEach((e: any) => {
          if (e.hasKey || e.isActive) {
            const m = e.defaultModel || "hermes-agent";
            modelsList.push({
              id: `custom:${e.id || e.name}:${m}`,
              providerId: "custom",
              name: e.name || "Custom Proxy",
              model: m,
              label: `${e.name || "Custom"} (${m.split("/").pop()})`,
            });
          }
        });
      }

      // 4. Local models if configured
      if (Array.isArray(data.localModels) && data.catalogProviders?.some((p: any) => p.providerId === "ollama" && p.configured)) {
        data.localModels.forEach((lm: string) => {
          modelsList.push({
            id: `ollama:${lm}`,
            providerId: "ollama",
            name: "Local Ollama",
            model: lm,
            label: `Ollama (${lm})`,
          });
        });
      }

      setInstalledModels(modelsList);

      // Select first installed model if available and nothing valid selected
      if (modelsList.length > 0) {
        setSelectedProvider((curr) => {
          const match = modelsList.find((m) => m.providerId === curr);
          if (match) {
            setSelectedModel(match.model);
            return curr;
          }
          setSelectedModel(modelsList[0].model);
          return modelsList[0].providerId;
        });
      }
    } catch (err) {
      console.warn("[LOAD_INSTALLED_MODELS_ERR]", err);
    }
  }, []);

  useEffect(() => {
    loadInstalledProviders();
    const handleProvidersChanged = () => {
      loadInstalledProviders();
    };
    window.addEventListener("piew_providers_changed", handleProvidersChanged);
    return () => {
      window.removeEventListener("piew_providers_changed", handleProvidersChanged);
    };
  }, [loadInstalledProviders]);
  const [stylePreset, setStylePreset] = useState<
    "comprehensive_blueprint" | "tactical_prompt" | "system_instruction" | "few_shot_exemplar"
  >("comprehensive_blueprint");
  const [budgetMode, setBudgetMode] = useState<"balanced" | "eco" | "deep_audit">("balanced");
  const [customConstraints, setCustomConstraints] = useState<string[]>([]);
  const [newConstraintInput, setNewConstraintInput] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Grounding Context State
  const [groundingData, setGroundingData] = useState<{
    sourceUrl: string;
    facts: string[];
    combinedText: string;
  } | null>(null);

  // Synthesis Output State
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"master" | "blueprint" | "spider" | "analysis">("master");
  const [diffMode, setDiffMode] = useState(false);
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0);
  const [result, setResult] = useState<SynthesisResponse | null>(null);

  // Dialog & Drawer States
  const [isCrawlerOpen, setIsCrawlerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handlers for constraints
  const handleAddConstraint = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newConstraintInput.trim();
    if (!trimmed) return;
    if (customConstraints.includes(trimmed)) {
      toast.info(lang === "en" ? "Constraint already added" : "Batasan sudah ditambahkan");
      return;
    }
    setCustomConstraints([...customConstraints, trimmed]);
    setNewConstraintInput("");
  };

  const handleRemoveConstraint = (indexToRemove: number) => {
    setCustomConstraints(customConstraints.filter((_, i) => i !== indexToRemove));
  };

  const handleSynthesize = async () => {
    if (!prompt.trim()) {
      toast.error(lang === "en" ? "Please enter a prompt" : "Harap masukkan prompt terlebih dahulu");
      return;
    }

    setIsLoading(true);
    try {
      let promptToOptimize = prompt.trim();
      let contextPayload: string | undefined = undefined;

      if (groundingData && groundingData.combinedText) {
        contextPayload = `[GROUNDING SPECIFICATION CONTEXT from ${groundingData.sourceUrl}]:\n${groundingData.combinedText.slice(0, 4000)}`;
      }

      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToOptimize,
          context: contextPayload,
          domain,
          providerId: selectedProvider,
          targetModel: selectedModel,
          stylePreset,
          budgetMode,
          constraints: customConstraints,
          referenceUrls: groundingData?.sourceUrl ? [groundingData.sourceUrl] : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || (lang === "en" ? "Synthesis failed" : "Sintesis prompt gagal"));
      }

      setResult(data);
      setSelectedDiagramIndex(0);
      setActiveTab("master");
      toast.success(lang === "en" ? "Master prompt synthesized!" : "Master prompt berhasil disintesis!");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!result?.optimizedPrompt) return;
    try {
      await navigator.clipboard.writeText(result.optimizedPrompt);
      setIsCopied(true);
      toast.success(lang === "en" ? "Prompt copied to clipboard!" : "Prompt berhasil disalin ke papan klip!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error(lang === "en" ? "Failed to copy" : "Gagal menyalin");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!result?.optimizedPrompt) return;
    const blob = new Blob([result.optimizedPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `master-prompt-${domain}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(lang === "en" ? "Exported to Markdown file!" : "Berhasil diekspor ke berkas Markdown!");
  };

  const handleSaveToHistory = async () => {
    if (!result?.optimizedPrompt) return;
    setIsSaving(true);
    try {
      const payload = {
        originalPrompt: prompt,
        optimizedPrompt: result.optimizedPrompt,
        intentSummary: result.detectedIntent || result.universalBlueprint?.summary || `Domain ${domain} synthesized prompt`,
        score: result.synthesisValidation?.overallSynthesisScore ?? result.analysis?.score ?? 95,
      };

      let res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Jika token sesi lama kadaluarsa atau rahasia server dirotasi, server membersihkan cookie; auto-retry sekali
      if (res.status === 401) {
        res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(lang === "en" ? "Saved to SQLite history!" : "Tersimpan ke basis data SQLite!");
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFromHistory = (record: any) => {
    setPrompt(record.originalPrompt);
    setResult({
      success: true,
      originalPrompt: record.originalPrompt,
      optimizedPrompt: record.optimizedPrompt,
      analysis: {
        score: record.score,
      },
    });
    setActiveTab("master");
    toast.info(lang === "en" ? "Session restored from history" : "Sesi dimuat dari riwayat");
  };

  // Resolve active diagrams from engine output
  const availableDiagrams: DiagramItem[] =
    result?.universalBlueprint?.diagrams && result.universalBlueprint.diagrams.length > 0
      ? result.universalBlueprint.diagrams
      : result?.mermaidDiagrams && result.mermaidDiagrams.length > 0
      ? result.mermaidDiagrams
      : [
          {
            id: "diag-default",
            type: "flowchart",
            title: lang === "en" ? "System Architecture & Execution Flow" : "Arsitektur Sistem & Alur Eksekusi",
            description: lang === "en" ? "Execution topology synthesized by engine" : "Topologi eksekusi hasil sintesis engine",
            mermaidCode: `graph TD\n  Client[User Application] --> API[Next.js API Gateway]\n  API --> Core[Prompt Intelligence Engine]\n  Core --> DB[(SQLite WAL Database)]\n  Core --> Groq[Groq LPU Llama-3.3]`,
          },
        ];

  const activeDiagram = availableDiagrams[selectedDiagramIndex] || availableDiagrams[0];
  const chartCode = activeDiagram.mermaidCode || activeDiagram.diagram || "";

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex overflow-hidden font-sans selection:bg-lime-300 selection:text-stone-900">
      {/* Workspace Sidebar from D:\navbar */}
      <WorkspaceSidebar activeMode="Classic" />

      {/* Main Canvas Scrollable Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto relative">
        {/* Subtle warm workspace ambient glow */}
        <div className="workspace-grid absolute inset-0 opacity-40 pointer-events-none" />
        <div className="pointer-events-none absolute -right-28 -top-28 size-96 rounded-full bg-lime-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/4 size-80 rounded-full bg-amber-200/20 blur-3xl" />

        <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7 space-y-6">
          {/* Workspace Utility Sub-header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {lang === "en" ? "Classic Prompt Synthesis" : "Sintesis Prompt Classic"}
                </h1>
              </div>
              <p className="text-xs text-stone-600">
                {lang === "en"
                  ? "Operational master prompt generator with closed-loop grounding, multi-diagram blueprints, and Spider tests."
                  : "Generator master prompt produksi dengan validasi grounding, diagram arsitektur multi-tampilan, dan uji Spider."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Output Navigation Tabs (Teks Utama, Blueprint, Uji Keamanan, Audit & Temuan) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/60 border border-stone-300/60 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("master")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "master"
                      ? "bg-stone-900 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Master Prompt" : "Teks Utama"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("blueprint")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "blueprint"
                      ? "bg-stone-900 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Blueprint" : "Blueprint"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("spider")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "spider"
                      ? "bg-stone-900 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Safety Test" : "Uji Keamanan (Spider)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("analysis")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "analysis"
                      ? "bg-stone-900 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Audit" : "Audit & Temuan"}</span>
                </button>
              </div>

              {/* History Button (Moved here together with tabs) */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 hover:text-stone-950 transition-colors cursor-pointer shadow-2xs"
              >
                <History className="w-3.5 h-3.5 text-stone-500" />
                <span>{lang === "en" ? "History" : "Riwayat"}</span>
              </button>


            </div>
          </div>

          {/* 2-Column Split Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Input Console & Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-sky-600" />
                    {lang === "en" ? "System Idea / Raw Prompt" : "Ide Sistem / Prompt Mentah"}
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    {prompt.length} chars
                  </span>
                </div>

                {/* Textarea */}
                <textarea
                  rows={8}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    lang === "en"
                      ? DOMAIN_PRESETS[domain]?.placeholderEn || "Describe your software requirements, architectural constraints, target tech stack, or rules to enforce..."
                      : DOMAIN_PRESETS[domain]?.placeholderId || "Jelaskan kebutuhan perangkat lunak, batasan arsitektur, teknologi yang digunakan, atau aturan yang wajib dipatuhi..."
                  }
                  className="w-full rounded-xl border border-stone-200 bg-[#faf9f6] p-4 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-300/40 transition-all resize-y leading-relaxed shadow-2xs"
                />

                {/* Grounding Context Badge if attached */}
                {groundingData && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-900">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate text-[11px] font-mono">
                        {groundingData.sourceUrl} ({groundingData.facts.length} facts)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGroundingData(null)}
                      title="Remove grounding"
                      className="p-1 rounded text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Domain / Category Pills (Item 1: Moved above Pengaturan Format & Detail) */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/60 border border-stone-300/60 text-xs">
                  {(["coding", "general", "debugging", "business", "academic"] as const).map((d) => {
                    const preset = DOMAIN_PRESETS[d];
                    const label = lang === "en" ? preset.labelEn : preset.labelId;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDomain(d)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                          domain === d
                            ? "bg-stone-900 text-white font-semibold shadow-2xs"
                            : "text-stone-600 hover:text-stone-950 hover:bg-stone-200/70"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Collapsible Advanced Engine Settings */}
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-[#faf9f6]">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                      {lang === "en" ? "Format & Detail Settings" : "Pengaturan Format & Detail"}
                    </span>
                    {showAdvancedOptions ? (
                      <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                    )}
                  </button>

                  {showAdvancedOptions && (
                    <div className="p-3.5 border-t border-stone-200 space-y-3 bg-white text-xs">
                      {/* Style Preset */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-700 block">
                          {lang === "en" ? "Blueprint Style Format" : "Format Rancangan Sistem"}
                        </label>
                        <select
                          value={stylePreset}
                          onChange={(e: any) => setStylePreset(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                        >
                          <option value="comprehensive_blueprint">
                            {lang === "en" ? "Full Blueprint (Standard)" : "Rancangan Lengkap (Standar)"}
                          </option>
                          <option value="tactical_prompt">
                            {lang === "en" ? "Concise & Direct Action" : "Ringkas & Siap Eksekusi"}
                          </option>
                          <option value="system_instruction">
                            {lang === "en" ? "Expert Guidelines & Work Rules" : "Panduan Peran & Aturan Kerja"}
                          </option>
                          <option value="few_shot_exemplar">
                            {lang === "en" ? "With Output Examples" : "Disertai Contoh Format Hasil"}
                          </option>
                        </select>
                      </div>

                      {/* Detail Level (Token Budget) */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-700 block">
                          {lang === "en" ? "Detail & Length" : "Panjang & Detail Respon"}
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "eco", labelEn: "Compact", labelId: "Ringkas" },
                            { id: "balanced", labelEn: "Balanced", labelId: "Seimbang" },
                            { id: "deep_audit", labelEn: "Deep Detail", labelId: "Mendalam" },
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setBudgetMode(b.id as any)}
                              className={`py-1.5 rounded-lg text-[11px] border font-medium transition-colors cursor-pointer text-center ${
                                budgetMode === b.id
                                  ? "bg-stone-900 text-white border-stone-900 font-semibold shadow-2xs"
                                  : "border-stone-200 bg-[#faf9f6] text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                              }`}
                            >
                              {lang === "en" ? b.labelEn : b.labelId}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom User Constraints Tag Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-stone-700 block">
                          {lang === "en" ? "Must-Follow Rules / Constraints" : "Aturan Khusus / Larangan"}
                        </label>
                        <form onSubmit={handleAddConstraint} className="flex gap-1.5">
                          <input
                            type="text"
                            value={newConstraintInput}
                            onChange={(e) => setNewConstraintInput(e.target.value)}
                            placeholder={lang === "en" ? "e.g. Do not use external libraries, keep simple..." : "cth: Jangan gunakan library luar, buat sesederhana mungkin..."}
                            className="flex-1 rounded-lg border border-stone-200 bg-[#faf9f6] px-2.5 py-1 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </form>

                        {customConstraints.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {customConstraints.map((c, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[11px] text-stone-800"
                              >
                                {c}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveConstraint(i)}
                                  className="text-stone-400 hover:text-rose-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Web Grounding & Dynamic Installed Model Selector */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCrawlerOpen(true)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                        groundingData
                          ? "border-sky-300 bg-sky-50 text-sky-900"
                          : "border-stone-200 bg-[#faf9f6] text-stone-700 hover:bg-stone-100 hover:text-stone-950"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>
                        {groundingData
                          ? `${groundingData.facts.length} ${lang === "en" ? "Facts" : "Fakta"}`
                          : lang === "en"
                          ? "Web Grounding"
                          : "Grounding Web"}
                      </span>
                    </button>

                    {/* Dynamic Model selector reading installed models from /api/providers */}
                    <div className="min-w-0 flex-1 flex items-center justify-end gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-[#faf9f6] text-xs font-medium text-stone-700 shadow-2xs">
                      <Cpu className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span className="font-semibold text-stone-500 shrink-0">Model:</span>
                      <select
                        value={`${selectedProvider}:${selectedModel}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = installedModels.find((m) => m.id === val);
                          if (found) {
                            setSelectedProvider(found.providerId);
                            setSelectedModel(found.model);
                          }
                        }}
                        className="bg-transparent font-medium text-stone-900 focus:outline-none cursor-pointer pr-1 truncate text-xs min-w-0 max-w-[170px]"
                      >
                        {installedModels.length > 0 ? (
                          installedModels.map((m) => (
                            <option key={m.id} value={m.id} className="bg-white text-stone-900">
                              {m.label}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled className="bg-white text-stone-500">
                            {lang === "en" ? "No model installed" : "Belum ada model terpasang"}
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Jalankan (Run) CTA Button */}
                  <button
                    type="button"
                    onClick={handleSynthesize}
                    disabled={isLoading || !prompt.trim()}
                    className="w-full rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white hover:bg-stone-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                        <span>
                          {lang === "en"
                            ? "Running..."
                            : "Menjalankan..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-lime-400 fill-current" />
                        <span>
                          {lang === "en"
                            ? "Run"
                            : "Jalankan"}
                        </span>
                        <ArrowRight className="w-4 h-4 text-lime-400" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Starter Templates */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5 shadow-sm">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                  {lang === "en" ? "Quick Examples" : "Contoh Cepat"}
                </span>
                <div className="space-y-1.5">
                  {TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(lang === "en" ? tmpl.promptEn : tmpl.promptId)}
                      className="w-full text-left p-2.5 rounded-xl border border-stone-200/80 bg-[#faf9f6] hover:bg-white hover:border-stone-300 hover:shadow-2xs transition-all text-xs text-stone-700 space-y-1 cursor-pointer group"
                    >
                      <div className="font-medium text-stone-900 flex items-center justify-between">
                        <span>{lang === "en" ? tmpl.titleEn : tmpl.titleId}</span>
                        <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-stone-900 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Output Workbench & Multi-Dimensional Tabs */}
            <div className="lg:col-span-7 space-y-4">
              {!result ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[460px] shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 shadow-2xs">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-semibold text-stone-900">
                      {lang === "en" ? "Ready for Synthesis" : "Siap untuk Sintesis"}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {lang === "en"
                        ? "Enter your initial concept on the left or select a quick starter to synthesize a structured, non-leaking master prompt."
                        : "Tulis konsep kebutuhan Anda di sebelah kiri atau pilih templat cepat untuk menghasilkan master prompt terstruktur."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Actions Bar: Diff, Salin, Simpan on the Left Side */}
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDiffMode(!diffMode)}
                        title="Toggle Diff Mode"
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                          diffMode
                            ? "bg-sky-100 border-sky-300 text-sky-900"
                            : "border-stone-200 bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50 shadow-2xs"
                        }`}
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Diff</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-800 hover:text-stone-950 hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                        <span>{isCopied ? (lang === "en" ? "Copied" : "Tersalin") : (lang === "en" ? "Copy" : "Salin")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveToHistory}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{lang === "en" ? "Save" : "Simpan"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        title={lang === "en" ? "Export Markdown" : "Ekspor Markdown"}
                        className="p-2 rounded-xl border border-stone-200 bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-stone-500">
                        {activeTab === "master" && (lang === "en" ? "Master View" : "Teks Utama")}
                        {activeTab === "blueprint" && (lang === "en" ? "Blueprint View" : "Diagram")}
                        {activeTab === "spider" && (lang === "en" ? "Safety View" : "Uji Keamanan")}
                        {activeTab === "analysis" && (lang === "en" ? "Audit View" : "Audit & Temuan")}
                      </span>
                    </div>
                  </div>

                  {/* TAB 1: MASTER PROMPT TEXT & DIFF */}
                  {activeTab === "master" && (
                    <div className="space-y-4">
                      {diffMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2 shadow-sm">
                            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                              {lang === "en" ? "Original Raw Prompt" : "Prompt Asli"}
                            </span>
                            <pre className="text-xs font-mono text-stone-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                              {prompt}
                            </pre>
                          </div>

                          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-2 shadow-sm">
                            <span className="text-[10px] font-mono text-emerald-800 uppercase tracking-wider block font-semibold">
                              {lang === "en" ? "Synthesized Master Prompt" : "Master Prompt Teroptimasi"}
                            </span>
                            <pre className="text-xs font-mono text-stone-900 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                              {result.optimizedPrompt}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900">
                                {lang === "en" ? "Synthesized Output" : "Hasil Sintesis Master Prompt"}
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                                {result.model || selectedModel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-[11px] text-stone-500">
                              <span className="font-semibold text-emerald-700">
                                Score: {result.synthesisValidation?.overallSynthesisScore ?? 100}%
                              </span>
                              <span>{result.optimizedPrompt?.length} chars</span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#faf9f6] p-4 border border-stone-200 text-stone-800 shadow-inner">
                            <pre className="text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-y-auto select-text">
                              {result.optimizedPrompt}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: ARCHITECTURE BLUEPRINT (MULTI-DIAGRAM & ROADMAP) */}
                  {activeTab === "blueprint" && (
                    <div className="space-y-4">
                      {/* Diagram Selector if multiple diagrams are returned */}
                      {availableDiagrams.length > 1 && (
                        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
                          <span className="text-xs font-semibold text-stone-500 font-mono">
                            {lang === "en" ? "Views:" : "Tampilan:"}
                          </span>
                          {availableDiagrams.map((diag, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedDiagramIndex(idx)}
                              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                selectedDiagramIndex === idx
                                  ? "bg-stone-900 text-white font-semibold shadow-2xs"
                                  : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
                              }`}
                            >
                              {diag.type?.toUpperCase() || `VIEW 0${idx + 1}`} : {diag.title || `Diagram ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mermaid Diagram Viewer */}
                      <MermaidViewer
                        chart={chartCode}
                        title={activeDiagram.title || (lang === "en" ? "System Architecture & Execution Flow" : "Arsitektur Sistem & Alur Eksekusi")}
                        description={activeDiagram.description || result.universalBlueprint?.summary || "Universal Blueprint visualization generated by engine"}
                      />

                      {/* Execution Phases Roadmap */}
                      {result.universalBlueprint?.executionPhases && result.universalBlueprint.executionPhases.length > 0 && (
                        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                            <span className="text-xs font-semibold text-stone-900 flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                              {lang === "en" ? "Execution Phases & Concrete Deliverables" : "Tahapan Eksekusi & Deliverable Nyata"}
                            </span>
                            <span className="text-[11px] font-mono text-stone-500">
                              {result.universalBlueprint.executionPhases.length} Phases
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {result.universalBlueprint.executionPhases.map((phase, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl bg-[#faf9f6] border border-stone-200 space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono font-bold text-lime-700 bg-lime-100/80 px-2 py-0.5 rounded-md border border-lime-200">
                                    0{phase.phaseNumber ?? idx}.
                                  </span>
                                  <span className="font-semibold text-stone-900 text-xs">
                                    {phase.name}
                                  </span>
                                </div>

                                {phase.tasks && phase.tasks.length > 0 && (
                                  <ul className="text-[11px] text-stone-600 space-y-1 list-disc list-inside">
                                    {phase.tasks.slice(0, 3).map((t, tIdx) => (
                                      <li key={tIdx} className="line-clamp-2">{t}</li>
                                    ))}
                                  </ul>
                                )}

                                {phase.deliverables && phase.deliverables.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1 border-t border-stone-200/60">
                                    {phase.deliverables.map((d, dIdx) => (
                                      <span
                                        key={dIdx}
                                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200"
                                      >
                                        📄 {d}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expert Council Roles */}
                      {result.universalBlueprint?.roles && result.universalBlueprint.roles.length > 0 && (
                        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 shadow-sm">
                          <span className="text-xs font-semibold text-stone-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-sky-600" />
                            {lang === "en" ? "Synthesized Expert Council (Roles)" : "Dewan Pakar yang Ditugaskan (Roles)"}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {result.universalBlueprint.roles.map((role, idx) => (
                              <div key={idx} className="p-2.5 rounded-xl bg-[#faf9f6] border border-stone-200 text-stone-800 font-mono text-[11px] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                <span>{role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Negative Constraints & Definition of Done */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Negative Constraints */}
                        {result.universalBlueprint?.negativeConstraints && result.universalBlueprint.negativeConstraints.length > 0 && (
                          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5 shadow-sm">
                            <span className="text-xs font-semibold text-rose-700 flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-rose-600" />
                              {lang === "en" ? "Negative Constraints & Guardrails" : "Larangan Mutlak & Batasan Negatif"}
                            </span>
                            <ul className="text-[11px] text-stone-700 space-y-1.5 list-disc list-inside">
                              {result.universalBlueprint.negativeConstraints.map((nc, idx) => (
                                <li key={idx} className="leading-relaxed">{nc}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Definition of Done */}
                        {result.universalBlueprint?.definitionOfDone && result.universalBlueprint.definitionOfDone.length > 0 && (
                          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5 shadow-sm">
                            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              {lang === "en" ? "Definition of Done (DoD)" : "Kriteria Penyelesaian (Definition of Done)"}
                            </span>
                            <ul className="text-[11px] text-stone-700 space-y-1.5 list-disc list-inside">
                              {result.universalBlueprint.definitionOfDone.map((dod, idx) => (
                                <li key={idx} className="leading-relaxed">{dod}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SPIDER MATRIX STRESS TEST */}
                  {activeTab === "spider" && (
                    <SpiderMatrixCard
                      promptContent={result.optimizedPrompt || ""}
                      lang={lang}
                      targetProvider={selectedProvider}
                      targetModel={selectedModel}
                    />
                  )}

                  {/* TAB 4: AUDIT & FINDINGS */}
                  {activeTab === "analysis" && (
                    <div className="space-y-4">
                      {/* Score & Telemetry Header */}
                      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                          <div>
                            <span className="font-semibold text-stone-900 text-xs block">
                              {lang === "en" ? "Automated Semantic Audit & Validation" : "Audit Semantik & Validasi Otomatis"}
                            </span>
                            <span className="text-[11px] text-stone-500 font-mono">
                              Rule Pack: {result.appliedDomainRule?.name || domain} ({result.appliedDomainRule?.ruleVersion || "v2.0"})
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-stone-500 block uppercase">Raw Score</span>
                              <span className="font-bold text-amber-700">{result.analysis?.score ?? 35}%</span>
                            </div>
                            <div className="w-[1px] h-6 bg-stone-200" />
                            <div>
                              <span className="text-[10px] text-stone-500 block uppercase">Synthesized Score</span>
                              <span className="font-bold text-emerald-700">
                                {result.synthesisValidation?.overallSynthesisScore ?? 100}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 8-Point Synthesis Validation Checks */}
                        {result.synthesisValidation?.checks && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider block">
                              {lang === "en" ? "8-Point Closed-Loop Quality Gates" : "8 Gerbang Uji Kualitas Tertutup"}
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                              {Object.entries(result.synthesisValidation.checks).map(([key, passed]) => (
                                <div
                                  key={key}
                                  className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                                    passed
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                      : "bg-rose-50 border-rose-200 text-rose-800"
                                  }`}
                                >
                                  {passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <span className="truncate capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Engine Findings & Applied Changes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Detected Findings */}
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
                          <span className="text-xs font-semibold text-stone-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            {lang === "en" ? "Engine Findings & Remediations" : "Temuan Masalah yang Diremediasi"}
                          </span>

                          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {result.analysis?.findings && result.analysis.findings.length > 0 ? (
                              result.analysis.findings.map((f, i) => (
                                <div key={i} className="p-3 rounded-xl bg-[#faf9f6] border border-stone-200 space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-stone-900">{f.category || f.type || "Finding"}</span>
                                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                      {f.severity || "moderate"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-stone-600 leading-relaxed">
                                    {f.message || f.recommendation}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                                {lang === "en" ? "No critical ambiguities detected in the prompt." : "Tidak ditemukan ambiguitas kritis pada prompt."}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Applied Transformations */}
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
                          <span className="text-xs font-semibold text-stone-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {lang === "en" ? "Applied Transformation Passes" : "Transformasi Arsitektur yang Diterapkan"}
                          </span>

                          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {result.changes && result.changes.length > 0 ? (
                              result.changes.map((change, i) => (
                                <div key={i} className="p-2.5 rounded-xl bg-[#faf9f6] border border-stone-200 text-[11px] text-stone-700 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                                  <span className="leading-relaxed">{change}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-stone-500">
                                {lang === "en" ? "Standard synthesis pass applied." : "Tahap sintesis standar diterapkan."}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Engine Telemetry */}
                      {result.metadata && (
                        <div className="rounded-xl border border-stone-200 bg-white p-3 text-[11px] font-mono text-stone-600 flex flex-wrap items-center justify-between gap-2">
                          <span>Provider: <strong className="text-stone-900">{result.metadata.providerId || result.providerId || selectedProvider}</strong></span>
                          <span>Model: <strong className="text-stone-900">{result.metadata.model || result.model || selectedModel}</strong></span>
                          <span>Latency: <strong className="text-stone-900">{result.metadata.latencyMs || result.metadata.processingTimeMs || 0}ms</strong></span>
                          {result.metadata.tokensUsed && (
                            <span>Tokens: <strong className="text-stone-900">{result.metadata.tokensUsed.totalTokens || 0}</strong> ({result.metadata.tokensUsed.promptTokens || 0} prompt / {result.metadata.tokensUsed.completionTokens || 0} comp)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Web Crawler Grounding Dialog */}
      <CrawlerDialog
        isOpen={isCrawlerOpen}
        onClose={() => setIsCrawlerOpen(false)}
        onGroundingImported={(data) => {
          setGroundingData(data);
          toast.success(
            lang === "en"
              ? `Imported ${data.facts.length} facts from ${data.sourceUrl}`
              : `Berhasil mengimpor ${data.facts.length} fakta dari ${data.sourceUrl}`
          );
        }}
        lang={lang}
      />

      {/* History Slide-out Drawer */}
      <HistorySheet
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleLoadFromHistory}
        lang={lang}
      />
    </div>
  );
}
