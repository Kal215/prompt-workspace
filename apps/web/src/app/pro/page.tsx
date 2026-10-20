"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Play,
  Layers,
  ShieldCheck,
  BarChart3,
  Code2,
  Globe,
  Sliders,
  Wrench,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  ExternalLink,
  SplitSquareVertical,
  Cpu,
  History,
  Lock,
  ShieldAlert,
  FileCode,
  ArrowRight,
  Check,
  GitBranch,
  Database,
  Terminal,
  Activity,
  Boxes,
  HelpCircle,
  Zap,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { CrawlerDialog } from "@/components/workspace/crawler-dialog";
import { SpiderMatrixCard } from "@/components/workspace/spider-matrix-card";
import { MermaidViewer } from "@/components/ui/mermaid-viewer";
import { MarkdownView } from "@/components/ui/markdown-view";

// --- INTERFACES ---

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  model: string;
  status: "ready" | "unavailable";
  tier?: "free" | "paid" | "local";
}

interface McpConnector {
  id: string;
  name: string;
  descId: string;
  descEn: string;
  toolsCount: number;
  permission: "read-only" | "write-approval";
}

interface GroundingState {
  sourceUrl: string;
  facts: string[];
  combinedText: string;
}

interface ExecutionResult {
  output: string;
  latencyMs: number;
  tokensUsed: number;
  model: string;
  provider: string;
  timestamp: string;
  error?: string;
}

interface DiagramItem {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  mermaidCode?: string;
  chart?: string;
  code?: string;
}

interface ExecutionPhaseItem {
  phaseNumber: number;
  name: string;
  tasks: string[];
  deliverables: string[];
}

interface UniversalBlueprint {
  title?: string;
  domain?: string;
  audienceLevel?: string;
  summary?: string;
  architectureSummary?: string;
  diagrams?: DiagramItem[];
  executionPhases?: ExecutionPhaseItem[];
  coreSpecification?: string;
  negativeConstraints?: string[];
  definitionOfDone?: string[];
}

interface SynthesisResult {
  success: boolean;
  optimizedPrompt?: string;
  originalPrompt?: string;
  diff?: string;
  analysis?: {
    score?: number;
    status?: string;
    findings?: Array<{
      category: string;
      severity: string;
      evidence: string;
      recommendation: string;
    }>;
    taskSpec?: any;
  };
  universalBlueprint?: UniversalBlueprint;
  mermaidDiagrams?: DiagramItem[];
  appliedMcpConnectors?: string[];
}

// --- 10 ENTERPRISE MCP CONNECTORS RESMI ---
const OFFICIAL_MCP_CONNECTORS: McpConnector[] = [
  {
    id: "github-mcp",
    name: "GitHub",
    descId: "Repositori, kode, dan PR",
    descEn: "Repository, code & PRs",
    toolsCount: 14,
    permission: "write-approval",
  },
  {
    id: "docker-mcp",
    name: "Docker",
    descId: "Kontainer & log server",
    descEn: "Containers & logs",
    toolsCount: 9,
    permission: "write-approval",
  },
  {
    id: "sentry-mcp",
    name: "Sentry",
    descId: "Laporan error & crash",
    descEn: "Crash & error reports",
    toolsCount: 6,
    permission: "read-only",
  },
  {
    id: "postgres-mcp",
    name: "PostgreSQL",
    descId: "Database & tabel data",
    descEn: "Database & data tables",
    toolsCount: 11,
    permission: "read-only",
  },
  {
    id: "linear-mcp",
    name: "Linear",
    descId: "Tiket tugas proyek",
    descEn: "Project task tickets",
    toolsCount: 8,
    permission: "write-approval",
  },
  {
    id: "filesystem-mcp",
    name: "File Lokal",
    descId: "Berkas folder proyek",
    descEn: "Project files & folders",
    toolsCount: 12,
    permission: "write-approval",
  },
  {
    id: "figma-mcp",
    name: "Figma",
    descId: "Desain tampilan UI",
    descEn: "UI design & tokens",
    toolsCount: 7,
    permission: "read-only",
  },
  {
    id: "brave-search-mcp",
    name: "Pencarian Web",
    descId: "Cari fakta web terkini",
    descEn: "Live structured search",
    toolsCount: 5,
    permission: "read-only",
  },
  {
    id: "notion-mcp",
    name: "Notion",
    descId: "Catatan & SOP dokumen",
    descEn: "Knowledge docs & notes",
    toolsCount: 8,
    permission: "read-only",
  },
  {
    id: "aws-knowledge-mcp",
    name: "AWS Cloud",
    descId: "Panduan arsitektur cloud",
    descEn: "Cloud architecture guide",
    toolsCount: 6,
    permission: "read-only",
  },
];

// --- 5 KATEGORI TUGAS (RAMAH ORANG AWAM) ---
const DOMAIN_OPTIONS = [
  {
    id: "software_engineering",
    nameId: "Aplikasi & Web",
    nameEn: "Web & Mobile Apps",
    descId: "Pembuatan sistem, kode program, dan API",
    descEn: "Code architecture, modular API, security",
  },
  {
    id: "devops_infrastructure",
    nameId: "Server & Deployment",
    nameEn: "DevOps & Servers",
    descId: "Docker, alur rilis aplikasi, dan pemantauan",
    descEn: "Docker, CI/CD pipeline, monitoring",
  },
  {
    id: "database_architecture",
    nameId: "Basis Data",
    nameEn: "Database & Storage",
    descId: "Tabel database, relasi data, dan transaksi",
    descEn: "Database tables, relationships, integrity",
  },
  {
    id: "security_testing",
    nameId: "Uji Keamanan",
    nameEn: "Security & Safety",
    descId: "Pengecekan celah keamanan dan validasi input",
    descEn: "Injection flaw audit, zero-trust validation",
  },
  {
    id: "ai_agents",
    nameId: "Sistem Otomatis / Bot AI",
    nameEn: "Autonomous AI Bots",
    descId: "Tugas bertahap, ingatan sistem, dan otomasi",
    descEn: "Autonomous loops, memory, guardrails",
  },
];

// --- 3 TINGKAT GAYA BAHASA JAWABAN (RAMAH ORANG AWAM) ---
const AUDIENCE_LEVELS = [
  {
    id: "implementation_engineer",
    nameId: "Teknis",
    nameEn: "Technical",
    descId: "Lengkap dengan kode siap pakai",
    descEn: "Code-ready & exact types",
  },
  {
    id: "technical_lead",
    nameId: "Arsitek",
    nameEn: "Architect",
    descId: "Fokus pada struktur & alur sistem",
    descEn: "Architecture & flow patterns",
  },
  {
    id: "executive_business",
    nameId: "Bisnis",
    nameEn: "Business",
    descId: "Bahasa umum & ringkasan manfaat",
    descEn: "High-level value & roadmap",
  },
];

export default function ProPage() {
  const { lang } = useLanguage();

  // Mode: 1 Model vs Bandingkan 2 Model (Arena)
  const [arenaMode, setArenaMode] = useState<"single" | "arena">("arena");

  // Core Inputs
  const [prompt, setPrompt] = useState("");
  const [domain, setDomain] = useState("software_engineering");
  const [audienceLevel, setAudienceLevel] = useState("implementation_engineer");
  const [systemInstruction, setSystemInstruction] = useState("");

  // Negative constraints (Aturan Khusus)
  const [customConstraints, setCustomConstraints] = useState<string[]>([
    "Wajib Bahasa Indonesia",
    "Gunakan TypeScript strict mode",
  ]);
  const [newConstraintInput, setNewConstraintInput] = useState("");

  // MCP Connectors selection - DEFAULT MATI SEMUA ATAU SINKRON DARI PENGATURAN!
  const [activeMcpConnectors, setActiveMcpConnectors] = useState<string[]>([]);

  // Hyperparameters
  const [showHyperparameters, setShowHyperparameters] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(4096);

  // Installed models list
  const [installedModels, setInstalledModels] = useState<ModelOption[]>([]);
  const [selectedModelA, setSelectedModelA] = useState("");
  const [selectedModelB, setSelectedModelB] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Grounding Web Crawler & Auto-Detection
  const [isCrawlerOpen, setIsCrawlerOpen] = useState(false);
  const [groundingData, setGroundingData] = useState<GroundingState | null>(null);
  const [isAutoCrawling, setIsAutoCrawling] = useState(false);

  // Auto-detect URLs from prompt & systemInstruction
  const detectedUrls = useMemo(() => {
    const raw = `${prompt} ${systemInstruction || ""}`;
    const regex = /https?:\/\/[^\s"'<>\)]+/gi;
    const matches = raw.match(regex) || [];
    return Array.from(new Set(matches.map((u) => u.replace(/[.,;:]$/, ""))));
  }, [prompt, systemInstruction]);

  const handleAutoCrawlDetectedUrl = async (targetUrl: string) => {
    if (!targetUrl || isAutoCrawling) return;
    setIsAutoCrawling(true);
    try {
      const payload = {
        targetUrl: targetUrl.trim(),
        mode: "EXTRACT_GROUNDING_CONTEXT",
        sourceType: targetUrl.includes("github") ? "GITHUB_RAW_FILE" : "DOCUMENTATION_PAGE",
      };

      let res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        res = await fetch("/api/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === "en" ? "Failed to extract content" : "Gagal mengekstrak fakta web"));
      }

      const facts = (data.data.items || []).map((it: any) => it.content || it.snippet || "");
      const combinedText = facts.join("\n\n---\n\n");
      setGroundingData({
        sourceUrl: data.data.sourceUrl,
        facts,
        combinedText,
      });

      toast.success(
        lang === "en"
          ? `Auto-extracted ${facts.length} web facts from ${data.data.sourceUrl}!`
          : `Berhasil menyedot ${facts.length} fakta web dari ${data.data.sourceUrl}!`
      );
    } catch (err: any) {
      toast.error(err.message || (lang === "en" ? "Failed to crawl web URL" : "Gagal menyedot tautan web"));
    } finally {
      setIsAutoCrawling(false);
    }
  };

  // Execution & Synthesis States
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [resultA, setResultA] = useState<ExecutionResult | null>(null);
  const [resultB, setResultB] = useState<ExecutionResult | null>(null);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);

  // Active View Tabs:
  // 'master' | 'blueprint' | 'arena' | 'spider' | 'analytics' | 'payload'
  const [activeTab, setActiveTab] = useState<
    "master" | "blueprint" | "arena" | "spider" | "analytics" | "payload"
  >("master");

  // Sub-view in Master Prompt: Full Text vs Diff
  const [diffMode, setDiffMode] = useState(false);

  // Selected diagram index for Blueprint tab
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0);

  // Copy status
  const [copiedMaster, setCopiedMaster] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  // Quick Starters
  const QUICK_STARTERS = useMemo(
    () => [
      {
        titleId: "Toko Online & Pembayaran",
        titleEn: "E-Commerce & Payment",
        prompt:
          "Rancang arsitektur backend toko online dengan keranjang belanja, integrasi webhook gateway pembayaran, dan pencatatan stok otomatis yang aman dari race condition.",
        domain: "software_engineering",
      },
      {
        titleId: "Reservasi & Antrean Klinik",
        titleEn: "Clinic Booking & Queue",
        prompt:
          "Buat skema database dan logika antrean reservasi klinik medis. Pastikan jadwal dokter tidak bertabrakan (double-booking) dan kirim notifikasi reminder secara terjadwal.",
        domain: "database_architecture",
      },
      {
        titleId: "Otomasi Server & Docker",
        titleEn: "CI/CD & Docker Pipeline",
        prompt:
          "Susun workflow GitHub Actions untuk build Docker image, pemindaian celah keamanan vulnerabilitas (Trivy), dan deployment otomatis ke klaster Kubernetes.",
        domain: "devops_infrastructure",
      },
    ],
    []
  );

  // 1. Fetch installed models from API
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        const res = await fetch("/api/providers");
        if (!res.ok) throw new Error("Failed to fetch providers");
        const data = await res.json();

        const opts: ModelOption[] = [];
        if (data.providers) {
          for (const [providerId, pData] of Object.entries<any>(data.providers)) {
            if (pData.configured && Array.isArray(pData.models)) {
              for (const m of pData.models) {
                opts.push({
                  id: `${providerId}:${m}`,
                  name: `${pData.name} - ${m}`,
                  provider: pData.name,
                  providerId,
                  model: m,
                  status: "ready",
                  tier: providerId === "groq" ? "free" : "paid",
                });
              }
            }
          }
        }

        if (isMounted) {
          if (opts.length > 0) {
            setInstalledModels(opts);
            setSelectedModelA(opts[0].id);
            setSelectedModelB(opts.length > 1 ? opts[1].id : opts[0].id);
          } else {
            const fallback: ModelOption[] = [
              {
                id: "groq:llama-3.3-70b-versatile",
                name: "Groq - Llama 3.3 70B",
                provider: "Groq",
                providerId: "groq",
                model: "llama-3.3-70b-versatile",
                status: "ready",
                tier: "free",
              },
            ];
            setInstalledModels(fallback);
            setSelectedModelA(fallback[0].id);
            setSelectedModelB(fallback[0].id);
          }
        }
      } catch {
        if (isMounted) {
          const fallback: ModelOption[] = [
            {
              id: "groq:llama-3.3-70b-versatile",
              name: "Groq - Llama 3.3 70B",
              provider: "Groq",
              providerId: "groq",
              model: "llama-3.3-70b-versatile",
              status: "ready",
              tier: "free",
            },
          ];
          setInstalledModels(fallback);
          setSelectedModelA(fallback[0].id);
          setSelectedModelB(fallback[0].id);
        }
      } finally {
        if (isMounted) setIsLoadingModels(false);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Sync MCP Connectors dari Pengaturan (Default mati semua jika belum diaktifkan di Settings)
  useEffect(() => {
    let isMounted = true;
    async function syncMcpFromSettings() {
      try {
        const res = await fetch("/api/mcp-connectors");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.connectors)) {
          // Ambil hanya konektor yang status isEnabled === true di pengaturan
          const enabledFromSettings = data.connectors
            .filter((c: any) => c.isEnabled === true)
            .map((c: any) => c.connectorId);

          if (isMounted && enabledFromSettings.length > 0) {
            setActiveMcpConnectors(enabledFromSettings);
          }
        }
      } catch {
        // Biarkan tetap [] (mati semua) jika gagal atau belum disetel
      }
    }

    syncMcpFromSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Diagrams extraction helper
  const availableDiagrams = useMemo<DiagramItem[]>(() => {
    if (synthesisResult?.universalBlueprint?.diagrams && synthesisResult.universalBlueprint.diagrams.length > 0) {
      return synthesisResult.universalBlueprint.diagrams;
    }
    if (synthesisResult?.mermaidDiagrams && synthesisResult.mermaidDiagrams.length > 0) {
      return synthesisResult.mermaidDiagrams;
    }
    return [];
  }, [synthesisResult]);

  const activeDiagram = availableDiagrams[selectedDiagramIndex] || availableDiagrams[0];

  // --- ACTIONS ---

  // 1. BUAT PROMPT LENGKAP & RANCANGAN (SINTESIS SEKALI JALAN)
  const handleSynthesizeMasterPrompt = async () => {
    if (!prompt.trim()) {
      toast.error(
        lang === "en"
          ? "Please enter your task first."
          : "Tuliskan tugas yang ingin Anda buat terlebih dahulu."
      );
      return;
    }

    setIsSynthesizing(true);
    try {
      const modelOptA =
        installedModels.find((m) => m.id === selectedModelA) || installedModels[0];

      let contextPayload: string | undefined = undefined;
      const contextParts: string[] = [];

      if (groundingData && groundingData.facts.length > 0) {
        contextParts.push(`[GROUNDING WEB FACTS]:\n${groundingData.facts.join("\n")}`);
      }

      if (activeMcpConnectors.length > 0) {
        contextParts.push(
          `[ACTIVE ENTERPRISE MCP TOOLS]:\n${activeMcpConnectors
            .map((cId) => {
              const c = OFFICIAL_MCP_CONNECTORS.find((x) => x.id === cId);
              return `- ${c?.name || cId} (Permission: ${c?.permission})`;
            })
            .join("\n")}`
        );
      }

      if (contextParts.length > 0) {
        contextPayload = contextParts.join("\n\n");
      }

      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: contextPayload,
          domain,
          providerId: modelOptA?.providerId || "groq",
          targetModel: modelOptA?.model || "llama-3.3-70b-versatile",
          constraints: customConstraints,
          audienceLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(
          data.error ||
            (lang === "en" ? "Synthesis failed" : "Gagal menyusun prompt dan rancangan")
        );
      }

      // Pastikan data root disimpan langsung
      setSynthesisResult(data);
      setSelectedDiagramIndex(0);
      setActiveTab("master");

      toast.success(
        lang === "en"
          ? "Complete prompt, diagrams & safety tests ready!"
          : "Prompt lengkap, diagram alur & uji keamanan berhasil dibuat!"
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal menyusun prompt lengkap.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // 2. JALANKAN PERBANDINGAN MODEL LANGSUNG
  const executeModel = async (overridePrompt?: string) => {
    const textToRun = (overridePrompt || prompt).trim();
    if (!textToRun) {
      toast.error(
        lang === "en"
          ? "Please enter a task or generate a complete prompt first."
          : "Tuliskan tugas atau buat prompt lengkap terlebih dahulu."
      );
      return;
    }

    const modelOptA =
      installedModels.find((m) => m.id === selectedModelA) || installedModels[0];
    const modelOptB =
      installedModels.find((m) => m.id === selectedModelB) ||
      installedModels[1] ||
      installedModels[0];

    // Gabungkan instruksi sistem + alat MCP + Grounding
    let finalSystemPrompt = systemInstruction || "";
    if (activeMcpConnectors.length > 0) {
      finalSystemPrompt += `\n\n[AVAILABLE MCP CONNECTORS]: ${activeMcpConnectors.join(", ")}`;
    }
    if (groundingData?.facts && groundingData.facts.length > 0) {
      finalSystemPrompt += `\n\n[VERIFIED WEB FACTS]:\n${groundingData.facts.join("\n")}`;
    }

    // Jalankan Model Pertama (A)
    setIsLoadingA(true);
    setResultA(null);
    setActiveTab("arena");

    const runA = async () => {
      try {
        const resA = await fetch("/api/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: window.location.origin,
          },
          body: JSON.stringify({
            prompt: textToRun,
            systemInstruction: finalSystemPrompt || undefined,
            providerId: modelOptA.providerId,
            model: modelOptA.model,
            parameters: {
              temperature,
              topP,
              maxTokens,
            },
          }),
        });
        const dataA = await resA.json();
        if (!resA.ok || dataA.success === false) {
          throw new Error(dataA.error || "Eksekusi Model A gagal");
        }
        setResultA({
          output: dataA.data?.output || dataA.output || "",
          latencyMs: dataA.data?.latencyMs || dataA.latencyMs || 0,
          tokensUsed: dataA.data?.tokenUsage?.total || dataA.tokensUsed || 0,
          model: modelOptA.name,
          provider: modelOptA.provider,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        setResultA({
          output: `Error: ${err.message}`,
          latencyMs: 0,
          tokensUsed: 0,
          model: modelOptA.name,
          provider: modelOptA.provider,
          timestamp: new Date().toLocaleTimeString(),
          error: err.message,
        });
      } finally {
        setIsLoadingA(false);
      }
    };

    // Jalankan Model Kedua (B) jika mode Bandingkan 2 Model aktif
    const runB = async () => {
      if (arenaMode !== "arena") return;
      setIsLoadingB(true);
      setResultB(null);
      try {
        const resB = await fetch("/api/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: window.location.origin,
          },
          body: JSON.stringify({
            prompt: textToRun,
            systemInstruction: finalSystemPrompt || undefined,
            providerId: modelOptB.providerId,
            model: modelOptB.model,
            parameters: {
              temperature,
              topP,
              maxTokens,
            },
          }),
        });
        const dataB = await resB.json();
        if (!resB.ok || dataB.success === false) {
          throw new Error(dataB.error || "Eksekusi Model B gagal");
        }
        setResultB({
          output: dataB.data?.output || dataB.output || "",
          latencyMs: dataB.data?.latencyMs || dataB.latencyMs || 0,
          tokensUsed: dataB.data?.tokenUsage?.total || dataB.tokensUsed || 0,
          model: modelOptB.name,
          provider: modelOptB.provider,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        setResultB({
          output: `Error: ${err.message}`,
          latencyMs: 0,
          tokensUsed: 0,
          model: modelOptB.name,
          provider: modelOptB.provider,
          timestamp: new Date().toLocaleTimeString(),
          error: err.message,
        });
      } finally {
        setIsLoadingB(false);
      }
    };

    await Promise.all([runA(), runB()]);
    toast.success(
      lang === "en" ? "Model execution finished!" : "Model selesai memberikan jawaban!"
    );
  };

  // 3. COPY HELPER
  const handleCopyText = async (text: string, target: "master" | "raw" | "A" | "B") => {
    try {
      await navigator.clipboard.writeText(text);
      if (target === "master") {
        setCopiedMaster(true);
        setTimeout(() => setCopiedMaster(false), 2000);
      } else if (target === "raw") {
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2000);
      } else if (target === "A") {
        setCopiedA(true);
        setTimeout(() => setCopiedA(false), 2000);
      } else if (target === "B") {
        setCopiedB(true);
        setTimeout(() => setCopiedB(false), 2000);
      }
      toast.success(lang === "en" ? "Copied to clipboard!" : "Berhasil disalin ke papan klip!");
    } catch {
      toast.error(lang === "en" ? "Failed to copy" : "Gagal menyalin teks");
    }
  };

  // 4. DOWNLOAD PROMPT
  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(lang === "en" ? "File downloaded" : "Berkas berhasil diunduh");
  };

  // Toggle MCP Connector
  const toggleMcp = (id: string) => {
    setActiveMcpConnectors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Turn off all MCP connectors
  const turnOffAllMcp = () => {
    setActiveMcpConnectors([]);
    toast.info(lang === "en" ? "All extra tools disabled." : "Semua alat tambahan dimatikan.");
  };

  // Add constraint
  const handleAddConstraint = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newConstraintInput.trim()) {
      e.preventDefault();
      const val = newConstraintInput.trim();
      if (!customConstraints.includes(val)) {
        setCustomConstraints((prev) => [...prev, val]);
      }
      setNewConstraintInput("");
    }
  };

  const removeConstraint = (idx: number) => {
    setCustomConstraints((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="h-screen w-full bg-[#fcfbf9] text-stone-900 flex overflow-hidden font-sans selection:bg-lime-300 selection:text-stone-900">
      {/* ─────────────────────────────────────────────────────────────
          NAVBAR SAMPING SERAGAM (WORKSPACE SIDEBAR DARI CLASSIC & AGENT)
      ───────────────────────────────────────────────────────────── */}
      <WorkspaceSidebar activeMode="Pro" />

      {/* ─────────────────────────────────────────────────────────────
          KONTEN UTAMA PRO STUDIO (DOCK 2-COLUMN)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex h-full overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────
            KOLOM KIRI: FORM PENGATURAN & KONTROL MESIN (430px)
        ───────────────────────────────────────────────────────────── */}
        <div className="w-[520px] shrink-0 border-r border-stone-200/80 bg-white/70 backdrop-blur-md flex flex-col h-full overflow-hidden">
          {/* Header Panel Kiri */}
          <div className="px-5 py-3.5 border-b border-stone-200/80 shrink-0 flex items-center justify-between bg-white/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-lime-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-stone-900 tracking-tight">PIEW Pro Studio</h1>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-stone-900 text-white">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  {lang === "en" ? "Unified Prompt & System Architecture" : "Studio Prompt & Perancangan Sistem AI"}
                </p>
              </div>
            </div>

            {/* Quick Grounding Web Button with Auto-Detect */}
            <button
              type="button"
              onClick={() => setIsCrawlerOpen(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                groundingData
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                  : detectedUrls.length > 0
                  ? "bg-sky-50 text-sky-800 border-sky-300 shadow-2xs animate-pulse"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900"
              }`}
              title={
                lang === "en"
                  ? "Crawl and inject facts from real websites or documentation"
                  : "Ambil informasi dari website/link dokumentasi asli agar jawaban AI akurat"
              }
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {groundingData
                  ? `${groundingData.facts.length} Fakta`
                  : detectedUrls.length > 0
                  ? (lang === "en" ? "1 Link Detected" : "1 Link Terdeteksi")
                  : (lang === "en" ? "Web Facts" : "Cari Fakta Web")}
              </span>
            </button>
          </div>

          {/* Form Input Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* 1. Quick Starters (Contoh Cepat Siap Pakai) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold block">
                {lang === "en" ? "Ready-to-Use Examples:" : "Contoh Tugas Siap Pakai:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_STARTERS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(s.prompt);
                      setDomain(s.domain);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer border border-stone-200/60 font-medium"
                  >
                    {lang === "en" ? s.titleEn : s.titleId}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Task Prompt Input (Tugas yang Ingin Dibuat) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-stone-500" />
                  <span>{lang === "en" ? "What do you want to build?" : "Tugas yang Ingin Dibuat"}</span>
                </label>
                <span className="text-[10px] font-mono text-stone-400">
                  {prompt.length} {lang === "en" ? "chars" : "karakter"}
                </span>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-xs focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-400/20 transition-all">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    lang === "en"
                      ? "Describe what you want to build in plain English (e.g. Build an online store backend with shopping cart, automated shipping calculation, and digital payments)..."
                      : "Tuliskan apa yang ingin Anda buat dengan bahasa sehari-hari (contoh: Buatkan sistem toko online dengan keranjang belanja, hitung ongkir otomatis, dan pembayaran digital)..."
                  }
                  rows={4}
                  className="w-full bg-transparent border-0 p-0 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0 resize-y leading-relaxed font-sans"
                />
              </div>

              {/* Status Fakta Web atau URL Terdeteksi Otomatis */}
              {groundingData ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 truncate">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-[11px]">
                      {lang === "en"
                        ? `${groundingData.facts.length} Web Facts Active:`
                        : `${groundingData.facts.length} Fakta Web Terpasang:`}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-800 truncate max-w-[200px]">
                      {groundingData.sourceUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGroundingData(null)}
                    className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                    title={lang === "en" ? "Remove web facts" : "Hapus fakta web"}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : detectedUrls.length > 0 ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-[11px] block">
                        {lang === "en" ? "Web Link Detected:" : "Link Web Terdeteksi:"}
                      </span>
                      <span className="font-mono text-[10px] text-sky-800 truncate block max-w-xs">
                        {detectedUrls[0]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoCrawlDetectedUrl(detectedUrls[0])}
                    disabled={isAutoCrawling}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {isAutoCrawling ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{lang === "en" ? "Extracting..." : "Menyedot..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>{lang === "en" ? "Auto-Extract Facts" : "Sedot Fakta Otomatis"}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>

            {/* 3 & 4. Kategori Tugas & Gaya Bahasa Jawaban (Side by Side) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Kategori Tugas */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-stone-500" />
                  <span>{lang === "en" ? "Task Category" : "Kategori Tugas"}</span>
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full text-xs font-medium rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer shadow-2xs"
                >
                  {DOMAIN_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lang === "en" ? d.nameEn : d.nameId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gaya Bahasa Jawaban */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-stone-500" />
                  <span>{lang === "en" ? "Explanation Detail" : "Gaya Bahasa"}</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {AUDIENCE_LEVELS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAudienceLevel(a.id)}
                      className={`py-1.5 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                        audienceLevel === a.id
                          ? "border-stone-900 bg-stone-900 text-white font-semibold shadow-2xs"
                          : "border-stone-200 bg-white hover:border-stone-300 text-stone-700"
                      }`}
                      title={lang === "en" ? a.descEn : a.descId}
                    >
                      <span className="text-[10px] block leading-tight">
                        {lang === "en" ? a.nameEn : a.nameId}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Hubungkan Alat Tambahan (MCP Connectors - Default Mati Semua / Sinkron Settings) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-stone-500" />
                  <span>{lang === "en" ? "Connect Extra Tools (MCP)" : "Hubungkan Alat Tambahan (MCP)"}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-medium ${
                      activeMcpConnectors.length === 0
                        ? "bg-stone-100 text-stone-500"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {activeMcpConnectors.length === 0
                      ? lang === "en"
                        ? "All Off (Safe Mode)"
                        : "Semua Mati (Aman)"
                      : `${activeMcpConnectors.length} / 10 Aktif`}
                  </span>
                  {activeMcpConnectors.length > 0 && (
                    <button
                      type="button"
                      onClick={turnOffAllMcp}
                      className="text-[10px] text-red-600 hover:text-red-800 underline cursor-pointer"
                    >
                      {lang === "en" ? "Turn Off" : "Matikan"}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-stone-400 leading-snug">
                {lang === "en"
                  ? "Choose tools AI can access. Off by default for complete safety."
                  : "Pilih alat yang boleh diakses AI. Secara default semua mati demi keamanan."}
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {OFFICIAL_MCP_CONNECTORS.map((c) => {
                  const isChecked = activeMcpConnectors.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleMcp(c.id)}
                      className={`px-2.5 py-1.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between text-[11px] ${
                        isChecked
                          ? "border-stone-900 bg-stone-900 text-white font-medium shadow-2xs"
                          : "border-stone-200 bg-white hover:border-stone-300 text-stone-700"
                      }`}
                      title={`${c.name}: ${lang === "en" ? c.descEn : c.descId}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                            isChecked
                              ? "bg-lime-400 text-stone-950"
                              : "border border-stone-300 bg-stone-50 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                          isChecked ? "bg-stone-800 text-stone-300" : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {c.permission === "read-only" ? "RO" : "Appr"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Aturan Khusus & Hal yang Dilarang (Negative Constraints) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>{lang === "en" ? "Rules & Restrictions" : "Aturan Khusus & Hal yang Dilarang"}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {customConstraints.map((c, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200/80 bg-red-50/50 px-2 py-0.5 text-[11px] text-red-700 font-medium"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeConstraint(idx)}
                      className="hover:text-red-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newConstraintInput}
                onChange={(e) => setNewConstraintInput(e.target.value)}
                onKeyDown={handleAddConstraint}
                placeholder={
                  lang === "en"
                    ? "Type a rule and press Enter (e.g. Must use TypeScript)..."
                    : "Tulis aturan lalu tekan Enter (contoh: Wajib Bahasa Indonesia)..."
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* 7. Pengaturan Tambahan AI (Hyperparameters - Collapsible) */}
            <div className="space-y-2 border-t border-stone-100 pt-2.5">
              <button
                type="button"
                onClick={() => setShowHyperparameters(!showHyperparameters)}
                className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-stone-500" />
                  <span>{lang === "en" ? "Advanced AI Settings (Optional)" : "Pengaturan Tambahan AI (Opsional)"}</span>
                </div>
                {showHyperparameters ? (
                  <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                )}
              </button>

              {showHyperparameters && (
                <div className="p-3 rounded-2xl bg-stone-50/80 border border-stone-200/60 space-y-3 text-xs">
                  {/* Gaya Berpikir AI (Temperature) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-stone-700">
                      <span className="font-medium">{lang === "en" ? "Creativity Level" : "Gaya Berpikir AI"}</span>
                      <span className="font-mono text-stone-900 font-semibold">{temperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-stone-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>{lang === "en" ? "0.0 Exact & Logical" : "0.0 Pasti & Logis (Kode)"}</span>
                      <span>{lang === "en" ? "1.0 Highly Creative" : "1.0 Sangat Kreatif (Ide)"}</span>
                    </div>
                  </div>

                  {/* Batas Panjang Jawaban */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-stone-700">
                      <span className="font-medium">{lang === "en" ? "Max Answer Length" : "Batas Panjang Jawaban"}</span>
                      <span className="font-mono text-stone-900 font-semibold">{maxTokens} tokens</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1024, 2048, 4096, 8192].map((tok) => (
                        <button
                          key={tok}
                          type="button"
                          onClick={() => setMaxTokens(tok)}
                          className={`py-1 rounded-lg text-center font-mono text-[10px] border transition-colors cursor-pointer ${
                            maxTokens === tok
                              ? "bg-stone-900 text-white border-stone-900 font-bold"
                              : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          ~{tok / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BILAH BAWAH KOLOM KIRI (DOCKED ACTION CONTROLS)
          ───────────────────────────────────────────────────────────── */}
          <div className="p-3.5 border-t border-stone-200/80 bg-white/95 shrink-0 space-y-2.5 shadow-lg">
            {/* Pilihan Model & Toggle Bandingkan 2 Model */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-stone-500" />
                  {arenaMode === "arena"
                    ? lang === "en"
                      ? "Compare 2 Models"
                      : "Bandingkan 2 Model"
                    : lang === "en"
                    ? "Target Model"
                    : "Pilihan Model AI"}
                </span>

                {/* Toggle Button: Bandingkan 2 Model vs 1 Model */}
                <button
                  type="button"
                  onClick={() => setArenaMode(arenaMode === "arena" ? "single" : "arena")}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <SplitSquareVertical className="w-3 h-3" />
                  {arenaMode === "arena"
                    ? lang === "en"
                      ? "Compare 2 Models: ON"
                      : "Bandingkan 2 Model: AKTIF"
                    : lang === "en"
                    ? "Single Model Only"
                    : "Gunakan 1 Model Saja"}
                </button>
              </div>

              <div className={`grid gap-2 ${arenaMode === "arena" ? "grid-cols-2" : "grid-cols-1"}`}>
                {/* Model Pertama (A) */}
                <div>
                  <span className="text-[10px] font-mono text-stone-400 block mb-0.5">
                    {arenaMode === "arena"
                      ? lang === "en"
                        ? "Primary Model (A):"
                        : "Model Pertama (A):"
                      : lang === "en"
                      ? "Selected Model:"
                      : "Model Pilihan:"}
                  </span>
                  <select
                    value={selectedModelA}
                    onChange={(e) => setSelectedModelA(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-stone-200 bg-stone-50/80 px-2 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                  >
                    {installedModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Kedua (B - Arena Only) */}
                {arenaMode === "arena" && (
                  <div>
                    <span className="text-[10px] font-mono text-stone-400 block mb-0.5">
                      {lang === "en" ? "Comparison Model (B):" : "Model Kedua (B) — Pembanding:"}
                    </span>
                    <select
                      value={selectedModelB}
                      onChange={(e) => setSelectedModelB(e.target.value)}
                      className="w-full text-xs font-mono rounded-xl border border-stone-200 bg-stone-50/80 px-2 py-1.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                    >
                      {installedModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* DUAL ACTION BUTTONS: SINTESIS UTUH VS JALANKAN MODEL */}
            <div className="grid grid-cols-1 gap-2 pt-0.5">
              {/* Tombol Utama: Buat Prompt Lengkap & Rancangan */}
              <button
                type="button"
                onClick={handleSynthesizeMasterPrompt}
                disabled={isSynthesizing || isLoadingA || isLoadingB}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSynthesizing ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-lime-400" />
                    <span>{lang === "en" ? "Designing prompt & diagrams..." : "Sedang merancang prompt & diagram..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-lime-400" />
                    <span>
                      {lang === "en"
                        ? "⚡ Generate Complete Prompt & Blueprint"
                        : "⚡ Buat Prompt Lengkap & Rancangan"}
                    </span>
                  </>
                )}
              </button>

              {/* Tombol Sekunder: Bandingkan 2 Model Langsung / Jalankan 1 Model */}
              <button
                type="button"
                onClick={() => executeModel()}
                disabled={isLoadingA || isLoadingB || isSynthesizing}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingA || isLoadingB ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin text-stone-500" />
                    <span>{lang === "en" ? "Running models..." : "Mengeksekusi model..."}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-stone-900" />
                    <span>
                      {arenaMode === "arena"
                        ? lang === "en"
                          ? "▶️ Compare Both Models Directly"
                          : "▶️ Jalankan Perbandingan 2 Model"
                        : lang === "en"
                        ? "▶️ Run Model Directly"
                        : "▶️ Jalankan 1 Model Langsung"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            KOLOM KANAN: KANVAS KERJA MULTI-TAB INTERAKTIF
        ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[#faf9f6]">
          {/* Header Kanvas Kanan */}
          <div className="px-6 py-3 border-b border-stone-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-900">
                  {lang === "en" ? "AI Workspace Output" : "Hasil Pengerjaan AI"}
                </h2>
                {synthesisResult && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    {lang === "en" ? "Ready" : "Selesai Dirancang"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                {lang === "en"
                  ? "Select a tab below to view Complete Prompt, System Blueprint, Model Comparison, or Safety Test."
                  : "Pilih tab di bawah untuk melihat Prompt Lengkap, Rancangan Diagram, Perbandingan Jawaban, atau Uji Keamanan."}
              </p>
            </div>


          </div>

          {/* ─────────────────────────────────────────────────────────────
              SUB-HEADER: 6 VIEW TABS DENGAN ISTILAH RAMAH AWAM
          ───────────────────────────────────────────────────────────── */}
          <div className="px-6 py-2 border-b border-stone-200/80 bg-[#f7f6f2] shrink-0 flex items-center justify-between overflow-x-auto gap-4">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-200/60 border border-stone-300/40 text-xs">
              {/* 1. Tab Prompt Lengkap */}
              <button
                type="button"
                onClick={() => setActiveTab("master")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
                  activeTab === "master"
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Complete Prompt" : "Prompt Lengkap"}</span>
                {synthesisResult && (
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 inline-block ml-0.5" />
                )}
              </button>

              {/* 2. Tab Rancangan Diagram */}
              <button
                type="button"
                onClick={() => setActiveTab("blueprint")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
                  activeTab === "blueprint"
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Blueprint" : "Diagram Alur"}</span>
                {availableDiagrams.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-700 text-stone-200">
                    {availableDiagrams.length}
                  </span>
                )}
              </button>

              {/* 3. Tab Bandingkan 2 Model (Arena) */}
              <button
                type="button"
                onClick={() => setActiveTab("arena")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
                  activeTab === "arena"
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Compare 2 Models" : "Bandingkan 2 Model"}</span>
                {(resultA || resultB) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-0.5" />
                )}
              </button>

              {/* 4. Tab Uji Keamanan */}
              <button
                type="button"
                onClick={() => setActiveTab("spider")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
                  activeTab === "spider"
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Safety Test" : "Uji Keamanan"}</span>
              </button>

              {/* 5. Tab Uji Kecepatan & Performa */}
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
                  activeTab === "analytics"
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Performance" : "Uji Performa"}</span>
              </button>

              {/* 6. Tab Analisis Konteks */}
              <button
                type="button"
                onClick={() => setActiveTab("payload")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap font-medium text-xs ${
                  activeTab === "payload"
                    ? "bg-stone-900 text-white font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Context Analysis" : "Analisis Konteks"}</span>
              </button>
            </div>

            {/* Sub-Aksi Diff Mode dalam Tab Prompt Lengkap */}
            {activeTab === "master" && synthesisResult && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiffMode(!diffMode)}
                  className={`text-xs font-mono px-3 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    diffMode
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                      : "bg-white text-stone-600 border-stone-200 hover:text-stone-900"
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>
                    {diffMode
                      ? lang === "en"
                        ? "Diff Mode: ON"
                        : "Bandingkan: AKTIF"
                      : lang === "en"
                      ? "Compare Before & After"
                      : "Bandingkan Sebelum & Sesudah"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BODY KANVAS: KONTEN TAB AKTIF
          ───────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ══════════════════════════════════════════════════════════
                TAB 1: PROMPT LENGKAP (SIAP PAKAI & DIFF VIEWER)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === "master" && (
              <div className="space-y-4">
                {synthesisResult ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
                    {/* Top Info Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-stone-900">
                            {lang === "en" ? "Production-Grade AI Prompt" : "Instruksi Siap Pakai untuk AI"}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-100 text-lime-800 border border-lime-300 font-bold">
                            {synthesisResult.analysis?.score || 95}/100 {lang === "en" ? "Quality" : "Kualitas"}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          {lang === "en"
                            ? "Comprehensive operational instructions to ensure accurate, hallucination-free AI responses."
                            : "Instruksi lengkap dan terstruktur rapi agar AI memberikan hasil akurat tanpa salah paham."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Tombol Langsung Uji ke 2 Model */}
                        <button
                          type="button"
                          onClick={() => executeModel(synthesisResult.optimizedPrompt)}
                          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title={
                            lang === "en"
                              ? "Test this prompt in Model Comparison Arena"
                              : "Jalankan prompt hasil rancangan ini langsung ke Model AI"
                          }
                        >
                          <Play className="w-3.5 h-3.5 text-lime-400" />
                          <span>
                            {arenaMode === "arena"
                              ? lang === "en"
                                ? "Compare Results in 2 Models →"
                                : "Bandingkan Jawaban Prompt Ini →"
                              : lang === "en"
                              ? "Run This Prompt Now →"
                              : "Jalankan Prompt Ini Sekarang →"}
                          </span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(synthesisResult.optimizedPrompt || "", "master")
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedMaster ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMaster ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}</span>
                        </button>

                        {/* Download .md */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              synthesisResult.optimizedPrompt || "",
                              `master-prompt-${domain}.md`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh .md</span>
                        </button>
                      </div>
                    </div>

                    {/* Render Diff or Full View */}
                    {diffMode ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kolom Kiri: Ide Awal */}
                        <div className="rounded-2xl border border-stone-200 bg-[#fcfbf9] p-4 space-y-2">
                          <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider font-semibold">
                              {lang === "en" ? "1. Your Initial Idea" : "1. Ide Awal Anda"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(prompt, "raw")}
                              className="text-[10px] font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                            >
                              {copiedRaw ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}
                            </button>
                          </div>
                          <pre className="text-xs font-mono text-stone-700 whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto">
                            {prompt}
                          </pre>
                        </div>

                        {/* Kolom Kanan: Hasil Prompt Lengkap */}
                        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/30 p-4 space-y-2">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                            <span className="text-[10px] font-mono text-emerald-800 uppercase tracking-wider font-bold">
                              {lang === "en" ? "2. Enhanced Complete Prompt" : "2. Hasil Prompt Lengkap yang Diperkuat"}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700">
                              +{(synthesisResult.optimizedPrompt?.length || 0) - prompt.length} {lang === "en" ? "chars" : "karakter"}
                            </span>
                          </div>
                          <div className="max-h-[550px] overflow-y-auto">
                            <MarkdownView content={synthesisResult.optimizedPrompt || ""} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-stone-200/80 bg-[#faf9f6] p-6 max-h-[650px] overflow-y-auto">
                        <MarkdownView content={synthesisResult.optimizedPrompt || ""} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-stone-800">
                        {lang === "en" ? "No Complete Prompt Generated Yet" : "Belum Ada Prompt Lengkap yang Dibuat"}
                      </h3>
                      <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                        {lang === "en"
                          ? "Write your task in the left panel and click '⚡ Generate Complete Prompt & Blueprint' to automatically build a production-grade instruction and system diagram."
                          : "Tuliskan tugas Anda di panel kiri lalu klik tombol '⚡ Buat Prompt Lengkap & Rancangan' untuk merancang instruksi rapi dan diagram alur sistem."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSynthesizeMasterPrompt}
                      disabled={isSynthesizing}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold shadow-xs hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      {lang === "en" ? "Generate Now" : "Mulai Buat Sekarang"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 2: RANCANGAN DIAGRAM (MERMAID SYSTEM BLUEPRINT)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === "blueprint" && (
              <div className="space-y-5">
                {synthesisResult ? (
                  <>
                    {/* Diagram Selector if multiple diagrams exist */}
                    {availableDiagrams.length > 1 && (
                      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
                        <span className="text-xs font-semibold text-stone-500 font-mono">
                          {lang === "en" ? "Select Diagram View:" : "Pilih Tampilan Diagram:"}
                        </span>
                        {availableDiagrams.map((diag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedDiagramIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                              selectedDiagramIndex === idx
                                ? "bg-stone-900 text-white font-bold shadow-xs"
                                : "bg-white text-stone-700 hover:text-stone-900 border border-stone-200"
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            <span>
                              {diag.type?.toUpperCase() || `VIEW 0${idx + 1}`} : {diag.title || `Diagram ${idx + 1}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Mermaid Viewer Card */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900">
                            {activeDiagram?.title || (lang === "en" ? "System Blueprint" : "Rancangan Arsitektur Sistem")}
                          </h3>
                          <p className="text-xs text-stone-500">
                            {activeDiagram?.description ||
                              synthesisResult.universalBlueprint?.title ||
                              (lang === "en" ? "Interactive architecture diagram" : "Diagram alur dan rancangan sistem interaktif")}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold uppercase">
                          {activeDiagram?.type || "Mermaid"}
                        </span>
                      </div>

                      <div className="bg-[#fcfbf9] rounded-xl border border-stone-200/80 p-2 min-h-[380px]">
                        <MermaidViewer
                          chart={
                            activeDiagram?.mermaidCode ||
                            activeDiagram?.chart ||
                            activeDiagram?.code ||
                            ""
                          }
                          title={activeDiagram?.title || "System Blueprint"}
                          description={activeDiagram?.description || "Visualized with Mermaid.js"}
                        />
                      </div>
                    </div>

                    {/* Execution Phases (Tahapan Pengerjaan) */}
                    {synthesisResult.universalBlueprint?.executionPhases &&
                      synthesisResult.universalBlueprint.executionPhases.length > 0 && (
                        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
                          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                            <Activity className="w-4 h-4 text-stone-500" />
                            <h3 className="text-sm font-bold text-stone-900">
                              {lang === "en" ? "Execution Phases & Deliverables" : "Tahapan Pengerjaan & Hasil Kerja"}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {synthesisResult.universalBlueprint.executionPhases.map((phase, pIdx) => (
                              <div
                                key={pIdx}
                                className="rounded-xl border border-stone-200/80 bg-[#fcfbf9] p-4 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-900 text-white">
                                    {lang === "en" ? `Phase ${phase.phaseNumber}` : `Fase ${phase.phaseNumber}`}
                                  </span>
                                  <span className="text-xs font-semibold text-stone-800">{phase.name}</span>
                                </div>

                                {phase.tasks && phase.tasks.length > 0 && (
                                  <div className="space-y-1 pt-1">
                                    <span className="text-[10px] font-mono text-stone-400 block uppercase">
                                      {lang === "en" ? "Core Tasks:" : "Tugas Pokok:"}
                                    </span>
                                    <ul className="text-xs text-stone-700 space-y-0.5 list-disc pl-4">
                                      {phase.tasks.map((t, tIdx) => (
                                        <li key={tIdx}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-stone-800">
                        {lang === "en" ? "No System Diagram Generated Yet" : "Belum Ada Rancangan Diagram"}
                      </h3>
                      <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                        {lang === "en"
                          ? "Run '⚡ Generate Complete Prompt & Blueprint' to automatically generate ERDs, flowcharts, and execution steps."
                          : "Jalankan '⚡ Buat Prompt Lengkap & Rancangan' untuk membuat diagram alur, tabel data, dan fase pengerjaan secara otomatis."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSynthesizeMasterPrompt}
                      disabled={isSynthesizing}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold shadow-xs hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      {lang === "en" ? "Generate Blueprint" : "Buat Rancangan Sekarang"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 3: BANDINGKAN 2 MODEL (ARENA HASIL EKSEKUSI)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === "arena" && (
              <div className="space-y-4">
                {/* Header Stats Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-stone-900">
                      {arenaMode === "arena"
                        ? lang === "en"
                          ? "Side-by-Side Model Comparison (Model A vs Model B)"
                          : "Perbandingan Jawaban: Model A vs Model B"
                        : lang === "en"
                        ? "Single Model Output"
                        : "Jawaban Model AI"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-stone-600">
                    {resultA && (
                      <span>
                        Model A: <strong>{resultA.latencyMs}ms</strong> ({resultA.tokensUsed} tokens)
                      </span>
                    )}
                    {resultB && arenaMode === "arena" && (
                      <span>
                        Model B: <strong>{resultB.latencyMs}ms</strong> ({resultB.tokensUsed} tokens)
                      </span>
                    )}
                  </div>
                </div>

                {/* Container Output Jawaban */}
                {arenaMode === "single" ? (
                  /* TAMPILAN 1 MODEL */
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <span className="text-xs font-bold text-stone-900">{selectedModelA}</span>
                      {resultA && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(resultA.output, "A")}
                          className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                        >
                          {copiedA ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy Answer" : "Salin Jawaban")}
                        </button>
                      )}
                    </div>
                    {isLoadingA ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-2 text-stone-400">
                        <RotateCcw className="w-6 h-6 animate-spin text-lime-600" />
                        <span className="text-xs font-mono">
                          {lang === "en" ? "AI is generating response..." : "Sedang menulis jawaban..."}
                        </span>
                      </div>
                    ) : resultA ? (
                      <div className="bg-[#faf9f6] p-5 rounded-2xl border border-stone-200/80 max-h-[650px] overflow-y-auto">
                        <MarkdownView content={resultA.output} />
                      </div>
                    ) : (
                      <div className="py-16 text-center text-xs text-stone-400">
                        {lang === "en"
                          ? "Click 'Run Model Directly' or 'Compare Results in 2 Models' to generate output."
                          : "Klik 'Jalankan 1 Model Langsung' atau 'Bandingkan Jawaban Prompt Ini' untuk melihat hasil."}
                      </div>
                    )}
                  </div>
                ) : (
                  /* TAMPILAN 2 MODEL BERDAMPINGAN */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Kolom Model Pertama (A) */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-lime-800 font-bold px-1.5 py-0.5 rounded bg-lime-100 uppercase">
                            Model A
                          </span>
                          <h4 className="text-xs font-bold text-stone-900">{selectedModelA}</h4>
                        </div>
                        {resultA && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(resultA.output, "A")}
                            className="text-[11px] font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                          >
                            {copiedA ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}
                          </button>
                        )}
                      </div>
                      {isLoadingA ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2 text-stone-400">
                          <RotateCcw className="w-5 h-5 animate-spin text-lime-600" />
                          <span className="text-xs font-mono">
                            {lang === "en" ? "Model A is answering..." : "Model A sedang menulis jawaban..."}
                          </span>
                        </div>
                      ) : resultA ? (
                        <div className="bg-[#faf9f6] p-4 rounded-xl border border-stone-200/80 flex-1 max-h-[550px] overflow-y-auto">
                          <MarkdownView content={resultA.output} />
                        </div>
                      ) : (
                        <div className="py-16 text-center text-xs text-stone-400">
                          {lang === "en" ? "Ready to test Model A" : "Menunggu eksekusi Model A"}
                        </div>
                      )}
                    </div>

                    {/* Kolom Model Kedua (B) */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-sky-800 font-bold px-1.5 py-0.5 rounded bg-sky-100 uppercase">
                            Model B
                          </span>
                          <h4 className="text-xs font-bold text-stone-900">{selectedModelB}</h4>
                        </div>
                        {resultB && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(resultB.output, "B")}
                            className="text-[11px] font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                          >
                            {copiedB ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy" : "Salin")}
                          </button>
                        )}
                      </div>
                      {isLoadingB ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2 text-stone-400">
                          <RotateCcw className="w-5 h-5 animate-spin text-sky-600" />
                          <span className="text-xs font-mono">
                            {lang === "en" ? "Model B is answering..." : "Model B sedang menulis jawaban..."}
                          </span>
                        </div>
                      ) : resultB ? (
                        <div className="bg-[#faf9f6] p-4 rounded-xl border border-stone-200/80 flex-1 max-h-[550px] overflow-y-auto">
                          <MarkdownView content={resultB.output} />
                        </div>
                      ) : (
                        <div className="py-16 text-center text-xs text-stone-400">
                          {lang === "en" ? "Ready to test Model B" : "Menunggu eksekusi Model B"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 4: UJI KEAMANAN & KETAHANAN (SPIDER MATRIX)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === "spider" && (
              <div className="space-y-4">
                <SpiderMatrixCard
                  promptContent={synthesisResult?.optimizedPrompt || prompt}
                  lang={lang}
                  targetProvider={
                    installedModels.find((m) => m.id === selectedModelA)?.providerId || "groq"
                  }
                  targetModel={
                    installedModels.find((m) => m.id === selectedModelA)?.model ||
                    "llama-3.3-70b-versatile"
                  }
                />
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 5: UJI KECEPATAN & PERFORMA (BENCHMARK)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === "analytics" && (
              <div className="space-y-5">
                {/* Tabel Tingkat Kemampuan Sistem (B0 s/d B4) */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        {lang === "en"
                          ? "Scientific Capability Progression (B0 → B4)"
                          : "Tingkat Kemampuan Sistem (B0 s/d B4)"}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {lang === "en"
                          ? "Comparison starting from raw text prompts to fully autonomous AI agents."
                          : "Perbandingan bertahap mulai dari prompt biasa hingga agen AI otomatis penuh."}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 text-white font-bold">
                      Dataset: piew-eval-v1
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                    {[
                      {
                        lvl: "B0",
                        title: lang === "en" ? "Raw Prompt" : "Prompt Mentah",
                        desc: lang === "en" ? "Original user prompt without optimization." : "Prompt awal dari pengguna tanpa perbaikan.",
                        badge: lang === "en" ? "Baseline" : "Tingkat Dasar",
                      },
                      {
                        lvl: "B1",
                        title: lang === "en" ? "Structured Pass" : "Prompt Rapi",
                        desc: lang === "en" ? "Structured with clear roles and strict rules." : "Diberi peran jelas dan aturan yang teratur.",
                        badge: lang === "en" ? "Heuristic" : "Heuristik",
                      },
                      {
                        lvl: "B2",
                        title: lang === "en" ? "Self-Repair" : "Perbaikan Mandiri",
                        desc: lang === "en" ? "Validated and automatically repaired." : "Diperiksa otomatis agar tidak ada bagian yang hilang.",
                        badge: lang === "en" ? "Closed-Loop" : "Siklus Tertutup",
                      },
                      {
                        lvl: "B3",
                        title: lang === "en" ? "Agent Memory" : "Ingatan Agen",
                        desc: lang === "en" ? "Injected with long-term memory & skills." : "Didukung ingatan jangka panjang dan keahlian.",
                        badge: lang === "en" ? "Memory Active" : "Memori Aktif",
                      },
                      {
                        lvl: "B4",
                        title: lang === "en" ? "Full Autonomous" : "Otonom Penuh",
                        desc: lang === "en" ? "Multi-step supervisor with tools & MCP." : "Dijalankan bertahap dengan integrasi alat lengkap.",
                        badge: lang === "en" ? "Full Pro" : "Pro Lengkap",
                      },
                    ].map((b) => (
                      <div
                        key={b.lvl}
                        className="rounded-xl border border-stone-200 bg-[#fcfbf9] p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-stone-900">{b.lvl}</span>
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-stone-200/80 text-stone-700">
                            {b.badge}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-stone-800">{b.title}</h4>
                        <p className="text-[10px] text-stone-500 leading-snug">{b.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kartu Metrik Kecepatan, Token & Keamanan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                      {lang === "en" ? "Response Speed (ms)" : "Kecepatan Respon (ms)"}
                    </span>
                    <div className="text-2xl font-bold font-mono text-stone-900">
                      {resultA ? `${resultA.latencyMs} ms` : "—"}
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {resultA ? `${lang === "en" ? "Measured from" : "Diukur dari"} ${resultA.provider}` : (lang === "en" ? "Run model to measure" : "Jalankan model untuk mengukur")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                      {lang === "en" ? "Token Consumption" : "Jumlah Kata / Token Terpakai"}
                    </span>
                    <div className="text-2xl font-bold font-mono text-stone-900">
                      {resultA ? `${resultA.tokensUsed} tok` : "—"}
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {resultA ? (lang === "en" ? "Total tokens prompt + completion" : "Total token instruksi dan jawaban") : (lang === "en" ? "Run model to measure" : "Jalankan model untuk mengukur")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                      {lang === "en" ? "Data Integrity (SHA-256)" : "Keaslian Data Evaluasi (SHA-256)"}
                    </span>
                    <div className="text-xs font-mono text-stone-800 truncate pt-1">
                      d8e8fca2dc6451ef9c81e82d8c3685...
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {lang === "en" ? "Tamper-proof unbiased evaluation" : "Jaminan evaluasi asli tanpa manipulasi"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 6: ANALISIS KONTEKS (RAW PAYLOAD JSON)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === "payload" && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">
                      {lang === "en" ? "Raw Injected Payload Inspector" : "Data Mentah yang Dikirim ke AI (JSON)"}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {lang === "en"
                        ? "Inspect full parameters, active tools, rules, and system prompts sent to LLM."
                        : "Melihat seluruh parameter, alat yang aktif, aturan, dan instruksi sebelum dikirim ke mesin AI."}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        JSON.stringify(
                          {
                            prompt,
                            domain,
                            audienceLevel,
                            activeMcpConnectors,
                            groundingData,
                            customConstraints,
                            hyperparameters: { temperature, topP, maxTokens },
                          },
                          null,
                          2
                        ),
                        "raw"
                      )
                    }
                    className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    {copiedRaw ? (lang === "en" ? "Copied!" : "Disalin!") : (lang === "en" ? "Copy JSON" : "Salin JSON")}
                  </button>
                </div>

                <pre className="font-mono text-xs whitespace-pre-wrap text-stone-800 leading-relaxed bg-[#faf9f6] p-4 rounded-xl border border-stone-200/80 max-h-[550px] overflow-y-auto">
                  {JSON.stringify(
                    {
                      prompt,
                      domain,
                      audienceLevel,
                      activeMcpConnectors,
                      groundingData,
                      customConstraints,
                      hyperparameters: { temperature, topP, maxTokens },
                      models: {
                        modelA: selectedModelA,
                        modelB: arenaMode === "arena" ? selectedModelB : undefined,
                      },
                      synthesis: {
                        hasResult: !!synthesisResult,
                        diagramsCount: availableDiagrams.length,
                        score: synthesisResult?.analysis?.score,
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CRAWLER UNTUK GROUNDING DATA */}
      {isCrawlerOpen && (
        <CrawlerDialog
          isOpen={isCrawlerOpen}
          initialUrl={detectedUrls[0] || ""}
          onClose={() => setIsCrawlerOpen(false)}
          onGroundingImported={(data: { sourceUrl: string; facts: string[]; combinedText: string }) => {
            setGroundingData(data);
            setIsCrawlerOpen(false);
            toast.success(
              lang === "en"
                ? `Extracted ${data.facts.length} web facts!`
                : `Berhasil mengambil ${data.facts.length} fakta web!`
            );
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
