"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { ThemeToggle } from "@/components/theme-toggle";
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
import { BlueprintStudio } from "@/components/mission-control/blueprint-studio";
import { SupervisionConsole } from "@/components/mission-control/supervision-console";
import { ProvidersSettingsModal } from "@/components/workspace/providers-settings-panel";
import {
  TerminalSquare,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sliders,
  RefreshCw,
  Cpu,
  History,
  Layers,
  Globe,
  PenTool,
  ChevronDown,
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
  const [isProvidersSettingsOpen, setIsProvidersSettingsOpen] = useState(false);

  // Mode Navigasi Tab Teratas: Mission Control (v3.1) vs Classic Studio (v2.0)
  const [activeMainTab, setActiveMainTab] = useState<"mission-control" | "classic">("classic");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "mission-control") {
        setActiveMainTab("mission-control");
      }
    }
  }, []);

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

  // North-Star & Stage 7 Privacy-Safe Telemetry State (Blueprint Bagian 13 & 18.1)
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

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground/15 selection:text-foreground flex flex-col pb-16 md:pb-6">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleSelectHistoryPrompt}
        refreshKey={historyRefreshKey}
        onCountChange={setHistoryCount}
      />

      {/* 1.5 Baris Ramping: Unified Workstation Topbar */}
      <header className="w-full border-b border-border/80 bg-background/95 backdrop-blur-md sticky top-0 z-30 h-12 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded border border-border/80 bg-muted/40 flex items-center justify-center text-foreground font-semibold">
              <TerminalSquare className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-foreground flex items-center gap-1.5">
              Prompt Intelligence Workspace
            </span>
            <span className="text-[10px] text-muted-foreground font-mono border border-border/70 px-1.5 py-0.2 rounded bg-muted/40 hidden sm:inline-block">
              v3.1
            </span>
          </div>

          <span className="text-border/80 hidden sm:inline">/</span>

          {/* Integrated Segmented Tab Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60">
            <button
              type="button"
              data-testid="tab-mission-control"
              onClick={() => setActiveMainTab("mission-control")}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeMainTab === "mission-control"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="w-3 h-3 text-amber-500" />
              <span className="hidden md:inline">🏛 Autonomous Mission Control (v3.1)</span>
              <span className="md:hidden">Mission Control</span>
            </button>
            <button
              type="button"
              data-testid="tab-classic-studio"
              onClick={() => setActiveMainTab("classic")}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeMainTab === "classic"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenTool className="w-3 h-3 text-sky-500" />
              <span className="hidden md:inline">⚡ Classic Studio (v2.0)</span>
              <span className="md:hidden">Studio</span>
            </button>
          </div>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-2">
          {/* Engine Status Dot */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground pr-2 border-r border-border/60">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Groq LPUs Aktif</span>
          </div>

          {/* Providers Settings Button */}
          <Button
            variant="outline"
            size="sm"
            data-testid="open-providers-settings-button"
            onClick={() => setIsProvidersSettingsOpen(true)}
            className="h-7 text-xs gap-1.5 cursor-pointer border-border/80 hover:bg-muted/60 px-2.5 font-mono"
            title="Pengaturan Penyedia AI, API Keys & Custom Endpoints"
          >
            <Sliders className="h-3 w-3 text-amber-500" />
            <span className="hidden sm:inline">Providers</span>
          </Button>

          {/* History Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-7 text-xs gap-1.5 cursor-pointer border-border/80 hover:bg-muted/60 px-2.5 font-mono"
          >
            <History className="h-3 w-3 text-muted-foreground" />
            <span>Riwayat</span>
            {historyCount > 0 && (
              <span className="font-mono text-[10px] bg-secondary text-secondary-foreground rounded px-1.5 py-0.2 ml-0.5">
                {historyCount}
              </span>
            )}
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Sub-header Status Bar / Trace Ribbon */}
      <TelemetrySummaryBar metrics={telemetry} />

      {/* Main Container */}
      <main className="w-full max-w-[1680px] mx-auto px-4 py-4 space-y-4 flex-1">
        {activeMainTab === "mission-control" ? (
          <div className="space-y-6">
            <BlueprintStudio />
            <SupervisionConsole />
          </div>
        ) : (
          /* Workstation Split-Pane Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Panel Kiri: Form Input & Parameter (5 Kolom) */}
            <section className="lg:col-span-5 space-y-3">
              {/* Parameter Toolbar (Vercel AI Playground-style) */}
              <div className="rounded-lg border border-border/80 bg-card/60 p-3 space-y-2.5 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 1. Domain Pack Select */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="domain-pack-select"
                      className="font-medium text-[11px] text-muted-foreground flex items-center gap-1"
                    >
                      <Layers className="h-3 w-3 text-primary" />
                      <span>Bidang Tugas</span>
                    </Label>
                    <div className="relative">
                      <select
                        id="domain-pack-select"
                        data-testid="domain-pack-select"
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        disabled={isLoading}
                        className="w-full h-8 rounded-md border border-border/80 bg-background/80 px-2.5 pr-7 text-xs font-mono appearance-none focus:outline-hidden focus:ring-1 focus:ring-foreground/20 cursor-pointer"
                      >
                        {domainPacks.map((pack) => (
                          <option key={pack.domainId} value={pack.domainId}>
                            {pack.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* 2. Provider Select */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="provider-select"
                      className="font-medium text-[11px] text-muted-foreground flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span>Penyedia</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsProvidersSettingsOpen(true)}
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5 cursor-pointer font-mono"
                        title="Atur Kunci & Custom Endpoints"
                      >
                        <span>Atur</span>
                        <Sliders className="h-2.5 w-2.5" />
                      </button>
                    </Label>
                    <div className="relative">
                      <select
                        id="provider-select"
                        data-testid="provider-select"
                        value={selectedProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full h-8 rounded-md border border-border/80 bg-background/80 px-2.5 pr-7 text-xs font-mono appearance-none focus:outline-hidden focus:ring-1 focus:ring-foreground/20 cursor-pointer"
                      >
                        {providers.map((p: any) => (
                          <option key={p.providerId} value={p.providerId}>
                            {p.displayName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* 3. Target Model Select */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="target-model-select"
                      className="font-medium text-[11px] text-muted-foreground flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1">
                        <Sliders className="h-3 w-3 text-primary" />
                        <span>Model Tujuan</span>
                      </span>
                      <button
                        type="button"
                        data-testid="open-providers-settings-btn"
                        onClick={() => setIsProvidersSettingsOpen(true)}
                        className="text-[10px] text-amber-500 hover:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-mono"
                        title="Buka Pengaturan Providers"
                      >
                        <span>⚡ Providers</span>
                      </button>
                    </Label>
                    <div className="relative">
                      <select
                        id="target-model-select"
                        data-testid="target-model-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isLoading}
                        className="w-full h-8 rounded-md border border-border/80 bg-background/80 px-2.5 pr-7 text-xs font-mono appearance-none focus:outline-hidden focus:ring-1 focus:ring-foreground/20 cursor-pointer"
                      >
                        {activeProvider.availableModels.map((m: string) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {activeDomainPack && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground font-mono">
                    <span className="truncate max-w-[280px]">{activeDomainPack.description}</span>
                    <span className="text-foreground font-semibold shrink-0">v{activeDomainPack.ruleVersion || "1.0.0"}</span>
                  </div>
                )}
              </div>

              {/* Code-Like Prompt Editor Workbench */}
              <div className="rounded-lg border border-border/80 bg-card/60 p-3.5 space-y-3 shadow-2xs">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
                  {/* Header Bar above Original Prompt */}
                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                      <TerminalSquare className="h-3.5 w-3.5 text-primary" />
                      <span>INSTRUCTION PROMPT *</span>
                      <span className="sr-only">Prompt Asli</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {prompt && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.2 rounded border border-border/50">
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
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1 cursor-pointer font-mono"
                        >
                          <Globe className="h-3 w-3" />
                          <span>Ambil Referensi Tautan</span>
                          <span className="sr-only">Impor Sumber &amp; Fakta (Crawler)</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <Textarea
                    id="original-prompt"
                    rows={result ? 5 : 7}
                    placeholder="Contoh: Buatkan saya kode Python untuk web scraping..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    className="resize-y text-xs font-mono leading-relaxed bg-zinc-950/40 dark:bg-zinc-950/80 border-border/80 focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-md"
                    required
                  />

                  {/* Header Bar above Context Prompt */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>CONTEXT / GROUNDING (OPTIONAL)</span>
                      <span className="sr-only">Konteks Tambahan</span>
                    </span>
                  </div>

                  <Textarea
                    id="context-prompt"
                    rows={result ? 2 : 3}
                    placeholder="Contoh: Target e-commerce data extraction, gunakan BeautifulSoup..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    disabled={isLoading}
                    className="resize-y text-xs font-mono leading-relaxed bg-zinc-950/30 dark:bg-zinc-950/60 border-border/80 focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-md"
                  />

                  {/* Error Notification Alert */}
                  {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={isLoading || !prompt.trim()}
                      className="flex-1 h-9 text-xs font-medium cursor-pointer bg-foreground text-background hover:bg-foreground/90 transition-opacity shadow-none rounded-md"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Sedang menganalisis kebutuhan dan menyusun instruksi...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-3.5 w-3.5" />
                          <span>Susun &amp; Evaluasi Instruksi</span>
                          <span className="sr-only">Analisis &amp; Optimasi</span>
                        </>
                      )}
                    </Button>

                    {(prompt || result) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={isLoading}
                        title="Reset Form"
                        className="h-9 px-3 cursor-pointer border-border/80 hover:bg-muted/60 rounded-md"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </section>

            {/* Panel Kanan: Evaluasi, Diff, Matrix & Playground (7 Kolom) */}
            <section className="lg:col-span-7 space-y-4">
              {!result && !isLoading && (
                <div className="rounded-lg border border-border/80 bg-card/40 p-6 space-y-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-muted/60 border border-border/70 flex items-center justify-center text-primary">
                        <PenTool className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono">
                          Pipeline Execution Workspace
                          <span className="sr-only">Belum Ada Hasil Analisis</span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Audit semantik, injeksi guardrail, dan evaluasi ketahanan model produksi.
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/80">
                      IDLE READY
                    </Badge>
                  </div>

                  {/* 3 Pipeline Stage Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-md border border-border/70 bg-muted/20 space-y-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground block font-semibold">STAGE 01</span>
                      <span className="font-semibold text-foreground text-xs block">Semantic Audit</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Deteksi ambiguitas, missing constraints, dan celah salah tafsir maksud.
                      </p>
                    </div>

                    <div className="p-3 rounded-md border border-border/70 bg-muted/20 space-y-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground block font-semibold">STAGE 02</span>
                      <span className="font-semibold text-foreground text-xs block">Guardrail Injection</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Penataan format terstruktur, pembatasan negatif, dan token placeholders.
                      </p>
                    </div>

                    <div className="p-3 rounded-md border border-border/70 bg-muted/20 space-y-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground block font-semibold">STAGE 03</span>
                      <span className="font-semibold text-foreground text-xs block">Adversarial Spider</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Pengujian ketahanan 5 kategori stres uji sebelum deployment model.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-md border border-border/50 bg-zinc-950/40 dark:bg-zinc-950/60 font-mono text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Ketik instruksi di editor lalu klik &quot;Susun &amp; Evaluasi Instruksi&quot;</span>
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Zero Leak Engine
                    </span>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="rounded-lg border border-border/80 bg-card/40 p-6 space-y-5 animate-pulse shadow-2xs">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono">
                        Sedang Menganalisis Kebutuhan &amp; Menyusun Instruksi...
                        <span className="sr-only">Menjalankan Pipeline Engine via Groq LLM...</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Pipeline berantai multi-tahap sedang memproses token instruksi.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 font-mono text-xs text-muted-foreground">
                    <div className="p-2.5 rounded border border-border/60 bg-muted/20 flex items-center justify-between">
                      <span>[1/3] Evaluasi kelemahan semantik &amp; verifikasi batasan...</span>
                      <span className="text-emerald-500 font-semibold">RUNNING</span>
                    </div>
                    <div className="p-2.5 rounded border border-border/60 bg-muted/20 flex items-center justify-between opacity-70">
                      <span>[2/3] Rekonstruksi Master Prompt &amp; validasi intent...</span>
                      <span className="text-muted-foreground">QUEUED</span>
                    </div>
                    <div className="p-2.5 rounded border border-border/60 bg-muted/20 flex items-center justify-between opacity-50">
                      <span>[3/3] Penyiapan Spider robustness benchmark...</span>
                      <span className="text-muted-foreground">PENDING</span>
                    </div>
                  </div>
                </div>
              )}

              {result && !isLoading && (
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
              )}
            </section>
          </div>
        )}

        {/* Footer: Privacy Disclosure & User Guide Documentation */}
        <footer className="pt-6 border-t border-border/60 space-y-4">
          <PrivacyDisclosure />
          <UserGuideSection />
        </footer>
      </main>

      {/* Mobile / APK Bottom Navigation Bar (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-md border-t border-border/80 px-4 py-2 pb-safe flex items-center justify-around">
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <PenTool className="h-4 w-4" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("original-prompt");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Sliders className="h-4 w-4" />
          <span>Parameter</span>
        </button>

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

      {/* Settings > Providers Modal */}
      <ProvidersSettingsModal
        isOpen={isProvidersSettingsOpen}
        onClose={() => {
          setIsProvidersSettingsOpen(false);
          loadProviders();
        }}
        onSelectProvider={handleSelectCustomProvider}
      />
    </div>
  );
}
