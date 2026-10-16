"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Sparkles,
  Workflow,
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
  const [providers, setProviders] = useState<ProviderCapability[]>(DEFAULT_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState<string>("groq");
  const [selectedModel, setSelectedModel] = useState<string>("llama-3.3-70b-versatile");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptOptimizationResult | null>(null);

  // Mode Navigasi Tab Teratas: Mission Control (v3.1) vs Classic Studio (v2.0)
  const [activeMainTab, setActiveMainTab] = useState<"mission-control" | "classic">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "classic" || window.location.port === "3124") {
        return "classic";
      }
    }
    return "mission-control";
  });

  // Ambil kapabilitas provider dari /api/providers saat mount
  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.providers)) {
          setProviders(json.providers);
        }
      })
      .catch(() => {});
  }, []);

  // Daftar Domain Rule Packs dari @prompt-workspace/domain-rules
  const domainPacks: DomainRulePack[] = listDomainPacks();
  const activeDomainPack =
    domainPacks.find((p) => p.domainId === selectedDomain) || domainPacks[0];

  const activeProvider =
    providers.find((p) => p.providerId === selectedProvider) || providers[0];

  const handleProviderChange = (newProviderId: string) => {
    setSelectedProvider(newProviderId);
    const targetProvider = providers.find((p) => p.providerId === newProviderId);
    if (targetProvider) {
      setSelectedModel(targetProvider.defaultModel);
    }
  };

  // Mousemove handler untuk Spotlight Bento Cards
  const handleMouseMoveSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
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
          promptContent: result.optimizedPrompt,
          targetProvider: selectedProvider,
          targetModel: selectedModel,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const report = json.data as SpiderReportSummary;
        setSpiderReport(report);
        setVersions((prev) =>
          prev.map((v) =>
            v.versionId === activeVersionId
              ? {
                  ...v,
                  criticalGatePassed: report.criticalGatePassed,
                  qualityScore: report.qualityMetrics.robustnessScore,
                }
              : v
          )
        );
        toast.info("Uji Ketahanan Spider Selesai", {
          description: report.criticalGatePassed
            ? "Gerbang kritis lulus (5/5 kasus nominal & adversarial terpenuhi)."
            : "Gerbang kritis belum lulus. Terdapat potensi kerentanan prompt.",
        });
      } else {
        throw new Error(json.error || "Gagal menjalankan Spider.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses uji Spider.";
      toast.error(msg);
    } finally {
      setIsSpiderLoading(false);
    }
  };

  const handleRequestSpiderRefinement = async (findings: SpiderSecurityFinding[]) => {
    if (!result) return;
    const nextContext = buildClosedLoopOptimizationContext({
      userContext: context,
      spiderFindings: findings.map((f) => ({
        category: f.category,
        remediationHint: f.recommendation,
        sanitizedEvidence: f.evidenceSnippet,
      })),
    });

    setContext(nextContext);
    toast.info("Memulai Closed-Loop Refinement...", {
      description: "Rekomendasi remediasi diinjeksikan ke konteks untuk menghasilkan versi baru.",
    });

    setIsLoading(true);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: result.optimizedPrompt,
          context: nextContext,
          taskType: selectedDomain,
          providerId: selectedProvider,
          targetModel: selectedModel,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const nextOpt = data as PromptOptimizationResult;
        setResult(nextOpt);
        const nextVerNumber = versions.length + 1;
        const newVersionId = `v${nextVerNumber}`;
        const newVerRecord: PromptVersionRecord = {
          versionId: newVersionId,
          versionNumber: nextVerNumber,
          promptText: nextOpt.optimizedPrompt,
          contextText: nextContext,
          source: "spider-refinement",
          createdAt: new Date().toISOString(),
          qualityScore: nextOpt.analysis?.score ?? 90,
          changeSummary: "Dihasilkan otomatis melalui Closed-Loop Spider Refinement",
        };
        setVersions((prev) => [...prev, newVerRecord]);
        setActiveVersionId(newVersionId);
        setSpiderReport(null);
        toast.success(`Versi baru (${newVersionId}) berhasil dibuat dari temuan Spider!`);
      }
    } catch {
      toast.error("Gagal melakukan optimasi perbaikan tertutup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    setActiveVersionId(versionId);
    const targetVer = versions.find((v) => v.versionId === versionId);
    if (targetVer && result) {
      setResult({
        ...result,
        optimizedPrompt: targetVer.promptText,
      });
    }
  };

  // Sync initial history count from SQLite database
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

  const handleTelemetryAction = (
    actionType: "export" | "feedback_helpful" | "feedback_issue"
  ) => {
    void actionType;
    setTelemetry((prev) => ({
      ...prev,
      acceptedOrExportedCount: prev.acceptedOrExportedCount + 1,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setError("Prompt asli tidak boleh kosong.");
      return;
    }

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
          context: context.trim() || null,
          taskType: selectedDomain,
          providerId: selectedProvider,
          targetModel: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Engine sedang sibuk atau gagal menganalisis. Coba lagi atau sederhanakan prompt."
        );
      }

      const optResult = data as PromptOptimizationResult;
      setResult(optResult);

      // Inisialisasi atau rekam versi v1
      const v1Record: PromptVersionRecord = {
        versionId: "v1",
        versionNumber: 1,
        promptText: optResult.optimizedPrompt,
        contextText: context,
        source: "initial",
        createdAt: new Date().toISOString(),
        qualityScore: optResult.analysis?.score ?? 85,
      };
      setVersions([v1Record]);
      setActiveVersionId("v1");
      setSpiderReport(null);

      // Perbarui metrik sesi lokal
      setTelemetry((prev) => {
        const newCount = prev.optimizationsCount + 1;
        const currentScore = optResult.analysis?.score ?? 85;
        const prevAvg = prev.averageScore ?? 85;
        const newAvg =
          prev.optimizationsCount === 0
            ? currentScore
            : (prevAvg * prev.optimizationsCount + currentScore) / newCount;
        return {
          ...prev,
          optimizationsCount: newCount,
          averageScore: newAvg,
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 pb-16 md:pb-6">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleSelectHistoryPrompt}
        refreshKey={historyRefreshKey}
        onCountChange={setHistoryCount}
      />

      {/* Top Floating Glass Header Bar (Braintrust / Midday Style) */}
      <header className="border-b border-border/80 bg-background/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold shadow-2xs">
              <TerminalSquare className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-foreground">
                Prompt Intelligence Workspace — PIEW Mission Control v3.1
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline-block border border-border/70 px-1.5 py-0.2 rounded font-mono bg-muted/40">
                v3.1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Engine Indicator */}
            <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5 pl-2 border-l border-border/60">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-foreground/80 flex items-center gap-1">
                <Cpu className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                Groq LPUs Aktif
              </span>
            </div>

            {/* LangSmith-style Mini Session Badge */}
            <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded border border-border/60">
              <span>Sesi: <strong className="text-foreground">{telemetry.optimizationsCount}</strong> run</span>
              <span>&bull;</span>
              <span>Skor: <strong className="text-foreground">{Math.round(telemetry.averageScore ?? 0)}</strong>/100</span>
            </div>

            {/* Dark / Light Theme Toggle Switch */}
            <ThemeToggle />

            {/* History Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="h-8 text-xs gap-1.5 cursor-pointer border-border/80 hover:bg-muted/60"
            >
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Riwayat</span>
              {historyCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0 font-mono"
                >
                  {historyCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Stage 7 North-Star Telemetry Bar (LangSmith Trace Style) */}
        <TelemetrySummaryBar metrics={telemetry} />

        {/* Top Level Navigation Tabs: Mission Control v3.0 vs Classic Studio v2.0 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/70 max-w-fit">
            <button
              type="button"
              data-testid="tab-mission-control"
              onClick={() => setActiveMainTab("mission-control")}
              className={`flex items-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMainTab === "mission-control"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              <span>🏛 Autonomous Mission Control (v3.1)</span>
            </button>
            <button
              type="button"
              data-testid="tab-classic-studio"
              onClick={() => setActiveMainTab("classic")}
              className={`flex items-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMainTab === "classic"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-sky-500" />
              <span>⚡️ Classic Studio & Optimizer (v2.0)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Status: Mission Control Operasional</span>
          </div>
        </div>

        {activeMainTab === "mission-control" ? (
          <div className="space-y-6">
            <BlueprintStudio />
            <SupervisionConsole />
          </div>
        ) : (
          /* Workspace Layout: Bento Kiri (5 Kolom) & Bento Kanan (7 Kolom) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bento Kiri: Form Input & Parameter */}
          <section
            className={`space-y-4 transition-all duration-200 ${
              result ? "lg:col-span-5" : "lg:col-span-5"
            }`}
          >
            <Card
              onMouseMove={handleMouseMoveSpotlight}
              className="bento-spotlight border-border/80 shadow-xs sticky top-20 overflow-hidden"
            >
              <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <div>
                      <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                        Studio Editor
                      </CardTitle>
                      <span className="sr-only">Input Prompt</span>
                    </div>
                  </div>
                  {prompt && (
                    <span className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded border border-border/50">
                      {prompt.length} karakter
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Area penulisan instruksi utama dengan konfigurasi model dan domain terintegrasi.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-3.5 space-y-3.5">
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Vercel AI Playground-style Compact Parameter Toolbar (3 Kolom) */}
                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* 1. Domain Pack Select */}
                      <div className="space-y-1">
                        <Label
                          htmlFor="domain-pack-select"
                          className="font-medium text-[11px] text-muted-foreground flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3 text-primary" />
                            <span>Bidang Tugas</span>
                          </span>
                        </Label>
                        <select
                          id="domain-pack-select"
                          data-testid="domain-pack-select"
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          disabled={isLoading}
                          className="w-full h-8 rounded border border-input bg-background px-2 text-xs shadow-2xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        >
                          {domainPacks.map((pack) => (
                            <option key={pack.domainId} value={pack.domainId}>
                              {pack.name}
                            </option>
                          ))}
                        </select>
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
                        </Label>
                        <select
                          id="provider-select"
                          data-testid="provider-select"
                          value={selectedProvider}
                          onChange={(e) => handleProviderChange(e.target.value)}
                          disabled={isLoading}
                          className="w-full h-8 rounded border border-input bg-background px-2 text-xs shadow-2xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        >
                          {providers.map((p: ProviderCapability) => (
                            <option key={p.providerId} value={p.providerId}>
                              {p.displayName}
                            </option>
                          ))}
                        </select>
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
                        </Label>
                        <select
                          id="target-model-select"
                          data-testid="target-model-select"
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          disabled={isLoading}
                          className="w-full h-8 rounded border border-input bg-background px-2 text-xs shadow-2xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        >
                          {activeProvider.availableModels.map((m: string) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active Domain Indicator */}
                    {activeDomainPack && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[280px]">
                          {activeDomainPack.description}
                        </span>
                        <span className="font-mono text-primary font-semibold shrink-0">
                          v{activeDomainPack.ruleVersion || "1.0.0"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Prompt Input */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="original-prompt"
                      className="font-medium text-xs flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        Instruksi Awal <span className="text-destructive">*</span>
                        <span className="sr-only">Prompt Asli</span>
                      </span>
                      {isCrawlerFeatureEnabled() && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-testid="open-crawler-modal-button"
                          onClick={() => setIsCrawlerModalOpen(true)}
                          className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 gap-1 cursor-pointer font-normal"
                        >
                          <Globe className="h-3 w-3" />
                          <span>Ambil Referensi Tautan</span>
                          <span className="sr-only">Impor Sumber &amp; Fakta (Crawler)</span>
                        </Button>
                      )}
                    </Label>
                    <Textarea
                      id="original-prompt"
                      rows={result ? 5 : 7}
                      placeholder="Contoh: Buatkan saya kode Python untuk web scraping..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-xs font-mono leading-relaxed focus-visible:ring-1"
                      required
                    />
                  </div>

                  {/* Context Input */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="context-prompt"
                      className="font-medium text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-foreground">
                        Konteks Pendukung{" "}
                        <span className="text-muted-foreground font-normal text-[11px]">
                          (Opsional)
                        </span>
                        <span className="sr-only">Konteks Tambahan</span>
                      </span>
                    </Label>
                    <Textarea
                      id="context-prompt"
                      rows={result ? 2 : 3}
                      placeholder="Contoh: Target e-commerce data extraction, gunakan BeautifulSoup..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-xs leading-relaxed"
                    />
                  </div>

                  {/* Error Notification Alert */}
                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-3 animate-in fade-in">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="font-semibold text-destructive">
                          Terjadi Kendala Pemrosesan
                        </div>
                        <div className="leading-relaxed opacity-90">{error}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmit()}
                          className="mt-1 h-7 text-[11px] border-destructive/30 hover:bg-destructive/20 text-destructive cursor-pointer"
                        >
                          <RefreshCw className="mr-1.5 h-3 w-3" />
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
                      className="flex-1 h-9 text-xs font-medium cursor-pointer bg-foreground text-background hover:opacity-90 transition-opacity"
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
                        className="h-9 px-3 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </form>

                {/* Privacy, External Provider & Data Retention Disclosure */}
                <PrivacyDisclosure />
              </CardContent>
            </Card>
          </section>

          {/* Result / Output Section (Bento Kanan 7 Kolom) */}
          <section
            className={`space-y-6 ${
              result ? "lg:col-span-7" : "lg:col-span-7"
            }`}
          >
            {!result && !isLoading && (
              <Card
                onMouseMove={handleMouseMoveSpotlight}
                className="bento-spotlight border-dashed border-border/80 bg-muted/20 h-full min-h-[380px] flex items-center justify-center p-8 text-center"
              >
                <div className="max-w-sm space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <PenTool className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Belum Ada Evaluasi Aktif
                    <span className="sr-only">Belum Ada Hasil Analisis</span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ketik instruksi di Studio Editor lalu klik tombol{" "}
                    <span className="font-semibold text-foreground">
                      Susun &amp; Evaluasi Instruksi
                    </span>{" "}
                    untuk menghasilkan Master Prompt terverifikasi dengan evaluasi semantik dan batasan eksekusi yang kokoh.
                  </p>
                </div>
              </Card>
            )}

            {isLoading && (
              <Card className="border-border/80 min-h-[420px] flex items-center justify-center p-8 text-center animate-pulse">
                <div className="space-y-4 max-w-sm">
                  <Loader2 className="h-9 w-9 animate-spin mx-auto text-primary" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground text-sm">
                      Sedang menganalisis kebutuhan dan menyusun instruksi...
                      <span className="sr-only">Menjalankan Pipeline Engine via Groq LLM...</span>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tahap 1: Evaluasi kelemahan semantik &amp; verifikasi batasan
                      <br />
                      Tahap 2: Rekonstruksi Master Prompt &amp; validasi keselarasan tujuan
                    </p>
                    <span className="inline-block text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                      Estimasi durasi: 3-8 detik
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {result && !isLoading && (
              <ResultDashboard
                result={result}
                onRegenerate={() => handleSubmit()}
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
    </div>
  );
}
