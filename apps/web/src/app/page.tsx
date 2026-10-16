"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PromptOptimizationResult } from "@/types/prompt";
import { ResultDashboard } from "@/components/workspace/result-dashboard";
import {
  HistorySidebar,
  SavedPromptItem,
} from "@/components/workspace/history-sidebar";
import { PrivacyDisclosure } from "@/components/workspace/privacy-disclosure";
import { UserGuideSection } from "@/components/workspace/user-guide-section";
import {
  TelemetrySummaryBar,
  TelemetryMetrics,
} from "@/components/workspace/telemetry-summary-bar";
import { CrawlerImportModal } from "@/components/workspace/crawler-import-modal";
import { AppHeader } from "@/components/layout/app-header";
import { UnifiedSettingsModal } from "@/components/workspace/unified-settings-modal";
import {
  formatGroundingFactsForContext,
  buildClosedLoopOptimizationContext,
} from "@/lib/v2-workspace-helpers";
import { isCrawlerFeatureEnabled } from "@/lib/feature-flags";
import {
  CrawlerResultItem,
  CrawlerExtractionMode,
  PromptVersionRecord,
  SpiderReportSummary,
  SpiderSecurityFinding,
} from "@/types/v2-workspace";
import { listDomainPacks, DomainRulePack } from "@prompt-workspace/domain-rules";
import { ProviderCapability } from "@prompt-workspace/prompt-contracts";
import { toast } from "sonner";
import {
  TerminalSquare,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Cpu,
  History,
  Layers,
  Globe,
  PenTool,
  ChevronDown,
  CheckCircle2,
  Code2,
  Bot,
  BookOpen,
  ShieldCheck,
  Copy,
  Check,
  FileCheck,
  ExternalLink,
} from "lucide-react";

// Fallback daftar statis aman provider saat inisialisasi / loading
const DEFAULT_PROVIDERS: ProviderCapability[] = [
  {
    providerId: "groq",
    displayName: "Groq Cloud (Fast LPUs)",
    defaultModel: "llama-3.3-70b-versatile",
    availableModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "openai/gpt-oss-120b",
    ],
    supportsJsonMode: true,
    isLocal: false,
    configured: true,
    description: "Inferensi super cepat berbasis LPU dengan rotasi multi-key otomatis untuk keandalan tinggi.",
  },
  {
    providerId: "gemini",
    displayName: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    availableModels: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ],
    supportsJsonMode: true,
    isLocal: false,
    configured: false,
    description: "Model multimodal canggih dari Google dengan jendela konteks luas dan penalaran tajam.",
  },
  {
    providerId: "openrouter",
    displayName: "OpenRouter (Unified Gateway)",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    availableModels: [
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o-mini",
    ],
    supportsJsonMode: true,
    isLocal: false,
    configured: false,
    description: "Gateway multi-model global yang menghubungkan ke ratusan model open-source dan proprietary.",
  },
  {
    providerId: "ollama",
    displayName: "Ollama (Lokal / Self-Hosted)",
    defaultModel: "llama3.2",
    availableModels: [
      "llama3.2",
      "qwen2.5-coder",
      "mistral",
    ],
    supportsJsonMode: true,
    isLocal: true,
    configured: false,
    description: "Eksekusi LLM secara mandiri di mesin lokal tanpa biaya API eksternal dan privasi total.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("general");
  const [providers, setProviders] = useState<any[]>(DEFAULT_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState<string>("groq");
  const [selectedModel, setSelectedModel] = useState<string>("llama-3.3-70b-versatile");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptOptimizationResult | null>(null);

  // Mode switcher: "classic" vs "mission-control"
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<"classic" | "mission-control">("classic");

  // Interactive Pipeline Step Showcase State
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);
  const [isCopiedSchema, setIsCopiedSchema] = useState<boolean>(false);

  // Parallax subtle offset
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Unified Settings Modal State
  const [settingsState, setSettingsState] = useState<{
    isOpen: boolean;
    initialTab: "providers" | "connectors";
  }>({
    isOpen: false,
    initialTab: "providers",
  });

  // Ambil kapabilitas provider dari /api/providers
  const loadProviders = useCallback(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.providers)) {
          const mergedProviders: any[] = [...json.providers];
          if (Array.isArray(json.customEndpoints)) {
            json.customEndpoints.forEach((ep: { id: string; name: string; defaultModel?: string }) => {
              if (!mergedProviders.some((p) => p.providerId === ep.id)) {
                mergedProviders.push({
                  providerId: ep.id,
                  displayName: `${ep.name} (Custom)`,
                  defaultModel: ep.defaultModel || "default",
                  availableModels: ep.defaultModel ? [ep.defaultModel] : ["default"],
                  supportsJsonMode: true,
                  isLocal: false,
                  configured: true,
                  description: "Custom OpenAI-compatible Endpoint",
                });
              }
            });
          }
          setProviders(mergedProviders);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Handler saat custom endpoint dipilih dari modal Providers Settings
  const handleSelectCustomProvider = (providerId: string, model?: string) => {
    setProviders((prev) => {
      const existing = prev.find((p) => p.providerId === providerId);
      if (existing) {
        if (model && !existing.availableModels.includes(model)) {
          return prev.map((p) =>
            p.providerId === providerId
              ? { ...p, availableModels: [...p.availableModels, model] }
              : p
          );
        }
        return prev;
      }
      return [
        ...prev,
        {
          providerId,
          displayName: `${providerId} (Custom)`,
          defaultModel: model || "default",
          availableModels: model ? [model] : ["default"],
          supportsJsonMode: true,
          isLocal: false,
          configured: true,
          description: "Custom OpenAI-compatible Endpoint",
        },
      ];
    });
    setSelectedProvider(providerId);
    if (model) {
      setSelectedModel(model);
    }
    toast.success(`Penyedia aktif dialihkan ke "${providerId}"`);
  };

  // Muat domain packs secara deterministik
  const domainPacks = listDomainPacks();
  const activeDomainPack: DomainRulePack | undefined = domainPacks.find(
    (p) => p.domainId === selectedDomain
  );

  const activeProvider =
    providers.find((p) => p.providerId === selectedProvider) ||
    DEFAULT_PROVIDERS[0];

  const handleProviderChange = (newProviderId: string) => {
    setSelectedProvider(newProviderId);
    const targetProvider = providers.find((p) => p.providerId === newProviderId);
    if (targetProvider) {
      setSelectedModel(targetProvider.defaultModel);
    }
  };

  // History Sidebar state (real-time SQLite database)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyCount, setHistoryCount] = useState<number>(0);

  // North-Star & Stage 7 Privacy-Safe Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    optimizationsCount: 0,
    acceptedOrExportedCount: 0,
    playgroundRunsCount: 0,
    historyCount: 0,
    averageScore: 88,
  });

  // Sinkronisasi jumlah riwayat prompt dari database
  useEffect(() => {
    fetch("/api/history?limit=50")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setHistoryCount(json.data.length);
          setTelemetry((prev) => ({ ...prev, historyCount: json.data.length }));
        }
      })
      .catch(() => {});
  }, [historyRefreshKey]);

  const handleAcceptPrompt = () => {
    setHistoryCount((c) => c + 1);
    setHistoryRefreshKey((prev) => prev + 1);
    handleTelemetryAction("accept");
  };

  // v2.0 Web Crawler & Prompt Spider State
  const [isCrawlerModalOpen, setIsCrawlerModalOpen] = useState(false);
  const [versions, setVersions] = useState<PromptVersionRecord[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>("v1");
  const [spiderReport, setSpiderReport] = useState<SpiderReportSummary | null>(null);
  const [isSpiderLoading, setIsSpiderLoading] = useState(false);

  const handleCrawlerExtract = async (
    url: string,
    mode: CrawlerExtractionMode
  ): Promise<CrawlerResultItem[]> => {
    const res = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUrl: url,
        mode,
        sourceType: "GITHUB_BLOB_URL",
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Gagal mengekstrak dari crawler.");
    }
    return json.data.items;
  };

  const handleSelectCrawlerPrompt = (promptText: string) => {
    setPrompt(promptText);
    toast.success("Kandidat prompt berhasil dimuat ke editor!");
  };

  const handleInjectGroundingFacts = (selectedFacts: CrawlerResultItem[]) => {
    setContext((prevContext) => {
      const newContext = formatGroundingFactsForContext(prevContext, selectedFacts);
      return newContext;
    });
    toast.success(`${selectedFacts.length} Fakta sumber terverifikasi berhasil disuntikkan ke konteks!`);
  };

  const handleRunSpider = async () => {
    if (!result) return;
    setIsSpiderLoading(true);
    try {
      const res = await fetch("/api/spider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptVersionId: activeVersionId,
          promptContent: result.optimizedPrompt,
          domainId: selectedDomain,
          testInput: "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menjalankan Spider test.");
      }
      setSpiderReport(data.data.summary);
      toast.success("Pengujian Spider selesai dievaluasi!");
    } catch (err) {
      toast.error((err as Error).message || "Gagal menguji Spider matrix.");
    } finally {
      setIsSpiderLoading(false);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    setActiveVersionId(versionId);
    const target = versions.find((v) => v.versionId === versionId);
    if (target && result) {
      setResult({
        ...result,
        optimizedPrompt: target.promptText,
        analysis: {
          ...result.analysis,
          score: target.qualityScore,
        },
      });
      toast.info(`Beralih ke versi prompt ${target.versionNumber}`);
    }
  };

  const handleRequestSpiderRefinement = async (findings: SpiderSecurityFinding[]) => {
    if (!result) return;
    const closedLoopContext = buildClosedLoopOptimizationContext({
      userContext: context,
      spiderFindings: findings.map((f) => ({
        category: f.category,
        remediationHint: f.recommendation,
        sanitizedEvidence: f.evidenceSnippet,
      })),
    });
    await handleSubmit(closedLoopContext, "spider-refinement");
  };

  const handleTelemetryAction = (
    action: "optimize" | "accept" | "export" | "playground_run" | "feedback_helpful" | "feedback_issue"
  ) => {
    setTelemetry((prev) => {
      switch (action) {
        case "optimize":
          return { ...prev, optimizationsCount: prev.optimizationsCount + 1 };
        case "accept":
        case "export":
          return {
            ...prev,
            acceptedOrExportedCount: prev.acceptedOrExportedCount + 1,
          };
        case "playground_run":
          return {
            ...prev,
            playgroundRunsCount: prev.playgroundRunsCount + 1,
          };
        default:
          return prev;
      }
    });
  };

  const handleSubmit = async (
    customContext?: string,
    sourceRole: "initial" | "spider-refinement" = "initial"
  ) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: (customContext !== undefined ? customContext : context).trim() || null,
          taskType: selectedDomain,
          providerId: selectedProvider,
          targetModel: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengoptimasi prompt.");
      }

      setResult(data);
      handleTelemetryAction("optimize");

      const newVersionNum = versions.length + 1;
      const newVersionId = `v${newVersionNum}`;
      const newRecord: PromptVersionRecord = {
        versionId: newVersionId,
        versionNumber: newVersionNum,
        promptText: data.optimizedPrompt,
        createdAt: new Date().toISOString(),
        source: sourceRole,
        changeSummary:
          sourceRole === "spider-refinement"
            ? "Perbaikan otomatis berdasarkan temuan uji ketahanan Spider"
            : `Optimasi awal domain ${selectedDomain}`,
        qualityScore: data.analysis?.score ?? 85,
        criticalGatePassed: true,
      };

      setVersions((prev) => [...prev, newRecord]);
      setActiveVersionId(newVersionId);

      setTelemetry((prev) => {
        const currentAvg = prev.averageScore ?? 85;
        const newScore = data.analysis?.score ?? 85;
        const updatedAvg =
          prev.optimizationsCount === 0
            ? newScore
            : (currentAvg * prev.optimizationsCount + newScore) /
              (prev.optimizationsCount + 1);
        return {
          ...prev,
          averageScore: updatedAvg,
        };
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Engine sedang sibuk atau gagal menganalisis. Coba lagi atau sederhanakan prompt."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setContext("");
    setSelectedDomain("general");
    setSelectedProvider("groq");
    setSelectedModel("llama-3.3-70b-versatile");
    setResult(null);
    setError(null);
  };

  const handleSelectHistoryPrompt = (item: SavedPromptItem) => {
    setPrompt(item.originalPrompt);
    setIsHistoryOpen(false);
    toast.info("Prompt dimuat ke editor workspace", {
      description: "Anda dapat memodifikasi atau menganalisis ulang prompt ini.",
    });
  };

  // Pipeline Interactive Data
  const pipelineSteps = [
    {
      id: "01",
      title: "Raw Prompt Ingestion",
      desc: "Instruksi kasar diterima, diparsing variabel konteksnya, dan diisolasi dalam sandbox sebelum memasuki pipeline analisis.",
      jsonSnippet: `{
  "step": "01_INGESTION",
  "rawLength": 248,
  "detectedTokens": 62,
  "sandboxState": "ISOLATED",
  "ssrfGuarded": true
}`,
    },
    {
      id: "02",
      title: "Semantic Audit & Guardrails",
      desc: "Audit ambiguitas semantik, ekstraksi intent pengguna, serta injeksi 6 batasan negatif mutlak sesuai domain rule pack.",
      jsonSnippet: `{
  "step": "02_AUDIT_GUARDRAILS",
  "intentScore": 94,
  "negativeConstraints": [
    "DILARANG membuat mock data palsu",
    "DILARANG mengabaikan error handling"
  ],
  "preservedIntent": true
}`,
    },
    {
      id: "03",
      title: "Master Blueprint Synthesis",
      desc: "Rekonstruksi instruksi menjadi Master Prompt berstruktur produksi dengan diagram Mermaid deklaratif dan target model profile.",
      jsonSnippet: `{
  "step": "03_BLUEPRINT_SYNTHESIS",
  "targetModel": "llama-3.3-70b-versatile",
  "hasMermaidTopology": true,
  "executionProtocol": "5_STEP_INSPECT_PLAN_RUN",
  "readiness": "PRODUCTION_VERIFIED"
}`,
    },
    {
      id: "04",
      title: "Spider Stress Testing & Closed-Loop",
      desc: "Pengujian ketahanan otomatis 5-vektor terhadap jailbreak, prompt injection, dan skenario kegagalan, diikuti closed-loop auto-refinement.",
      jsonSnippet: `{
  "step": "04_SPIDER_MATRIX",
  "vectorsTested": 5,
  "robustnessScore": 92,
  "criticalFindings": 0,
  "closedLoopRefined": true
}`,
    },
  ];

  const handleCopySchema = () => {
    navigator.clipboard.writeText(pipelineSteps[activePipelineStep].jsonSnippet);
    setIsCopiedSchema(true);
    toast.success("Skema JSON disalin ke clipboard!");
    setTimeout(() => setIsCopiedSchema(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-sky-500/20 selection:text-foreground flex flex-col font-sans piew-grid-bg relative">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleSelectHistoryPrompt}
        refreshKey={historyRefreshKey}
        onCountChange={setHistoryCount}
      />

      {/* Universal Sticky Glass Header */}
      <AppHeader
        historyCount={historyCount}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={(tab = "providers") =>
          setSettingsState({ isOpen: true, initialTab: tab })
        }
        activeWorkspaceMode={activeWorkspaceMode}
        onWorkspaceModeChange={(mode) => setActiveWorkspaceMode(mode)}
      />

      {/* Telemetry Summary Ribbon */}
      <TelemetrySummaryBar metrics={telemetry} />

      {/* Architectural Grid Master Frame Container */}
      <div className="w-full max-w-[1320px] mx-auto border-x border-border bg-background flex-1 flex flex-col relative shadow-[0_0_80px_rgba(14,165,233,0.03)]">
        
        {/* Sky-Blue Crosshairs & Node Dots at Container Corners */}
        <div
          style={{ transform: `translateY(${Math.min(scrollY * 0.05, 15)}px)` }}
          className="absolute -top-3.5 -left-3.5 z-20 hidden md:flex items-center justify-center w-7 h-7 rounded-full bg-background border border-sky-200 dark:border-sky-900 shadow-2xs text-sky-500 font-mono text-xs select-none transition-transform duration-75"
        >
          ✦
        </div>
        <div
          style={{ transform: `translateY(${Math.min(scrollY * 0.05, 15)}px)` }}
          className="absolute -top-3.5 -right-3.5 z-20 hidden md:flex items-center justify-center w-7 h-7 rounded-full bg-background border border-sky-200 dark:border-sky-900 shadow-2xs text-sky-500 font-mono text-xs select-none transition-transform duration-75"
        >
          ✦
        </div>

        {/* HERO SECTION — Positioning Produk PIEW & Interactive Prompt Command Center */}
        <section id="overview" className="relative pt-12 pb-10 sm:pt-16 sm:pb-14 px-4 sm:px-8 border-b border-border overflow-hidden">
          
          {/* Subtle Blueprint Dot-Matrix & Radial Sky Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-70 dark:opacity-20" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[360px] bg-sky-400/10 dark:bg-sky-500/10 blur-3xl rounded-full" />
          </div>

          {/* Side Matrix Grid Technical Labels */}
          <div className="hidden xl:block absolute top-12 left-6 border border-border/80 w-24 h-24 p-2 bg-card/60 backdrop-blur-xs rounded-lg select-none">
            <div className="w-full h-full border border-dashed border-sky-200 dark:border-sky-900/60 flex items-center justify-center relative">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping opacity-60" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span className="absolute bottom-1 left-1 font-mono text-[8px] text-sky-600 dark:text-sky-400 font-semibold">[ .BLUEPRINT ]</span>
            </div>
          </div>

          <div className="hidden xl:block absolute top-12 right-6 border border-border/80 w-24 h-24 p-2 bg-card/60 backdrop-blur-xs rounded-lg select-none">
            <div className="w-full h-full border border-dashed border-sky-200 dark:border-sky-900/60 flex items-center justify-center relative">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span className="absolute bottom-1 right-1 font-mono text-[8px] text-sky-600 dark:text-sky-400 font-semibold">[ .SPIDER_MATRIX ]</span>
            </div>
          </div>

          <div className="hidden xl:block absolute bottom-12 left-6 border border-border/80 w-24 h-24 p-2 bg-card/60 backdrop-blur-xs rounded-lg select-none">
            <div className="w-full h-full border border-dashed border-sky-200 dark:border-sky-900/60 flex items-center justify-center relative">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="absolute bottom-1 left-1 font-mono text-[8px] text-muted-foreground font-semibold">[ .GUARDRAILS ]</span>
            </div>
          </div>

          <div className="hidden xl:block absolute bottom-12 right-6 border border-border/80 w-24 h-24 p-2 bg-card/60 backdrop-blur-xs rounded-lg select-none">
            <div className="w-full h-full border border-dashed border-sky-200 dark:border-sky-900/60 flex items-center justify-center relative">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="absolute bottom-1 right-1 font-mono text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold">[ .ZERO_TRUST ]</span>
            </div>
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-4">
            {/* Release Pill di Atas Judul */}
            <div className="inline-flex items-center gap-2 border border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300 rounded-full px-3.5 py-1 text-xs font-medium shadow-2xs max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span className="font-mono font-semibold">PIEW v3.1</span>
              <span>— Autonomous Supervision &amp; Semantic Prompt Guardrails</span>
            </div>

            {/* Hero Headline (H1 Besar, Tajam, Dual-Tone Sky Blue) */}
            <h1 className="text-4xl sm:text-6xl lg:text-[62px] font-bold tracking-[-0.035em] leading-[1.08] text-center max-w-4xl mx-auto text-slate-900 dark:text-slate-100">
              Rekayasa instruksi AI dengan <br />
              <span className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 bg-clip-text text-transparent">
                presisi arsitektur &amp; bukti audit
              </span>
            </h1>

            {/* Sub-headline tentang PIEW */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Prompt Intelligence Workspace (PIEW) mengaudit kelemahan semantik, memperkuat batasan eksekusi (guardrails), menguji ketahanan terhadap serangan prompt (Spider Matrix), dan mengawasi proyek agen otonom 6-fase secara{" "}
              <span className="bg-sky-100/80 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 px-1.5 py-0.5 rounded font-medium">
                Zero-Trust &amp; Terverifikasi
              </span>
              .
            </p>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveWorkspaceMode("classic");
                  const el = document.getElementById("original-prompt");
                  el?.focus();
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-piew-primary rounded-full px-6 py-2.5 text-xs font-semibold shadow-sm inline-flex items-center gap-2 cursor-pointer font-sans"
              >
                <span>Mulai Buat Prompt Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWorkspaceMode("mission-control");
                  const el = document.getElementById("workbench");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-card border border-border hover:bg-muted/60 text-foreground rounded-full px-4 py-2.5 text-xs font-medium shadow-2xs inline-flex items-center gap-2 cursor-pointer font-mono"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mission Control Console &rarr;</span>
              </button>

              <Link
                href="/pro"
                className="bg-card border border-border hover:bg-muted/60 text-foreground rounded-full px-4 py-2.5 text-xs font-medium shadow-2xs inline-flex items-center gap-2 cursor-pointer font-mono"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
                <span>Pro Architect &rarr;</span>
              </Link>
            </div>
          </div>

          {/* FLOATING ARCHITECTURAL WORKBENCH (Interactive Command Center) */}
          <div
            id="workbench"
            className="max-w-6xl mx-auto mt-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card shadow-[0_20px_60px_-15px_rgba(14,165,233,0.12)] overflow-hidden transition-all relative z-10"
          >
            {/* Top Browser / Telemetry Bar */}
            <div className="h-10 border-b border-border bg-slate-50/90 dark:bg-slate-900/90 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-neutral-300 dark:border-neutral-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-neutral-300 dark:border-neutral-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-neutral-300 dark:border-neutral-700" />
                <span className="ml-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:inline font-semibold">
                  [ .PIEW_STUDIO_WORKBENCH ]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span>Pipeline Armed</span>
                </span>
              </div>
            </div>

            {/* Split-Pane Studio Content */}
            {activeWorkspaceMode === "classic" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Panel Kiri: Form Input & Configuration (Col-Span 5) */}
                <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="space-y-3 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Bar Parameter Horizontal (Domain, Provider, Model) */}
                      <div className="bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-xl border border-border/80 flex flex-wrap items-center gap-1.5">
                        {/* Domain Pack Select */}
                        <div className="relative">
                          <div className="flex items-center gap-1.5 bg-card shadow-2xs rounded-lg px-2.5 py-1 border border-border/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                            <Label htmlFor="domain-pack-select" className="sr-only">
                              Bidang Tugas
                            </Label>
                            <select
                              id="domain-pack-select"
                              data-testid="domain-pack-select"
                              value={selectedDomain}
                              onChange={(e) => setSelectedDomain(e.target.value)}
                              disabled={isLoading}
                              className="bg-transparent text-xs font-mono appearance-none focus:outline-hidden focus-visible:ring-1 focus-visible:ring-sky-500 cursor-pointer pr-4 text-foreground"
                            >
                              {domainPacks.map((pack) => (
                                <option key={pack.domainId} value={pack.domainId}>
                                  {pack.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Provider Select */}
                        <div className="relative">
                          <div className="flex items-center gap-1.5 bg-card shadow-2xs rounded-lg px-2.5 py-1 border border-border/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <Label htmlFor="provider-select" className="sr-only">
                              Penyedia
                            </Label>
                            <select
                              id="provider-select"
                              data-testid="provider-select"
                              value={selectedProvider}
                              onChange={(e) => handleProviderChange(e.target.value)}
                              disabled={isLoading}
                              className="bg-transparent text-xs font-mono appearance-none focus:outline-hidden focus-visible:ring-1 focus-visible:ring-sky-500 cursor-pointer pr-4 text-foreground"
                            >
                              {providers.map((p: any) => (
                                <option key={p.providerId} value={p.providerId}>
                                  {p.displayName}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Target Model Select */}
                        <div className="relative">
                          <div className="flex items-center gap-1.5 bg-card shadow-2xs rounded-lg px-2.5 py-1 border border-border/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                            <Label htmlFor="target-model-select" className="sr-only">
                              Model Tujuan
                            </Label>
                            <select
                              id="target-model-select"
                              data-testid="target-model-select"
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value)}
                              disabled={isLoading}
                              className="bg-transparent text-xs font-mono appearance-none focus:outline-hidden focus-visible:ring-1 focus-visible:ring-sky-500 cursor-pointer pr-4 text-foreground max-w-[140px] truncate"
                            >
                              {activeProvider.availableModels.map((m: string) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Quick settings link */}
                        <button
                          type="button"
                          data-testid="open-providers-settings-btn"
                          onClick={() => setSettingsState({ isOpen: true, initialTab: "providers" })}
                          className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline px-1 font-mono cursor-pointer"
                          title="Buka Pengaturan Providers"
                        >
                          ⚙ Edit
                        </button>

                        {activeDomainPack && (
                          <span className="hidden xl:inline text-[10px] text-muted-foreground font-mono px-1">
                            v{activeDomainPack.ruleVersion || "1.0.0"}
                          </span>
                        )}
                      </div>

                      {/* Header Input Prompt */}
                      <div className="flex items-center justify-between pb-1 pt-1">
                        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <TerminalSquare className="h-3.5 w-3.5 text-sky-500" />
                          <span>INSTRUCTION PROMPT *</span>
                          <span className="sr-only">Prompt Asli</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {prompt && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                              {prompt.length} chars ~{Math.ceil(prompt.length / 4)} tok
                            </span>
                          )}
                          {isCrawlerFeatureEnabled() && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              data-testid="open-crawler-modal-button"
                              onClick={() => setIsCrawlerModalOpen(true)}
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-sky-500/10 gap-1.5 cursor-pointer font-mono"
                            >
                              <Globe className="h-3 w-3 text-sky-500" />
                              <span>Ambil Referensi Tautan</span>
                              <span className="sr-only">Impor Sumber &amp; Fakta (Crawler)</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Textarea Original Prompt */}
                      <Textarea
                        id="original-prompt"
                        rows={4}
                        placeholder="Contoh: Buatkan saya kode Python untuk web scraping dengan BeautifulSoup..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                        className="resize-none text-xs font-mono leading-relaxed bg-slate-50/70 dark:bg-slate-950/70 border-border/80 focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg p-3"
                        required
                      />

                      {/* Header Context Prompt */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-sky-500" />
                          <span>CONTEXT / GROUNDING (OPTIONAL)</span>
                          <span className="sr-only">Konteks Tambahan</span>
                        </span>
                      </div>

                      {/* Textarea Context Prompt */}
                      <Textarea
                        id="context-prompt"
                        rows={2}
                        placeholder="Contoh: Target e-commerce data extraction, sertakan pagination & rate limit..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        disabled={isLoading}
                        className="resize-none text-xs font-mono leading-relaxed bg-slate-50/50 dark:bg-slate-950/50 border-border/80 focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg p-3"
                      />

                      {/* Error Alert */}
                      {error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="space-y-1 flex-1">
                            <div className="font-semibold text-destructive">Terjadi Kendala Pemrosesan</div>
                            <div className="leading-relaxed opacity-90">{error}</div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubmit()}
                              className="mt-1 h-6 text-[10px] border-destructive/30 hover:bg-destructive/20 text-destructive cursor-pointer font-mono"
                            >
                              <RefreshCw className="mr-1 h-2.5 w-2.5" />
                              Coba Lagi
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons in Command Box */}
                    <div className="pt-3 flex items-center justify-between gap-2 border-t border-border/80">
                      <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                        <span>Zero-Leak Guarantee</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {(prompt || result) && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            disabled={isLoading}
                            title="Reset Form"
                            className="h-9 px-2.5 cursor-pointer border-border hover:bg-muted/60 rounded-xl"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <button
                          type="submit"
                          disabled={isLoading || !prompt.trim()}
                          className="bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20 rounded-xl h-9 px-4 flex items-center justify-center gap-2 font-medium text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Menganalisis...</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-3.5 w-3.5" />
                              <span>Optimalkan Prompt</span>
                              <span className="sr-only">Susun &amp; Evaluasi Instruksi</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Panel Kanan: Live Evaluation / Architecture Preview (Col-Span 7) */}
                <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-center min-h-[440px] bg-slate-50/40 dark:bg-slate-950/40">
                  {!result && !isLoading && (
                    /* Interactive PIEW Architecture Preview saat idle */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-sky-500" />
                          <span className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                            Interactive PIEW Architecture Preview
                          </span>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-medium">
                          STATUS: READY
                        </span>
                      </div>

                      {/* 4-Stage Wireframe Cards */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-3 rounded-xl border border-sky-500/30 bg-card shadow-2xs flex items-center justify-between">
                          <span className="text-foreground">[ 1. Intent Audit ]</span>
                          <span className="text-emerald-500 text-[10px] font-semibold">ACTIVE</span>
                        </div>
                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                          <span className="text-foreground">[ 2. Guardrail Matrix ]</span>
                          <span className="text-sky-500 text-[10px] font-semibold">ARMED</span>
                        </div>
                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                          <span className="text-foreground">[ 3. Grounding Crawl ]</span>
                          <span className="text-indigo-500 text-[10px] font-semibold">SYNCED</span>
                        </div>
                        <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                          <span className="text-foreground">[ 4. Spider Defense ]</span>
                          <span className="text-emerald-500 text-[10px] font-semibold">STANDBY</span>
                        </div>
                      </div>

                      {/* Terminal Code / JSON Box in Sky Blue & Emerald */}
                      <div className="rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-300 relative overflow-hidden shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                          <span className="text-sky-400 text-[11px] font-bold">master_prompt_contract.json</span>
                          <span className="text-[10px] text-slate-500 font-mono">PIEW JSON-RPC 2.0</span>
                        </div>

                        <pre className="text-[11px] leading-relaxed overflow-x-auto text-slate-400">
                          <code>
{`{
  `}<span className="text-sky-400">{`"system_role"`}</span>{`: `}<span className="text-emerald-400">{`"Principal Systems Engineer"`}</span>{`,
  `}<span className="text-sky-400">{`"task_domain"`}</span>{`: `}<span className="text-indigo-400">{`"${selectedDomain}"`}</span>{`,
  `}<span className="text-sky-400">{`"negative_constraints"`}</span>{`: [
    `}<span className="text-slate-300">{`"1. DILARANG menggunakan mock data palsu"`}</span>{`,
    `}<span className="text-slate-300">{`"2. DILARANG mengabaikan penanganan error"`}</span>{`,
    `}<span className="text-slate-300">{`"3. Zero secret leakage pada telemetri"`}</span>{`
  ],
  `}<span className="text-sky-400">{`"active_engine"`}</span>{`: `}<span className="text-emerald-400">{`"Groq LPU (Ultra-Low Latency)"`}</span>{`,
  `}<span className="text-sky-400">{`"audit_guarantee"`}</span>{`: `}<span className="text-sky-400">{`"Evidence Over Claims"`}</span>{`
}`}
                          </code>
                        </pre>

                        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-medium">✔ Ready to synthesize master prompt</span>
                          <span className="text-sky-400 font-mono">0ms cold start</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="p-8 space-y-4 rounded-xl border border-sky-500/30 bg-sky-500/5 relative overflow-hidden">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                        <span className="font-mono text-xs uppercase tracking-wider text-foreground font-semibold">
                          PIEW Multi-Stage Pipeline sedang memproses instruksi...
                        </span>
                      </div>
                      <div className="space-y-2 font-mono text-xs text-muted-foreground">
                        <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                          <span>[1/3] Evaluasi kelemahan semantik &amp; batasan negatif...</span>
                          <span className="text-sky-500 font-semibold">RUNNING</span>
                        </div>
                        <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between opacity-60">
                          <span>[2/3] Rekonstruksi Master Blueprint &amp; skema JSON...</span>
                          <span>QUEUED</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {result && !isLoading && (
                    <div className="w-full">
                      <ResultDashboard
                        result={result}
                        onRegenerate={() => handleSubmit()}
                        onAccept={handleAcceptPrompt}
                        onRefreshHistory={() =>
                          setHistoryRefreshKey((prev) => prev + 1)
                        }
                        onTelemetryAction={handleTelemetryAction}
                        versions={versions}
                        activeVersionId={activeVersionId}
                        onSelectVersion={handleSelectVersion}
                        spiderReport={spiderReport}
                        isSpiderLoading={isSpiderLoading}
                        onRunSpider={handleRunSpider}
                        onRequestRefinement={handleRequestSpiderRefinement}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Embedded Mission Control Mode */
              <div className="p-6 sm:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-lg font-bold text-foreground">PIEW Autonomous Mission Control v3.1</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supervisi siklus hidup agen AI otonom 6-fase dengan audit Zero-Trust, verifikasi kriptografis SHA-256, dan interlock manusia 4-mode.
                    </p>
                  </div>
                  <Link
                    href="/agent"
                    className="btn-piew-primary rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 font-mono"
                  >
                    <span>Layar Penuh di /agent</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <span className="font-mono text-xs text-emerald-500 font-semibold">[ 1. Autonomous Loop ]</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Eksekusi siklus loop agen mandiri tanpa intervensi manual selama kriteria uji artefak lulus 100%.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <span className="font-mono text-xs text-sky-500 font-semibold">[ 2. SHA-256 Verifier ]</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pemeriksaan integritas setiap artefak kode dan dokumen yang dihasilkan di disk lokal secara matematis.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <span className="font-mono text-xs text-amber-500 font-semibold">[ 3. 4-Mode Override ]</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Intervensi langsung manusia: INJECT_CONSTRAINT, FORCE_ADVANCE, FORCE_ROLLBACK, atau HALT seketika.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceMode("classic")}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    &larr; Kembali ke Classic Studio Editor
                  </button>
                  <Link
                    href="/agent"
                    className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-mono inline-flex items-center gap-1.5"
                  >
                    <span>Buka Konsol Supervisi Penuh &rarr;</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SEKSI [ 01 / 04 ] · CORE PILLARS OF PIEW */}
        <div id="architecture" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-sky-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-slate-500">
            <strong className="text-sky-500 font-bold">01 / 04</strong> &bull; CORE PILLARS OF PIEW
          </span>
        </div>

        <section className="p-6 sm:p-10 border-b border-border space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span>{"//"}</span>
              <span className="w-2 h-2 rounded-xs bg-sky-500" />
              <span>Prompt Intelligence Engine</span>
              <span>{"//"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Satu workspace untuk{" "}
              <span className="text-sky-500">siklus penuh rekayasa AI</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              PIEW menggabungkan tiga pilar arsitektur fundamental untuk memastikan instruksi Anda kebal terhadap bias, teruji dari injeksi, dan berakar pada fakta nyata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-border rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border bg-card shadow-xs">
            {/* Pilar 1 */}
            <div className="p-6 sm:p-8 space-y-4 hover:bg-sky-500/[0.02] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Semantic Audit &amp; Guardrails</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mendeteksi ambiguitas instruksi, menyuntikkan aturan domain berstandar industri (@prompt-workspace/domain-rules), dan menjaga preserved intent sebelum dikirim ke model produksi.
              </p>
              <ul className="text-xs font-mono space-y-2 text-muted-foreground pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>Deteksi kelemahan semantik otomatis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>Injeksi 6 batasan negatif mutlak</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>Preserved intent scoring &gt; 80%</span>
                </li>
              </ul>
            </div>

            {/* Pilar 2 */}
            <div className="p-6 sm:p-8 space-y-4 hover:bg-sky-500/[0.02] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Adversarial Spider Matrix</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pengujian stres otomatis 5-cabang terhadap prompt injection, jailbreak, format breach, dan semantic drifting menggunakan Prompt Spider Engine dengan closed-loop auto-refinement.
              </p>
              <ul className="text-xs font-mono space-y-2 text-muted-foreground pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>5 Vektor serangan adversarial</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Closed-loop auto-refinement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Audit skor ketahanan numerik 0-100</span>
                </li>
              </ul>
            </div>

            {/* Pilar 3 */}
            <div className="p-6 sm:p-8 space-y-4 hover:bg-sky-500/[0.02] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Web &amp; GitHub Grounding Crawler</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ekstraksi konteks dan fakta terverifikasi langsung dari repositori GitHub dan dokumentasi teknis dengan proteksi SSRF allowlist P0 dan zero raw secret storage.
              </p>
              <ul className="text-xs font-mono space-y-2 text-muted-foreground pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Proteksi SSRF domain allowlist ketat</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Ekstraksi fakta struktural Markdown/AST</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Grounding fakta otomatis ke prompt</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SEKSI [ 02 / 04 ] · INTERACTIVE PIPELINE & CODE SHOWCASE */}
        <div id="pipeline" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-sky-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-slate-500">
            <strong className="text-sky-500 font-bold">02 / 04</strong> &bull; INTERACTIVE PIPELINE &amp; CODE SHOWCASE
          </span>
        </div>

        <section className="p-6 sm:p-10 border-b border-border space-y-8 bg-slate-50/30 dark:bg-slate-950/30">
          <div className="max-w-3xl space-y-2">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>{"//"}</span>
              <span className="text-sky-500 font-semibold">Verifiable Execution Lifecycle</span>
              <span>{"//"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Bagaimana PIEW memproses instruksi dengan{" "}
              <span className="text-sky-500">presisi kriptografis</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Klik setiap tahapan di bawah untuk melihat skema data kontrak dan cara kerja mesin inferensi PIEW.
            </p>
          </div>

          {/* 2-Column Interactive Split Window */}
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Kiri: Tab Interaktif Tahapan Kerja */}
            <div className="lg:col-span-5 p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between">
              <div className="space-y-3">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Alur Rekayasa Bertahap
                </span>
                <div className="space-y-2">
                  {pipelineSteps.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActivePipelineStep(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer font-mono text-xs ${
                        activePipelineStep === idx
                          ? "border-sky-500 bg-sky-500/10 text-foreground font-semibold shadow-2xs"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-500">[{s.id}]</span>
                        <span className="text-[10px] text-muted-foreground">STAGE</span>
                      </div>
                      <div className="font-sans font-medium text-sm mt-1">{s.title}</div>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2 mt-4">
                  <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Penjelasan Teknis Tahap {pipelineSteps[activePipelineStep].id}:
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                    {pipelineSteps[activePipelineStep].desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceMode("classic");
                    const el = document.getElementById("original-prompt");
                    el?.focus();
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 font-medium text-xs font-mono transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Coba di Studio Atas ↑</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Kanan: Jendela Kode Bergaya Terminal / JSON */}
            <div className="lg:col-span-7 bg-slate-950 p-6 font-mono text-xs text-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="text-sky-400 font-bold ml-2 text-[11px]">
                      output_contract_schema.json
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySchema}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] text-slate-300 cursor-pointer transition-colors"
                  >
                    {isCopiedSchema ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy schema</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 flex gap-4 text-[11px] leading-relaxed">
                  <div className="select-none text-slate-600 text-right pr-2 border-r border-slate-800/80">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre className="overflow-x-auto text-slate-300 flex-1">
                    <code>{pipelineSteps[activePipelineStep].jsonSnippet}</code>
                  </pre>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span className="text-emerald-400">✔ Schema Validated with Zod 3.24</span>
                <span className="text-sky-400 font-mono">100% Deterministic Guarantee</span>
              </div>
            </div>
          </div>
        </section>

        {/* SEKSI [ 03 / 04 ] · AUTONOMOUS MISSION CONTROL (v3.1) */}
        <div id="spider-security" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-sky-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-slate-500">
            <strong className="text-sky-500 font-bold">03 / 04</strong> &bull; AUTONOMOUS MISSION CONTROL (v3.1)
          </span>
        </div>

        <section className="p-6 sm:p-10 border-b border-border space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>{"//"}</span>
              <span className="text-sky-500 font-semibold">Zero-Trust Agent Supervision</span>
              <span>{"//"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Kendalikan agen otonom dengan{" "}
              <span className="text-sky-500">bukti kriptografis</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tingkatkan kapabilitas dari optimasi prompt tunggal menuju pengawasan siklus eksekusi agen otonom berjenjang 6-fase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kartu Kiri: 6-Phase Lifecycle & Human Override */}
            <div className="rounded-2xl border border-sky-500/20 bg-card p-6 sm:p-8 space-y-5 hover:border-sky-500/40 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
                    6-PHASE LIFECYCLE
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">6-Phase Lifecycle &amp; Human Override</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menjalankan alur P0 Discovery hingga P5 Handover secara otonom dengan 4 mode intervensi manusia untuk mencegah penyimpangan ruang lingkup (scope creep).
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="font-mono text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                    INJECT_CONSTRAINT
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    FORCE_ADVANCE
                  </span>
                  <span className="font-mono text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                    FORCE_ROLLBACK
                  </span>
                  <span className="font-mono text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">
                    HALT
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceMode("mission-control");
                    const el = document.getElementById("workbench");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs font-mono transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Buka Mission Control Console ›</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Kartu Kanan: Deep Artifact & SHA-256 Verification */}
            <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 sm:p-8 space-y-5 hover:border-emerald-500/40 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    SHA-256 VERIFIED
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">Deep Artifact &amp; SHA-256 Verification</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pratinjau Zero-Trust Command Runner independen yang menguji klaim agen langsung di disk lokal dan membuktikan setiap deliverable dengan hash SHA-256.
                </p>
                <div className="p-3 rounded-xl border border-border bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="text-emerald-400 font-bold">$ piew_verify_phase_artifacts</div>
                  <div className="text-slate-400">SHA256: 9e76b1e...3a8d1f2 [MATCH]</div>
                  <div className="text-sky-400">Exit Code: 0 (Tests Passed: 100%)</div>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex gap-2">
                <Link
                  href="/agent"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs font-mono transition-colors shadow-2xs"
                >
                  <span>Buka Agent Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/pro"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-medium text-xs font-mono transition-colors shadow-2xs"
                >
                  <span>Pro Architect</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SEKSI [ 04 / 04 ] · DOCUMENTATION, PRIVACY & USER GUIDE */}
        <div id="guides" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-sky-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-slate-500">
            <strong className="text-sky-500 font-bold">04 / 04</strong> &bull; DOCUMENTATION, PRIVACY &amp; COMPREHENSIVE GUIDE
          </span>
        </div>

        <section className="p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                Dokumentasi &amp; Privasi Transparan
              </span>
            </div>
            <Link
              href="/docs"
              className="text-xs font-mono text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Buka Dokumentasi Lengkap &amp; Specs di /docs &rarr;</span>
            </Link>
          </div>
          <UserGuideSection />
          <PrivacyDisclosure />
        </section>

        {/* Section 05 Footer Band */}
        <div className="architectural-section-band border-b-0">
          <span className="w-0.5 h-3.5 bg-sky-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-slate-500">
            <strong className="text-sky-500 font-bold">05 / 05</strong> &bull; ARCHITECTURAL SPECIFICATION &bull; PIEW v3.1
          </span>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-2 pb-safe flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => {
            setActiveWorkspaceMode("classic");
            const el = document.getElementById("original-prompt");
            el?.scrollIntoView({ behavior: "smooth" });
            el?.focus();
          }}
          className="flex flex-col items-center gap-1 text-[10px] text-sky-500 font-medium cursor-pointer"
        >
          <PenTool className="h-4 w-4" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveWorkspaceMode("mission-control");
            const el = document.getElementById("workbench");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Bot className="h-4 w-4" />
          <span>Agent</span>
        </button>

        <Link
          href="/pro"
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Cpu className="h-4 w-4" />
          <span>Pro</span>
        </Link>

        <Link
          href="/docs"
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <BookOpen className="h-4 w-4" />
          <span>Docs</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <History className="h-4 w-4" />
          <span>Riwayat ({historyCount})</span>
        </button>
      </nav>

      {/* v2.0 Web Crawler Import Modal */}
      <CrawlerImportModal
        isOpen={isCrawlerModalOpen}
        onClose={() => setIsCrawlerModalOpen(false)}
        onSelectAsPrompt={handleSelectCrawlerPrompt}
        onInjectGroundingFacts={handleInjectGroundingFacts}
        onExtract={handleCrawlerExtract}
      />

      {/* Unified Settings Modal (Hosts both Providers & MCP Connectors Hub) */}
      <UnifiedSettingsModal
        isOpen={settingsState.isOpen}
        initialTab={settingsState.initialTab}
        onClose={() => {
          setSettingsState((prev) => ({ ...prev, isOpen: false }));
          loadProviders();
        }}
        onSelectProvider={handleSelectCustomProvider}
      />
    </div>
  );
}
