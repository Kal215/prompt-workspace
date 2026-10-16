"use client";

import { useState, useEffect, useCallback } from "react";
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
import { McpConnectorsModal } from "@/components/workspace/mcp-connectors-panel";
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
  Plug,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Compass,
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
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#FF4D00]/20 selection:text-foreground flex flex-col font-sans firecrawl-grid-bg relative">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleSelectHistoryPrompt}
        refreshKey={historyRefreshKey}
        onCountChange={setHistoryCount}
      />

      {/* Firecrawl Architectural Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 w-full bg-background/85 backdrop-blur-md border-b border-border px-3 sm:px-6 flex items-center justify-between overflow-x-auto sm:overflow-x-visible no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#FF4D00] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-base tracking-tight text-foreground whitespace-nowrap">
                Prompt Intelligence Workspace
              </span>
              <span className="text-[10px] text-neutral-500 font-mono border border-border px-1.5 py-0.5 rounded bg-muted/60 hidden sm:inline-block">
                v3.1
              </span>
            </div>
          </div>

          <span className="text-border hidden md:inline">/</span>

          {/* Mode Switcher Nav */}
          <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-muted/70 border border-border shrink-0">
            <button
              type="button"
              data-testid="tab-classic-studio"
              onClick={() => setActiveMainTab("classic")}
              className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                activeMainTab === "classic"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
              <span className="hidden md:inline">⚡ Classic Studio (v2.0)</span>
              <span className="md:hidden">Studio</span>
            </button>
            <button
              type="button"
              data-testid="tab-mission-control"
              onClick={() => setActiveMainTab("mission-control")}
              className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                activeMainTab === "mission-control"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">🏛 Mission Control (v3.1)</span>
              <span className="md:hidden">Mission</span>
            </button>
          </div>

          {/* Quick Jump Links */}
          <nav className="hidden lg:flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <a href="#studio" className="hover:text-foreground transition-colors">
              {"// Studio"}
            </a>
            <a href="#mission" className="hover:text-foreground transition-colors">
              {"// Mission"}
            </a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">
              {"// Specs"}
            </a>
            <a href="#docs" className="hover:text-foreground transition-colors">
              {"// Docs"}
            </a>
          </nav>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-2">
          {/* Engine Status Dot */}
          <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-muted-foreground px-2.5 py-1 rounded-md bg-muted/40 border border-border">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FF4D00] animate-pulse" />
            <span>Groq LPUs Aktif</span>
          </div>

          {/* Providers Settings Button */}
          <Button
            variant="outline"
            size="sm"
            data-testid="open-providers-settings-button"
            onClick={() => setIsProvidersSettingsOpen(true)}
            className="h-8 text-xs gap-1 cursor-pointer border-border hover:bg-muted/80 px-2 sm:px-3 font-mono rounded-lg"
            title="Pengaturan Penyedia AI, API Keys & Custom Endpoints"
          >
            <Sliders className="h-3.5 w-3.5 text-[#FF4D00]" />
            <span className="hidden sm:inline">Providers</span>
          </Button>

          {/* MCP Connectors Hub Button */}
          <Button
            variant="outline"
            size="sm"
            data-testid="mcp-connectors-tab"
            onClick={() => setIsMcpModalOpen(true)}
            className="h-8 text-xs gap-1 cursor-pointer border-border hover:bg-muted/80 px-2 sm:px-3 font-mono rounded-lg"
            title="Model Context Protocol (MCP) Connectors Hub"
          >
            <Plug className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Connectors</span>
          </Button>

          {/* History Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-8 text-xs gap-1 cursor-pointer border-border hover:bg-muted/80 px-2 sm:px-3 font-mono rounded-lg"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Riwayat</span>
            <span className="font-mono text-[11px] bg-secondary text-secondary-foreground rounded-full px-1.5 py-0.2 ml-0.5">
              {historyCount}
            </span>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Telemetry Summary Ribbon */}
      <TelemetrySummaryBar metrics={telemetry} />

      {/* Architectural Grid Master Frame Container */}
      <div className="w-full max-w-[1320px] mx-auto border-x border-border bg-background flex-1 flex flex-col relative shadow-[0_0_80px_rgba(0,0,0,0.02)]">
        
        {/* Sparkle Crosshair Pins at Container Corners */}
        <div className="absolute -top-4 -left-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-2xs text-[#FF4D00]">
          ✦
        </div>
        <div className="absolute -top-4 -right-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-2xs text-[#FF4D00]">
          ✦
        </div>

        {/* Hero Section (Firecrawl High-Contrast Dual-Tone & Grid Backing) */}
        <section id="hero" className="relative pt-12 pb-8 sm:pt-16 sm:pb-12 px-4 sm:px-8 border-b border-border overflow-hidden">
          
          {/* Subtle ASCII / Dot-Matrix Background Texture */}
          <div className="absolute inset-0 opacity-[0.14] font-mono text-[8px] leading-tight select-none pointer-events-none p-4 overflow-hidden text-neutral-500 dark:text-neutral-400">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap">
                + · : · + . : · + · : · + . : · + · : · + . : · + · : · + . : · [PIEW_CORE_MATRIX] · + · : · + . : · + · : · + . : · + · : · + . : · +
              </div>
            ))}
          </div>

          {/* Side Matrix Grid Decorations */}
          <div className="hidden xl:block absolute top-12 left-6 border border-border/80 w-24 h-24 p-2 bg-card/60 backdrop-blur-xs rounded-lg">
            <div className="w-full h-full border border-dashed border-border/70 flex items-center justify-center relative">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="absolute bottom-1 left-1 font-mono text-[8px] text-muted-foreground">[ .JSON ]</span>
            </div>
          </div>

          <div className="hidden xl:block absolute top-12 right-6 border border-border/80 w-24 h-24 p-2 bg-card/60 backdrop-blur-xs rounded-lg">
            <div className="w-full h-full border border-dashed border-border/70 flex items-center justify-center relative">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <span className="absolute bottom-1 right-1 font-mono text-[8px] text-muted-foreground">[ .MD ]</span>
            </div>
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-4">
            {/* Top Promo/Version Pill */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-border px-3 sm:px-3.5 py-1 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300 shadow-2xs max-w-full">
              <span className="font-mono text-[#FF4D00] font-bold shrink-0">PIEW Engine v3.1</span>
              <span className="truncate">— Autonomous Supervision &amp; Guardrails</span>
              <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] ml-0.5 shrink-0">
                →
              </span>
            </div>

            {/* Section Eyebrow Badge */}
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span>{"//"}</span>
              <span className="w-2 h-2 rounded-xs bg-[#FF4D00]" />
              <span>Prompt Intelligence Workspace</span>
              <span>{"//"}</span>
            </div>

            {/* Editorial Dual-Tone Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-bold tracking-[-0.035em] leading-[1.08] text-neutral-900 dark:text-neutral-50">
              Power AI agents with <br />
              <span className="text-[#FF4D00]">verified master prompts</span>
            </h1>

            {/* Sub-headline with Highlighted Spans */}
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Transform raw instructions into production-grade prompts with{" "}
              <span className="bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-1.5 py-0.5 rounded-sm font-medium">
                zero semantic hallucinations
              </span>
              , strict negative constraints, and{" "}
              <span className="bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-1.5 py-0.5 rounded-sm font-medium">
                multi-turn adversarial defense
              </span>
              .
            </p>

            {/* Quick Action CTA Pill Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("original-prompt");
                  el?.focus();
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-firecrawl-primary rounded-full px-6 py-2.5 text-xs font-semibold shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Mulai Buat Prompt Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMainTab(activeMainTab === "classic" ? "mission-control" : "classic");
                }}
                className="bg-card border border-border hover:bg-muted/60 text-foreground rounded-full px-4 py-2.5 text-xs font-medium shadow-2xs inline-flex items-center gap-2 cursor-pointer font-mono"
              >
                <Compass className="w-3.5 h-3.5 text-[#FF4D00]" />
                <span>Mode: {activeMainTab === "classic" ? "Classic Studio (v2.0)" : "Mission Control (v3.1)"}</span>
              </button>
            </div>
          </div>

          {/* Floating Interactive Command Box (Hero Core Center) */}
          <div id="studio" className="mt-10 max-w-3xl mx-auto bg-card rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-3 sm:p-5 transition-all focus-within:border-[#FF4D00]/50 focus-within:shadow-[0_20px_60px_rgba(255,77,0,0.08)] relative z-10">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
              {/* Top Bar inside Command Box */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                  <TerminalSquare className="h-3.5 w-3.5 text-[#FF4D00]" />
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
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1.5 cursor-pointer font-mono"
                    >
                      <Globe className="h-3 w-3 text-[#FF4D00]" />
                      <span>Ambil Referensi Tautan</span>
                      <span className="sr-only">Impor Sumber &amp; Fakta (Crawler)</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Textarea Instruction */}
              <Textarea
                id="original-prompt"
                rows={result ? 4 : 5}
                placeholder="Contoh: Buatkan saya kode Python untuk web scraping dengan BeautifulSoup..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="resize-none sm:resize-y text-xs font-mono leading-relaxed bg-neutral-50/70 dark:bg-zinc-950/70 border-border/80 focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40 rounded-lg p-3"
                required
              />

              {/* Context Prompt Bar */}
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-border/80">
                <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span>CONTEXT / GROUNDING (OPTIONAL)</span>
                  <span className="sr-only">Konteks Tambahan</span>
                </span>
              </div>

              {/* Textarea Context */}
              <Textarea
                id="context-prompt"
                rows={result ? 2 : 2}
                placeholder="Contoh: Target e-commerce data extraction, sertakan penanganan pagination dan rate limit..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={isLoading}
                className="resize-none sm:resize-y text-xs font-mono leading-relaxed bg-neutral-50/50 dark:bg-zinc-950/50 border-border/80 focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40 rounded-lg p-3"
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

              {/* Bottom Control Bar in Command Box (Firecrawl Capsule Style) */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/80">
                {/* Left side pill capsule wrapping the 3 required native dropdowns */}
                <div className="bg-neutral-100/90 dark:bg-zinc-800/80 p-1 rounded-xl border border-border/60 flex flex-wrap items-center gap-1.5">
                  {/* 1. Domain Pack Select */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5 bg-card shadow-2xs rounded-lg px-2.5 py-1 border border-border/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] shrink-0" />
                      <Label htmlFor="domain-pack-select" className="sr-only">
                        Bidang Tugas
                      </Label>
                      <select
                        id="domain-pack-select"
                        data-testid="domain-pack-select"
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        disabled={isLoading}
                        className="bg-transparent text-xs font-mono appearance-none focus:outline-hidden cursor-pointer pr-4 text-foreground"
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

                  {/* 2. Provider Select */}
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
                        className="bg-transparent text-xs font-mono appearance-none focus:outline-hidden cursor-pointer pr-4 text-foreground"
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

                  {/* 3. Target Model Select */}
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
                        className="bg-transparent text-xs font-mono appearance-none focus:outline-hidden cursor-pointer pr-4 text-foreground"
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

                  {/* Quick provider modal button */}
                  <button
                    type="button"
                    data-testid="open-providers-settings-btn"
                    onClick={() => setIsProvidersSettingsOpen(true)}
                    className="text-[10px] text-[#FF4D00] hover:underline px-1.5 font-mono cursor-pointer"
                    title="Pengaturan Providers"
                  >
                    ⚡ Edit
                  </button>

                  {activeDomainPack && (
                    <span className="hidden xl:inline text-[10px] text-muted-foreground font-mono px-1">
                      v{activeDomainPack.ruleVersion || "1.0.0"}
                    </span>
                  )}
                </div>

                {/* Right side Firecrawl Orange Submit Button & Reset */}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className="btn-firecrawl-primary rounded-xl h-9 px-4 flex items-center justify-center gap-2 font-medium text-xs shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              </div>
            </form>
          </div>

          {/* Browser Wireframe & Live Split-Pane Result Preview Window */}
          <div className="max-w-5xl mx-auto mt-10 rounded-t-2xl border border-border bg-card shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* Browser Top Bar */}
            <div className="h-10 border-b border-border bg-neutral-50/90 dark:bg-zinc-900/90 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-emerald-400" />
                <span className="ml-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:inline">
                  [ .PROMPT_BLUEPRINT ] &bull; [ .JSON_TELEMETRY ]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Pipeline Live</span>
                </span>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-4 sm:p-6">
              {!result && !isLoading && (
                /* 2-Kolom Interactive Architecture Schematic ala Firecrawl */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Pipeline Stage Wireframe */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-[#FF4D00]" />
                      <span>Pipeline Execution Flow</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                        <span className="text-foreground">[ H1 Intent Audit ]</span>
                        <span className="text-emerald-500 text-[10px]">VERIFIED</span>
                      </div>
                      <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                        <span className="text-foreground">[ Guardrail Matrix ]</span>
                        <span className="text-[#FF4D00] text-[10px]">ACTIVE</span>
                      </div>
                      <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                        <span className="text-foreground">[ Context Grounding ]</span>
                        <span className="text-sky-500 text-[10px]">SYNCED</span>
                      </div>
                      <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                        <span className="text-foreground">[ CTA Verification ]</span>
                        <span className="text-amber-500 text-[10px]">READY</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Code/JSON Master Prompt Preview */}
                  <div className="lg:col-span-7 rounded-xl border border-border bg-neutral-950 p-4 font-mono text-xs text-neutral-300 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                      <span className="text-[#FF4D00] text-[11px] font-bold">master_prompt_spec.json</span>
                      <span className="text-[10px] text-neutral-500">JSON-RPC 2.0</span>
                    </div>

                    <pre className="text-[11px] leading-relaxed overflow-x-auto text-neutral-400">
                      <code>
{`{
  `}<span className="text-[#FF4D00]">{`"role"`}</span>{`: `}<span className="text-emerald-400">{`"Senior Systems Engineer"`}</span>{`,
  `}<span className="text-[#FF4D00]">{`"task"`}</span>{`: `}<span className="text-amber-300">{`"Production Data Extraction"`}</span>{`,
  `}<span className="text-[#FF4D00]">{`"constraints"`}</span>{`: [
    `}<span className="text-neutral-300">{`"No hallucinations"`}</span>{`,
    `}<span className="text-neutral-300">{`"Structured JSON output"`}</span>{`,
    `}<span className="text-neutral-300">{`"Zero raw secrets in telemetry"`}</span>{`
  ],
  `}<span className="text-[#FF4D00]">{`"engine_status"`}</span>{`: `}<span className="text-emerald-400">{`"Groq LPU Active (Tier 1)"`}</span>{`
}`}
                      </code>
                    </pre>

                    <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>✔ Engine Ready (Groq LPU)</span>
                      <span className="text-[#FF4D00]">0 latency buffer</span>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="p-8 space-y-4 rounded-xl border border-border bg-muted/20 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#FF4D00]" />
                    <span className="font-mono text-xs uppercase tracking-wider text-foreground font-semibold">
                      Pipeline berantai multi-tahap sedang memproses token instruksi...
                    </span>
                  </div>
                  <div className="space-y-2 font-mono text-xs text-muted-foreground">
                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span>[1/3] Evaluasi kelemahan semantik &amp; verifikasi batasan...</span>
                      <span className="text-[#FF4D00] font-semibold">RUNNING</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between opacity-60">
                      <span>[2/3] Rekonstruksi Master Prompt &amp; validasi intent...</span>
                      <span>QUEUED</span>
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
            </div>
          </div>
        </section>

        {/* Section 02 Band: Autonomous Mission Control */}
        <div id="mission" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-[#FF4D00] shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-[#FF4D00]">02 / 05</strong> &bull; AUTONOMOUS MISSION CONTROL &amp; BLUEPRINT STUDIO
          </span>
        </div>

        {/* Section 02 Content */}
        <section className="p-6 sm:p-10 border-b border-border space-y-8 bg-neutral-50/30 dark:bg-zinc-950/30">
          <div className="max-w-3xl space-y-2">
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>{"//"}</span>
              <span className="text-[#FF4D00] font-semibold">Agent Ready</span>
              <span>{"//"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Easily supervise your <span className="text-[#FF4D00]">AI agents</span>
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Synthesize full-stack software blueprints and supervise autonomous agent execution loops in real-time.
            </p>
          </div>

          <div className="space-y-6">
            <BlueprintStudio />
            <SupervisionConsole />
          </div>
        </section>

        {/* Section 03 Band: Architectural Capabilities Grid */}
        <div id="capabilities" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-[#FF4D00] shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-[#FF4D00]">03 / 05</strong> &bull; ARCHITECTURAL CAPABILITIES &amp; ZERO-TRUST SPEC
          </span>
        </div>

        {/* Section 03 Content: 3-Column Feature Grid ala Firecrawl */}
        <section className="p-6 sm:p-10 border-b border-border space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Master <span className="text-[#FF4D00]">prompt engineering</span> today
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Complete toolset for prompt synthesis, model testing, and deterministic agent reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-border rounded-2xl overflow-hidden bg-card">
            {/* Feature 1 */}
            <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-border space-y-4 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Multi-Model Synthesis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with Groq LPUs, Google Gemini, OpenRouter, and local Ollama models with automatic key rotation and zero latency overhead.
              </p>
              <div className="pt-2 text-xs font-mono text-[#FF4D00] flex items-center gap-1 font-semibold">
                <span>Pelajari model adaptif &rsaquo;</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-border space-y-4 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Adversarial Defense</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Spider 5-category stress testing automatically probes prompt stability against prompt injection, jailbreaks, and context drifting before deployment.
              </p>
              <div className="pt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <span>Evaluasi spider matrix &rsaquo;</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 sm:p-8 space-y-4 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                <Plug className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Universal MCP Hub</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seamlessly ground prompts with live context from Model Context Protocol servers: Figma, GitHub, Brave Search, and Postgres databases.
              </p>
              <div className="pt-2 text-xs font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1 font-semibold">
                <span>Jelajahi konektor &rsaquo;</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 04 Band: Documentation & User Guide */}
        <div id="docs" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-[#FF4D00] shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-[#FF4D00]">04 / 05</strong> &bull; PRIVACY DISCLOSURE &amp; COMPREHENSIVE GUIDE
          </span>
        </div>

        {/* Section 04 Content: Privacy & User Guide */}
        <section className="p-6 sm:p-10 space-y-6">
          <UserGuideSection />
          <PrivacyDisclosure />
        </section>

        {/* Section 05 Footer Band */}
        <div className="architectural-section-band border-b-0">
          <span className="w-0.5 h-3.5 bg-[#FF4D00] shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-[#FF4D00]">05 / 05</strong> &bull; ARCHITECTURAL SPECIFICATION &bull; PIEW v3.1
          </span>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-2 pb-safe flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("original-prompt");
            el?.scrollIntoView({ behavior: "smooth" });
            el?.focus();
          }}
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <PenTool className="h-4 w-4 text-[#FF4D00]" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("mission-control")}
          className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Cpu className="h-4 w-4" />
          <span>Mission</span>
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

      {/* Settings > MCP Connectors Hub Modal */}
      <McpConnectorsModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
      />
    </div>
  );
}