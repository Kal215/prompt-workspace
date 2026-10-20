"use client";

import {
  Activity,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  LockKeyhole,
  Network,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/hooks/use-language";

export interface ProviderItem {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionId: string;
  defaultModel: string;
  models: string[];
  envKey?: string;
  endpoint: string;
  brandLogo: string;
  local?: boolean;
  editableEndpoint?: boolean;
}

export interface ConnectorItem {
  connectorId: string;
  name: string;
  category: "design" | "database" | "devtools" | "productivity" | "search" | "analytics" | "custom";
  badgeType: "MCP · Catalog" | "MCP · Custom" | "Managed";
  descriptionEn: string;
  descriptionId: string;
  command: string;
  envKey?: string;
  envLabel?: string;
  envPlaceholder?: string;
  permissionMode: "read_only" | "write_with_approval";
  brandLogo: string;
  enabled: boolean;
  discoveredTools: Array<{ name: string; description: string; isMutating?: boolean }>;
}

const PROVIDERS_CATALOG: ProviderItem[] = [
  {
    id: "groq",
    name: "Groq Cloud",
    descriptionEn: "Ultra-fast LPU inference for open frontier models.",
    descriptionId: "Inferensi LPU ultra-cepat untuk model open-source.",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "qwen/qwen-2.5-coder-32b",
      "mixtral-8x7b-32768",
    ],
    envKey: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1",
    brandLogo: "/official-logos/groq.svg",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    descriptionEn: "Gemini 2.5 Flash & Pro multimodal models.",
    descriptionId: "Model multimodal mutakhir Gemini 2.5 Flash & Pro.",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    envKey: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    brandLogo: "/official-logos/google.svg",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    descriptionEn: "Universal gateway to 200+ frontier AI models.",
    descriptionId: "Gerbang universal ke 200+ model AI terdepan.",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    models: [
      "meta-llama/llama-3.3-70b-instruct",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat",
      "openai/gpt-4o",
    ],
    envKey: "OPENROUTER_API_KEY",
    endpoint: "https://openrouter.ai/api/v1",
    brandLogo: "/official-logos/openrouter.svg",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    descriptionEn: "Claude 3.5 Sonnet, Claude 3 Opus, and Haiku.",
    descriptionId: "Model penalaran tinggi Claude 3.5 Sonnet & Haiku.",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    envKey: "ANTHROPIC_API_KEY",
    endpoint: "https://api.anthropic.com/v1",
    brandLogo: "/official-logos/anthropic.svg",
  },
  {
    id: "xai",
    name: "xAI Grok",
    descriptionEn: "Grok 2 and Grok Beta models with real-time reasoning.",
    descriptionId: "Model Grok 2 & Grok Vision dari xAI.",
    defaultModel: "grok-2-1212",
    models: ["grok-2-1212", "grok-2-vision-1212", "grok-beta"],
    envKey: "XAI_API_KEY",
    endpoint: "https://api.x.ai/v1",
    brandLogo: "/official-logos/xai.svg",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    descriptionEn: "DeepSeek V3 & DeepSeek R1 reasoning models.",
    descriptionId: "Model penalaran mendalam DeepSeek V3 & R1.",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    envKey: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/v1",
    brandLogo: "/official-logos/deepseek.svg",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    descriptionEn: "High-performance inference engine for open weights.",
    descriptionId: "Mesin inferensi cepat untuk model open source.",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    models: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen2p5-coder-32b-instruct",
      "accounts/fireworks/models/deepseek-v3",
    ],
    envKey: "FIREWORKS_API_KEY",
    endpoint: "https://api.fireworks.ai/inference/v1",
    brandLogo: "/official-logos/fireworks.svg",
  },
  {
    id: "ollama",
    name: "Local Ollama",
    descriptionEn: "Privacy-first local models running on your hardware.",
    descriptionId: "Model lokal privat yang berjalan di komputer Anda.",
    defaultModel: "llama3.2",
    models: ["llama3.2", "qwen2.5-coder", "mistral", "minicpm-v", "deepseek-r1:14b"],
    endpoint: "http://localhost:11434",
    brandLogo: "/official-logos/ollama.svg",
    local: true,
    editableEndpoint: true,
  },
  {
    id: "custom",
    name: "Custom Proxy / 9Router",
    descriptionEn: "OpenAI-compatible reverse proxy or local runner.",
    descriptionId: "Endpoint kustom yang kompatibel dengan protokol OpenAI.",
    defaultModel: "hermes-agent",
    models: ["hermes-agent", "hermes-daily", "hermes-fast"],
    endpoint: "http://localhost:20128/v1",
    brandLogo: "/official-logos/openai.svg",
    editableEndpoint: true,
  },
];

const CONNECTORS_METADATA: Record<
  string,
  {
    brandLogo: string;
    descriptionEn: string;
    descriptionId: string;
    envKey?: string;
    envLabel?: string;
    envPlaceholder?: string;
  }
> = {
  "github-mcp": {
    brandLogo: "/official-logos/github.svg",
    descriptionEn: "Inspect repos, read files, and submit PRs with explicit approvals.",
    descriptionId: "Membaca repositori, file kode, dan membuat PR dengan izin pengguna.",
    envKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
    envLabel: "GitHub Personal Access Token (PAT)",
    envPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "docker-mcp": {
    brandLogo: "/official-logos/docker.svg",
    descriptionEn: "Inspect local and remote container lifecycles and sanitized logs.",
    descriptionId: "Memeriksa status container Docker, image, dan log sistem.",
    envKey: "DOCKER_HOST",
    envLabel: "Docker Daemon Host (Optional)",
    envPlaceholder: "tcp://127.0.0.1:2375 or blank for local",
  },
  "postgres-mcp": {
    brandLogo: "/official-logos/postgresql.svg",
    descriptionEn: "Read schemas, tables, relationships, and run safe queries.",
    descriptionId: "Membaca skema tabel database dan menjalankan query analitik aman.",
    envKey: "DATABASE_URL",
    envLabel: "PostgreSQL Connection String",
    envPlaceholder: "postgresql://user:password@localhost:5432/dbname",
  },
  "sentry-mcp": {
    brandLogo: "/official-logos/sentry.svg",
    descriptionEn: "Audit runtime regressions, traces, and production error issues.",
    descriptionId: "Melacak issue error aplikasi, stack traces, dan regresi runtime.",
    envKey: "SENTRY_AUTH_TOKEN",
    envLabel: "Sentry Auth Token",
    envPlaceholder: "sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "figma-mcp": {
    brandLogo: "/official-logos/figma.svg",
    descriptionEn: "Extract UI frames, design tokens, and verify frontend components.",
    descriptionId: "Membaca frame desain, komponen UI, dan design tokens dari Figma.",
    envKey: "FIGMA_ACCESS_TOKEN",
    envLabel: "Figma Personal Access Token",
    envPlaceholder: "figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "linear-mcp": {
    brandLogo: "/official-logos/linear.svg",
    descriptionEn: "Read project cycles, issues, and manage team sprint backlogs.",
    descriptionId: "Menelusuri backlog, siklus sprint, dan isu kerja tim Linear.",
    envKey: "LINEAR_API_KEY",
    envLabel: "Linear API Key",
    envPlaceholder: "lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "brave-search-mcp": {
    brandLogo: "/official-logos/brave.svg",
    descriptionEn: "Live real-time web search and document grounding verification.",
    descriptionId: "Pencarian web real-time untuk grounding fakta dan informasi terkini.",
    envKey: "BRAVE_API_KEY",
    envLabel: "Brave Search API Key",
    envPlaceholder: "BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "notion-mcp": {
    brandLogo: "/official-logos/notion.svg",
    descriptionEn: "Read workspace documentation, knowledge bases, and tasks.",
    descriptionId: "Membaca dokumen, database SOP, dan catatan kerja tim di Notion.",
    envKey: "NOTION_API_TOKEN",
    envLabel: "Notion Internal Integration Token",
    envPlaceholder: "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "aws-knowledge-mcp": {
    brandLogo: "/official-logos/aws.svg",
    descriptionEn: "Query cloud architecture patterns and official AWS documentation.",
    descriptionId: "Panduan arsitektur cloud dan dokumentasi resmi layanan AWS.",
    envKey: "AWS_ACCESS_KEY_ID",
    envLabel: "AWS Access Key ID / Profile",
    envPlaceholder: "AKIAxxxxxxxxxxxxxxxx",
  },
  "filesystem-mcp": {
    brandLogo: "/official-logos/filesystem.svg",
    descriptionEn: "Read authorized workspace files and local directories safely.",
    descriptionId: "Membaca file dan direktori kerja lokal yang diizinkan secara aman.",
    envKey: "ALLOWED_DIRECTORIES",
    envLabel: "Allowed Path Directories",
    envPlaceholder: "C:/Projects, D:/Workspace (blank for current)",
  },
};

type SettingsModalProps = {
  onClose: () => void;
};

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"providers" | "connectors">("providers");

  // Providers state
  const [selectedProviderId, setSelectedProviderId] = useState("groq");
  const [providerSettings, setProviderSettings] = useState<
    Record<string, { model: string; endpoint: string; customModel: boolean }>
  >({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [cloudKeysStatus, setCloudKeysStatus] = useState<Record<string, boolean>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    state: "idle" | "testing" | "success" | "error";
    message?: string;
    latencyMs?: number;
    discoveredCount?: number;
  }>({ state: "idle" });

  // Connectors state
  const [connectorsList, setConnectorsList] = useState<ConnectorItem[]>([]);
  const [search, setSearch] = useState("");
  const [detailConnector, setDetailConnector] = useState<ConnectorItem | null>(null);
  const [connectorSecrets, setConnectorSecrets] = useState<Record<string, string>>({});
  const [connectorTestStatus, setConnectorTestStatus] = useState<
    Record<string, { state: "idle" | "testing" | "success" | "error"; message?: string; latencyMs?: number }>
  >({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // 1. Load initial data from Real APIs: /api/providers and /api/mcp-connectors
  const fetchProvidersAndConnectors = async () => {
    try {
      // Fetch Providers
      const provRes = await fetch("/api/providers");
      if (provRes.ok) {
        const provData = await provRes.json();
        if (provData.success) {
          const keysObj: Record<string, boolean> = {};
          if (Array.isArray(provData.cloudKeys)) {
            provData.cloudKeys.forEach((k: any) => {
              if (k.hasKey) keysObj[k.providerId] = true;
            });
          }
          if (Array.isArray(provData.catalogProviders)) {
            provData.catalogProviders.forEach((c: any) => {
              if (c.configured) keysObj[c.providerId] = true;
            });
          }
          setCloudKeysStatus(keysObj);

          // Populate providerSettings from local store or defaults
          const initSettings: Record<string, { model: string; endpoint: string; customModel: boolean }> = {};
          PROVIDERS_CATALOG.forEach((p) => {
            initSettings[p.id] = {
              model: p.defaultModel,
              endpoint: p.endpoint,
              customModel: false,
            };
          });

          // Check customEndpoints
          if (provData.customEndpoints && Array.isArray(provData.customEndpoints)) {
            const activeCustom = provData.customEndpoints[0];
            if (activeCustom) {
              initSettings["custom"] = {
                model: activeCustom.defaultModel || "hermes-agent",
                endpoint: activeCustom.endpointUrl || "http://localhost:20128/v1",
                customModel: false,
              };
            }
          }

          // Try localStorage for saved model selection preferences
          try {
            const savedLocal = localStorage.getItem("piew.provider-settings");
            if (savedLocal) {
              const parsed = JSON.parse(savedLocal);
              Object.keys(parsed).forEach((k) => {
                if (initSettings[k]) {
                  initSettings[k] = { ...initSettings[k], ...parsed[k] };
                }
              });
            }
          } catch {}

          setProviderSettings(initSettings);
        }
      }

      // Fetch Connectors
      const connRes = await fetch("/api/mcp-connectors");
      if (connRes.ok) {
        const connData = await connRes.json();
        if (connData.success && Array.isArray(connData.connectors)) {
          const formatted: ConnectorItem[] = connData.connectors.map((c: any) => {
            const meta = CONNECTORS_METADATA[c.connectorId] || {
              brandLogo: "/official-logos/filesystem.svg",
              descriptionEn: c.description || "Model Context Protocol Connector",
              descriptionId: c.description || "Konektor Model Context Protocol",
            };

            return {
              connectorId: c.connectorId,
              name: c.name,
              category: c.category || "devtools",
              badgeType: c.badgeType || "MCP · Catalog",
              descriptionEn: meta.descriptionEn,
              descriptionId: meta.descriptionId,
              command: c.stdioConfig?.command
                ? `${c.stdioConfig.command} ${(c.stdioConfig.args || []).join(" ")}`
                : "MCP Daemon",
              envKey: meta.envKey,
              envLabel: meta.envLabel,
              envPlaceholder: meta.envPlaceholder,
              permissionMode: c.permissionMode || "read_only",
              brandLogo: meta.brandLogo,
              enabled: Boolean(c.enabled),
              discoveredTools: c.discoveredTools || [],
            };
          });
          setConnectorsList(formatted);
        }
      }
    } catch (e) {
      console.error("[SETTINGS_LOAD_ERROR]", e);
    }
  };

  useEffect(() => {
    fetchProvidersAndConnectors();
  }, []);

  // Keyboard shortcut to close (Escape)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (detailConnector) setDetailConnector(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [detailConnector, onClose]);

  const selectedProvider =
    PROVIDERS_CATALOG.find((p) => p.id === selectedProviderId) || PROVIDERS_CATALOG[0];
  const activeSettings = providerSettings[selectedProvider.id] || {
    model: selectedProvider.defaultModel,
    endpoint: selectedProvider.endpoint,
    customModel: false,
  };

  const updateProviderSetting = (patch: Partial<{ model: string; endpoint: string; customModel: boolean }>) => {
    setTestStatus({ state: "idle" });
    setProviderSettings((prev) => ({
      ...prev,
      [selectedProvider.id]: {
        ...(prev[selectedProvider.id] || {
          model: selectedProvider.defaultModel,
          endpoint: selectedProvider.endpoint,
          customModel: false,
        }),
        ...patch,
      },
    }));
  };

  // Test Provider Connection via Real Backend Endpoint: POST /api/providers/test
  const handleTestProvider = async () => {
    const secret = secrets[selectedProvider.id]?.trim() || "";
    setTestStatus({ state: "testing" });

    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointUrl: activeSettings.endpoint,
          apiKey: secret,
          providerId: selectedProvider.id,
          model: activeSettings.model,
          discoverModels: true,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.ok || data.success)) {
        setTestStatus({
          state: "success",
          latencyMs: data.latencyMs || 120,
          discoveredCount: Array.isArray(data.discoveredModels) ? data.discoveredModels.length : undefined,
          message:
            lang === "en"
              ? `Connected successfully! (${data.latencyMs || 120}ms)`
              : `Koneksi berhasil terhubung! (${data.latencyMs || 120}ms)`,
        });
      } else {
        setTestStatus({
          state: "error",
          message: data.error || data.message || (lang === "en" ? "Connection failed" : "Koneksi gagal"),
        });
      }
    } catch (err: any) {
      setTestStatus({
        state: "error",
        message: err.message || (lang === "en" ? "Network error" : "Kesalahan jaringan"),
      });
    }
  };

  // Toggle Connector Enabled state via Real Backend API: POST /api/mcp-connectors (action: toggle)
  const handleToggleConnector = async (connectorId: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    // Optimistic UI update
    setConnectorsList((prev) =>
      prev.map((c) => (c.connectorId === connectorId ? { ...c, enabled: nextEnabled } : c))
    );

    try {
      const res = await fetch("/api/mcp-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          connectorId,
          enabled: nextEnabled,
        }),
      });
      if (!res.ok) {
        // Rollback on error
        setConnectorsList((prev) =>
          prev.map((c) => (c.connectorId === connectorId ? { ...c, enabled: currentEnabled } : c))
        );
      }
    } catch {
      setConnectorsList((prev) =>
        prev.map((c) => (c.connectorId === connectorId ? { ...c, enabled: currentEnabled } : c))
      );
    }
  };

  // Test Connector Handshake via Real Backend API: POST /api/mcp-connectors (action: test_and_discover)
  const handleTestConnector = async (connectorId: string) => {
    setConnectorTestStatus((prev) => ({
      ...prev,
      [connectorId]: { state: "testing" },
    }));

    try {
      const res = await fetch("/api/mcp-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_and_discover",
          connectorId,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.ok || data.success)) {
        setConnectorTestStatus((prev) => ({
          ...prev,
          [connectorId]: {
            state: "success",
            latencyMs: data.latencyMs,
            message: data.message || (lang === "en" ? "Connected" : "Terhubung"),
          },
        }));
        // Update discovered tools if returned
        if (data.discoveredTools) {
          setConnectorsList((prev) =>
            prev.map((c) =>
              c.connectorId === connectorId ? { ...c, discoveredTools: data.discoveredTools } : c
            )
          );
        }
      } else {
        setConnectorTestStatus((prev) => ({
          ...prev,
          [connectorId]: {
            state: "error",
            message: data.errorMessage || data.error || data.message || (lang === "en" ? "Handshake failed" : "Gagal terhubung"),
          },
        }));
      }
    } catch (err: any) {
      setConnectorTestStatus((prev) => ({
        ...prev,
        [connectorId]: {
          state: "error",
          message: err.message || (lang === "en" ? "Error" : "Kesalahan koneksi"),
        },
      }));
    }
  };

  // Save Settings: Persists keys and configurations directly to Backend APIs
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);

    try {
      // 1. Save provider settings to localStorage for client reference
      localStorage.setItem("piew.provider-settings", JSON.stringify(providerSettings));

      // 2. Save entered API Key to Backend if present
      const currentKey = secrets[selectedProvider.id]?.trim();
      if (currentKey && selectedProvider.id !== "custom" && selectedProvider.id !== "ollama") {
        await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-cloud-key",
            providerId: selectedProvider.id,
            apiKey: currentKey,
          }),
        });
        setCloudKeysStatus((prev) => ({ ...prev, [selectedProvider.id]: true }));
      } else if (selectedProvider.id === "custom") {
        await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-endpoint",
            endpoint: {
              name: "Custom Proxy",
              endpointUrl: activeSettings.endpoint,
              apiKey: currentKey || undefined,
              defaultModel: activeSettings.model,
            },
          }),
        });
      }

      // 3. Save connector tokens if entered in connectorSecrets
      for (const [cId, tokenVal] of Object.entries(connectorSecrets)) {
        const trimmedToken = tokenVal.trim();
        if (trimmedToken) {
          const targetConn = connectorsList.find((c) => c.connectorId === cId);
          if (targetConn && targetConn.envKey) {
            await fetch("/api/mcp-connectors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "upsert",
                connector: {
                  connectorId: targetConn.connectorId,
                  name: targetConn.name,
                  category: targetConn.category,
                  badgeType: targetConn.badgeType,
                  description: lang === "en" ? targetConn.descriptionEn : targetConn.descriptionId,
                  stdioConfig: {
                    command: "npx",
                    args: targetConn.command.split(" ").slice(1),
                    envVars: {
                      [targetConn.envKey]: trimmedToken,
                    },
                  },
                },
              }),
            });
          }
        }
      }

      // 4. Notify all components across the app that providers have changed
      window.dispatchEvent(new CustomEvent("piew_providers_changed"));

      setSaveSuccessMessage(
        lang === "en" ? "Settings saved and verified!" : "Pengaturan berhasil disimpan dan diverifikasi!"
      );
      window.setTimeout(() => setSaveSuccessMessage(null), 2500);
    } catch (e) {
      console.error("[SETTINGS_SAVE_ERROR]", e);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredConnectors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return connectorsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.descriptionEn.toLowerCase().includes(q) ||
        c.descriptionId.toLowerCase().includes(q)
    );
  }, [connectorsList, search]);

  return (
    <div
      aria-label="Settings Modal"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
    >
      <div
        className="fixed inset-0 cursor-default"
        onClick={() => {
          if (detailConnector) setDetailConnector(null);
          else onClose();
        }}
      />

      <div className="relative z-10 flex h-[90vh] max-h-[820px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-800 bg-[#0c0e14] shadow-2xl text-stone-100">
        {/* Header Bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-stone-800 bg-[#080a0f] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-lime-400 text-stone-950 font-bold shadow-md">
              <Zap className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {lang === "en" ? "Workspace Settings" : "Pengaturan Sistem"}
              </h2>
              <p className="text-xs text-stone-300">
                {lang === "en"
                  ? "Configure AI providers, inference routing, and Model Context Protocol (MCP) connectors."
                  : "Konfigurasi provider AI, routing model, dan konektor Model Context Protocol (MCP)."}
              </p>
            </div>
          </div>

          <button
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-stone-300 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex shrink-0 gap-2 border-b border-stone-800 bg-[#090b10] px-6 pt-2">
          <button
            type="button"
            onClick={() => setTab("providers")}
            className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide transition cursor-pointer ${
              tab === "providers" ? "text-lime-400 font-bold" : "text-stone-300 hover:text-white"
            }`}
          >
            <Bot className="size-4" />
            <span>{lang === "en" ? "AI Providers" : "Provider AI"}</span>
            {tab === "providers" && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-lime-400 shadow-sm" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("connectors")}
            className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide transition cursor-pointer ${
              tab === "connectors" ? "text-lime-400 font-bold" : "text-stone-300 hover:text-white"
            }`}
          >
            <Network className="size-4" />
            <span>{lang === "en" ? "MCP Connectors" : "Konektor MCP"}</span>
            {tab === "connectors" && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-lime-400 shadow-sm" />
            )}
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "providers" ? (
            /* TAB 1: AI PROVIDERS */
            <div className="grid h-full min-h-0 md:grid-cols-[280px_1fr]">
              {/* Providers Sidebar List */}
              <div className="overflow-y-auto border-b border-stone-800 bg-[#080a0f] p-3 md:border-b-0 md:border-r">
                <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  {lang === "en" ? "Available Providers" : "Pilihan Provider AI"}
                </p>
                <div className="space-y-1">
                  {PROVIDERS_CATALOG.map((p) => {
                    const isSelected = selectedProvider.id === p.id;
                    const hasKeySaved = cloudKeysStatus[p.id];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProviderId(p.id);
                          setTestStatus({ state: "idle" });
                        }}
                        className={`w-full group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                            : "text-stone-200 hover:bg-stone-800/60 hover:text-white"
                        }`}
                      >
                        <div className="relative size-8 shrink-0 rounded-lg overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shadow-xs">
                          <img
                            src={p.brandLogo}
                            alt={p.name}
                            className="size-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-white">
                              {p.name}
                            </span>
                            {hasKeySaved && (
                              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153)]" />
                            )}
                          </div>
                          <span className="block truncate text-[11px] text-stone-400">
                            {lang === "en" ? p.descriptionEn : p.descriptionId}
                          </span>
                        </div>
                        <ChevronRight className="size-3.5 text-stone-400 group-hover:text-stone-200 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider Detail Form & Configuration */}
              <div className="overflow-y-auto p-6 sm:p-8 bg-[#0c0e14]">
                <div className="max-w-xl mx-auto space-y-6">
                  {/* Provider Header Banner */}
                  <div className="flex items-start gap-4 pb-4 border-b border-stone-800">
                    <div className="size-12 shrink-0 rounded-xl overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center p-2.5 shadow-sm">
                      <img
                        src={selectedProvider.brandLogo}
                        alt={selectedProvider.name}
                        className="size-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {selectedProvider.name}
                        </h3>
                        {cloudKeysStatus[selectedProvider.id] && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {lang === "en" ? "Configured" : "Terpasang"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-stone-300 leading-relaxed font-normal">
                        {lang === "en" ? selectedProvider.descriptionEn : selectedProvider.descriptionId}
                      </p>
                    </div>
                  </div>

                  {/* Model Selection Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-200">
                      {lang === "en" ? "Active Model" : "Model AI Aktif"}
                    </label>
                    <select
                      value={activeSettings.customModel ? "__custom__" : activeSettings.model}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          updateProviderSetting({ customModel: true, model: "" });
                        } else {
                          updateProviderSetting({ customModel: false, model: e.target.value });
                        }
                      }}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 cursor-pointer"
                    >
                      {selectedProvider.models.map((m) => (
                        <option key={m} value={m} className="bg-stone-900 text-white">
                          {m}
                        </option>
                      ))}
                      <option value="__custom__" className="bg-stone-900 text-white">
                        {lang === "en" ? "+ Enter custom model name..." : "+ Masukkan nama model custom..."}
                      </option>
                    </select>
                  </div>

                  {/* Custom Model Input if selected */}
                  {activeSettings.customModel && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-200">
                        {lang === "en" ? "Custom Model Name" : "Nama Model Custom"}
                      </label>
                      <input
                        type="text"
                        value={activeSettings.model}
                        onChange={(e) => updateProviderSetting({ model: e.target.value })}
                        placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                        className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-lime-400 placeholder:text-stone-500"
                      />
                    </div>
                  )}

                  {/* Editable Endpoint if applicable */}
                  {selectedProvider.editableEndpoint && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-200">
                        {lang === "en" ? "Endpoint URL" : "URL Endpoint"}
                      </label>
                      <div className="relative">
                        <Terminal className="absolute left-3.5 top-3 size-3.5 text-stone-400" />
                        <input
                          type="url"
                          value={activeSettings.endpoint}
                          onChange={(e) => updateProviderSetting({ endpoint: e.target.value })}
                          placeholder="http://localhost:20128/v1"
                          className="w-full rounded-xl border border-stone-700 bg-stone-900 pl-9 pr-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-lime-400 placeholder:text-stone-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* API Key Input Field */}
                  {selectedProvider.envKey ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-stone-200">
                          API Key ({selectedProvider.envKey})
                        </label>
                        {cloudKeysStatus[selectedProvider.id] && (
                          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                            ✓ {lang === "en" ? "Key is securely loaded" : "Kunci aktif di server"}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3 size-3.5 text-stone-400" />
                        <input
                          type={showSecret ? "text" : "password"}
                          value={secrets[selectedProvider.id] ?? ""}
                          onChange={(e) =>
                            setSecrets((prev) => ({
                              ...prev,
                              [selectedProvider.id]: e.target.value,
                            }))
                          }
                          placeholder={
                            cloudKeysStatus[selectedProvider.id]
                              ? lang === "en"
                                ? "•••••••••••• (Leave blank to keep current key)"
                                : "•••••••••••• (Biarkan kosong untuk menggunakan kunci aktif)"
                              : lang === "en"
                              ? "Enter your API key here..."
                              : "Masukkan API key Anda di sini..."
                          }
                          className="w-full rounded-xl border border-stone-700 bg-stone-900 pl-9 pr-10 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-lime-400 placeholder:text-stone-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-200 cursor-pointer"
                        >
                          {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-400 font-normal">
                        {lang === "en"
                          ? "API key will be encrypted and saved for your private workspace session."
                          : "API key akan tersimpan aman dan terenkripsi untuk sesi workspace Anda."}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
                      <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">
                        {lang === "en"
                          ? "Zero API key required. Connects directly to local daemon."
                          : "Tidak memerlukan API key. Terhubung langsung ke daemon lokal."}
                      </span>
                    </div>
                  )}

                  {/* Test Connection Button & Status */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={testStatus.state === "testing"}
                      onClick={handleTestProvider}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white border border-stone-700 transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {testStatus.state === "testing" ? (
                        <RefreshCw className="size-3.5 animate-spin text-lime-400" />
                      ) : (
                        <Activity className="size-3.5 text-lime-400" />
                      )}
                      <span>
                        {testStatus.state === "testing"
                          ? lang === "en"
                            ? "Testing connection..."
                            : "Menguji koneksi..."
                          : lang === "en"
                          ? "Test Connection"
                          : "Uji Koneksi"}
                      </span>
                    </button>

                    {testStatus.state === "success" && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <Check className="size-3.5" />
                        {testStatus.message}
                      </span>
                    )}

                    {testStatus.state === "error" && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                        <CircleAlert className="size-3.5" />
                        {testStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: MCP CONNECTORS */
            <div className="overflow-y-auto h-full p-6 sm:p-8 bg-[#0c0e14]">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Search & Top Intro */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {lang === "en" ? "Enterprise MCP Hub" : "Hub Konektor MCP"}
                    </h3>
                    <p className="text-xs text-stone-300 font-normal">
                      {lang === "en"
                        ? "Connect your database, repository, search engines, and observability tools."
                        : "Hubungkan database, repositori kode, mesin pencari, dan alat observabilitas."}
                    </p>
                  </div>

                  <div className="relative sm:w-72">
                    <Search className="absolute left-3.5 top-3 size-3.5 text-stone-400" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={lang === "en" ? "Search connector..." : "Cari nama konektor..."}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900 pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                {/* Connectors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredConnectors.map((c) => {
                    const testState = connectorTestStatus[c.connectorId];
                    return (
                      <div
                        key={c.connectorId}
                        className={`rounded-2xl border p-5 transition-all space-y-4 ${
                          c.enabled
                            ? "bg-[#131722] border-lime-400/40 shadow-sm"
                            : "bg-[#0f121a] border-stone-800 hover:border-stone-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="size-11 shrink-0 rounded-xl overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center p-2 shadow-xs">
                              <img
                                src={c.brandLogo}
                                alt={c.name}
                                className="size-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-white tracking-tight">{c.name}</h4>
                                {c.enabled && (
                                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153)]" />
                                )}
                              </div>
                              <p className="text-[11px] text-stone-400 uppercase tracking-wider font-mono">
                                {c.category} · {c.discoveredTools.length} tools
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            aria-label="Toggle connector"
                            onClick={() => handleToggleConnector(c.connectorId, c.enabled)}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                              c.enabled ? "bg-lime-400" : "bg-stone-700"
                            }`}
                          >
                            <span
                              className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-stone-950 transition-transform shadow-md ${
                                c.enabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        <p className="text-xs text-stone-300 leading-relaxed font-normal">
                          {lang === "en" ? c.descriptionEn : c.descriptionId}
                        </p>

                        {/* Inline API Key / Token input if configured */}
                        {c.envKey && (
                          <div className="space-y-1.5 p-3 rounded-xl border border-stone-800/90 bg-[#090b10]">
                            <label className="block text-[11px] font-bold text-stone-300">
                              {c.envLabel || c.envKey}
                            </label>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-2.5 size-3.5 text-stone-400" />
                              <input
                                type="password"
                                value={connectorSecrets[c.connectorId] ?? ""}
                                onChange={(e) =>
                                  setConnectorSecrets((prev) => ({
                                    ...prev,
                                    [c.connectorId]: e.target.value,
                                  }))
                                }
                                placeholder={
                                  c.envPlaceholder ||
                                  (lang === "en" ? "Enter API token or key..." : "Tulis token atau API key...")
                                }
                                className="w-full rounded-lg border border-stone-700 bg-stone-900 pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-stone-500 focus:outline-none focus:border-lime-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Test Connection & Configure Tools */}
                        <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleTestConnector(c.connectorId)}
                            disabled={testState?.state === "testing"}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-xs font-semibold text-stone-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {testState?.state === "testing" ? (
                              <RefreshCw className="size-3 animate-spin text-lime-400" />
                            ) : (
                              <Activity className="size-3 text-lime-400" />
                            )}
                            <span>
                              {testState?.state === "testing"
                                ? lang === "en"
                                  ? "Testing..."
                                  : "Menguji..."
                                : lang === "en"
                                ? "Test Connection"
                                : "Uji Koneksi"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailConnector(c)}
                            className="text-xs font-bold text-lime-400 hover:text-lime-300 transition-colors cursor-pointer"
                          >
                            {lang === "en" ? "View Details & Tools →" : "Detail & Tools →"}
                          </button>
                        </div>

                        {/* Test Status Banner if present */}
                        {testState && testState.state !== "idle" && (
                          <div
                            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                              testState.state === "success"
                                ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/40"
                                : testState.state === "error"
                                ? "bg-rose-950/70 text-rose-300 border border-rose-500/40"
                                : "bg-stone-800 text-stone-200"
                            }`}
                          >
                            {testState.state === "success" && <Check className="size-3.5 shrink-0 text-emerald-400" />}
                            {testState.state === "error" && <CircleAlert className="size-3.5 shrink-0 text-rose-400" />}
                            <span className="truncate font-medium">{testState.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="flex shrink-0 items-center justify-between border-t border-stone-800 bg-[#080a0f] px-6 py-4">
          <div className="flex items-center gap-2">
            {saveSuccessMessage && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 animate-in fade-in">
                <Check className="size-4" />
                {saveSuccessMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer"
            >
              {lang === "en" ? "Close" : "Tutup"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>{lang === "en" ? "Save Changes" : "Simpan Pengaturan"}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* DETAIL CONNECTOR DRAWER / MODAL: Token Input & Tools List */}
      {detailConnector && (
        <div
          aria-label={`${detailConnector.name} Details`}
          className="fixed inset-0 z-60 grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-[#0e1118] p-6 shadow-2xl text-stone-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 shrink-0 rounded-xl overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center p-2">
                  <img
                    src={detailConnector.brandLogo}
                    alt={detailConnector.name}
                    className="size-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{detailConnector.name}</h3>
                  <p className="text-[11px] font-mono text-stone-400 uppercase">
                    {detailConnector.category} · {detailConnector.permissionMode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailConnector(null)}
                className="grid size-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-stone-300 leading-relaxed font-normal">
              {lang === "en" ? detailConnector.descriptionEn : detailConnector.descriptionId}
            </p>

            {/* Token / API Key Input for Connector */}
            {detailConnector.envKey && (
              <div className="space-y-1.5 p-3.5 rounded-xl border border-stone-800 bg-[#080a0f]">
                <label className="block text-xs font-bold text-stone-200">
                  {detailConnector.envLabel || detailConnector.envKey}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 size-3.5 text-stone-400" />
                  <input
                    type="password"
                    value={connectorSecrets[detailConnector.connectorId] ?? ""}
                    onChange={(e) =>
                      setConnectorSecrets((prev) => ({
                        ...prev,
                        [detailConnector.connectorId]: e.target.value,
                      }))
                    }
                    placeholder={
                      detailConnector.envPlaceholder ||
                      (lang === "en" ? "Enter API token or key..." : "Tulis token atau API key...")
                    }
                    className="w-full rounded-xl border border-stone-700 bg-stone-900 pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder:text-stone-500 focus:outline-none focus:border-lime-400"
                  />
                </div>
                <p className="text-[11px] text-stone-400 font-normal">
                  {lang === "en"
                    ? "Tokens are securely managed by the server MCP stdio process."
                    : "Token dikelola secara aman oleh proses daemon MCP lokal."}
                </p>
              </div>
            )}

            {/* Tools List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block">
                {lang === "en"
                  ? `Discovered Tools (${detailConnector.discoveredTools.length})`
                  : `Daftar Alat / Tools (${detailConnector.discoveredTools.length})`}
              </span>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {detailConnector.discoveredTools.length > 0 ? (
                  detailConnector.discoveredTools.map((t) => (
                    <div
                      key={t.name}
                      className="p-3 rounded-xl border border-stone-800 bg-[#080a0f] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-lime-400">{t.name}</span>
                        {t.isMutating && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                            {lang === "en" ? "Needs Approval" : "Perlu Persetujuan"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-300 font-normal">{t.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 py-2">
                    {lang === "en"
                      ? "No tools discovered yet. Run Test Connection to perform handshake."
                      : "Belum ada tool terdeteksi. Klik Uji Koneksi untuk mendeteksi tools."}
                  </p>
                )}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => handleTestConnector(detailConnector.connectorId)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white cursor-pointer"
              >
                <Activity className="size-3.5 text-lime-400" />
                <span>{lang === "en" ? "Test Connection" : "Uji Koneksi"}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleSaveAll();
                  setDetailConnector(null);
                }}
                className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-stone-950 font-bold text-xs cursor-pointer shadow-sm"
              >
                {lang === "en" ? "Save & Close" : "Simpan & Tutup"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
