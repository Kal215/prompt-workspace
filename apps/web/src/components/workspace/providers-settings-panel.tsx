"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Globe,
  HardDrive,
  User,
  Search,
  ExternalLink,
  Check,
  Trash2,
  Zap,
  Save,
  Plus,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Plug,
} from "lucide-react";
import {
  CloudProviderMeta,
  CustomEndpointConfig,
} from "../../lib/providers-store";

export interface ProvidersSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider?: (providerId: string, model?: string) => void;
  initialTab?: "accounts" | "api-keys" | "custom-endpoints" | "local-models";
  onSwitchToConnectors?: () => void;
}

type SettingsTab = "accounts" | "api-keys" | "custom-endpoints" | "local-models";

type ApiMode = "Auto-detect" | "Chat Completions" | "Responses API" | "Anthropic Messages";

export function ProvidersSettingsModal({
  isOpen,
  onClose,
  onSelectProvider,
  onSwitchToConnectors,
  initialTab = "api-keys",
}: ProvidersSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isProvidersGroupOpen, setIsProvidersGroupOpen] = useState(true);

  // Data state
  const [cloudKeys, setCloudKeys] = useState<CloudProviderMeta[]>([]);
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpointConfig[]>([]);
  const [activeEndpointId, setActiveEndpointId] = useState<string | null>(null);
  const [_isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>("openrouter");

  // Inline Quick Input State
  const [quickKeyInputs, setQuickKeyInputs] = useState<Record<string, string>>({});
  const [savingKeyId, setSavingKeyId] = useState<string | null>(null);
  const [saveKeySuccessId, setSaveKeySuccessId] = useState<string | null>(null);

  // Form State for Custom Endpoints
  const [formMode, setFormMode] = useState<"new" | "edit">("new");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formProviderId, setFormProviderId] = useState("");
  const [formEndpointUrl, setFormEndpointUrl] = useState("http://100.127.180.57:20128/v1");
  const [formApiMode, setFormApiMode] = useState<ApiMode>("Chat Completions");
  const [formDefaultModel, setFormDefaultModel] = useState("hermes-agent");
  const [formContext, setFormContext] = useState("Auto");
  const [formApiKey, setFormApiKey] = useState("");
  const [formUseForNewChats, setFormUseForNewChats] = useState(true);
  const [formDiscoverModels, setFormDiscoverModels] = useState(true);

  // Test Endpoint State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "failed";
    message?: string;
    latencyMs?: number;
    models?: string[];
  }>({ status: "idle" });

  // Discovered models dropdown helper
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [endpointSaveNotice, setEndpointSaveNotice] = useState<string | null>(null);

  // Local Ollama State
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  // Smart Cascade Failover & Health State
  const [healthReport, setHealthReport] = useState<any>(null);
  const [cascadeChain, setCascadeChain] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Fetch Providers Data from /api/providers
  const fetchProvidersData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/providers");
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.cloudKeys)) {
          setCloudKeys(json.cloudKeys);
        }
        if (Array.isArray(json.customEndpoints)) {
          setCustomEndpoints(json.customEndpoints);
          if (json.activeEndpointId) {
            setActiveEndpointId(json.activeEndpointId);
          }
        }
        if (json.health) {
          setHealthReport(json.health);
        }
        if (Array.isArray(json.cascadeChain)) {
          setCascadeChain(json.cascadeChain);
        }
      }
    } catch (err) {
      console.warn("[PROVIDERS_SETTINGS_FETCH_WARN]", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentTime(Date.now());
      fetchProvidersData();
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  // Sync Form when selecting an endpoint to edit
  const loadEndpointIntoForm = (ep: CustomEndpointConfig) => {
    setFormMode("edit");
    setSelectedEndpointId(ep.id);
    setFormName(ep.name);
    setFormProviderId(ep.providerId);
    setFormEndpointUrl(ep.endpointUrl);
    setFormApiMode(ep.apiMode as ApiMode);
    setFormDefaultModel(ep.defaultModel);
    setFormContext(ep.context || "Auto");
    setFormApiKey(""); // Kosongkan agar placeholder "Leave blank to keep current key" muncul
    setFormUseForNewChats(ep.useForNewChats);
    setFormDiscoverModels(ep.discoverModels);
    setTestResult({ status: "idle" });
  };

  const resetFormToNew = () => {
    setFormMode("new");
    setSelectedEndpointId(null);
    setFormName("");
    setFormProviderId("");
    setFormEndpointUrl("http://100.127.180.57:20128/v1");
    setFormApiMode("Chat Completions");
    setFormDefaultModel("hermes-agent");
    setFormContext("Auto");
    setFormApiKey("");
    setFormUseForNewChats(true);
    setFormDiscoverModels(true);
    setTestResult({ status: "idle" });
  };

  // Auto-slug provider ID when typing Name in "new" mode
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (formMode === "new") {
      const slug = val.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
      setFormProviderId(slug);
    }
  };

  // Save Cloud API Key
  const handleSaveCloudKey = async (providerId: string, explicitKey?: string) => {
    const keyToSave = explicitKey !== undefined ? explicitKey : (quickKeyInputs[providerId] || "");
    setSavingKeyId(providerId);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-cloud-key",
          providerId,
          apiKey: keyToSave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveKeySuccessId(providerId);
        setTimeout(() => setSaveKeySuccessId(null), 2500);
        await fetchProvidersData();
        setQuickKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      }
    } catch (err) {
      console.error("[SAVE_KEY_ERROR]", err);
    } finally {
      setSavingKeyId(null);
    }
  };

  // Test Endpoint Connection & Discover Models
  const handleTestEndpoint = async () => {
    if (!formEndpointUrl.trim()) return;
    setIsTesting(true);
    setTestResult({ status: "idle" });
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointUrl: formEndpointUrl.trim(),
          apiKey: formApiKey.trim() || undefined,
          endpointId: selectedEndpointId || undefined,
          apiMode: formApiMode,
          discoverModels: formDiscoverModels,
        }),
      });
      const data = await res.json();
      if (data.success && data.status === "connected") {
        setTestResult({
          status: "success",
          latencyMs: data.latencyMs,
          message: data.message || `Terhubung (${data.latencyMs}ms)`,
          models: data.models,
        });
        if (Array.isArray(data.models) && data.models.length > 0) {
          setDiscoveredModels(data.models);
          if (formDiscoverModels && !formDefaultModel) {
            setFormDefaultModel(data.models[0]);
          }
        }
      } else {
        setTestResult({
          status: "failed",
          latencyMs: data.latencyMs,
          message: data.error || "Gagal menghubungi endpoint. Periksa koneksi atau URL.",
        });
      }
    } catch (err) {
      setTestResult({
        status: "failed",
        message: (err as Error).message || "Koneksi gagal",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Custom Endpoint
  const handleSaveEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEndpointUrl.trim()) return;

    setIsSavingEndpoint(true);
    setEndpointSaveNotice(null);
    try {
      const payload = {
        action: "save-endpoint",
        endpoint: {
          id: selectedEndpointId || formProviderId || formName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"),
          name: formName.trim(),
          providerId: formProviderId.trim() || formName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"),
          endpointUrl: formEndpointUrl.trim(),
          apiMode: formApiMode,
          defaultModel: formDefaultModel.trim() || "default",
          context: formContext.trim() || "Auto",
          apiKey: formApiKey.trim(),
          useForNewChats: formUseForNewChats,
          discoverModels: formDiscoverModels,
          isActive: formUseForNewChats,
        },
      };

      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setEndpointSaveNotice(`Endpoint "${payload.endpoint.name}" berhasil disimpan!`);
        setTimeout(() => setEndpointSaveNotice(null), 3000);
        await fetchProvidersData();

        // Sinkronisasi langsung ke selector workspace utama jika dicentang 'Use for new chats'
        if (formUseForNewChats && onSelectProvider) {
          onSelectProvider(payload.endpoint.id, payload.endpoint.defaultModel);
        }

        resetFormToNew();
      } else {
        setEndpointSaveNotice(`Gagal menyimpan: ${data.error || "Error tidak diketahui"}`);
      }
    } catch (err) {
      setEndpointSaveNotice(`Error: ${(err as Error).message}`);
    } finally {
      setIsSavingEndpoint(false);
    }
  };

  // Set Active Endpoint ('⚡ Use')
  const handleUseEndpoint = async (ep: CustomEndpointConfig) => {
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use-endpoint", id: ep.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveEndpointId(ep.id);
        setCustomEndpoints((prev) =>
          prev.map((e) => ({ ...e, isActive: e.id === ep.id }))
        );
        if (onSelectProvider) {
          onSelectProvider(ep.id, ep.defaultModel);
        }
      }
    } catch (err) {
      console.error("[USE_ENDPOINT_ERROR]", err);
    }
  };

  // Delete Custom Endpoint
  const handleDeleteEndpoint = async (id: string, name: string) => {
    if (!confirm(`Hapus endpoint "${name}"?`)) return;
    try {
      const res = await fetch(`/api/providers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (selectedEndpointId === id) {
          resetFormToNew();
        }
        await fetchProvidersData();
      }
    } catch (err) {
      console.error("[DELETE_ENDPOINT_ERROR]", err);
    }
  };

  // Check Local Ollama
  const handleCheckOllama = async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointUrl: "http://127.0.0.1:11434" }),
      });
      const data = await res.json();
      if (data.success) {
        setOllamaStatus("online");
        if (Array.isArray(data.models)) {
          setOllamaModels(data.models);
        }
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
    }
  };

  // Filtered cloud providers based on search
  const filteredCloudProviders = useMemo(() => {
    if (!searchQuery.trim()) return cloudKeys;
    const q = searchQuery.toLowerCase();
    return cloudKeys.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.providerId.toLowerCase().includes(q)
    );
  }, [cloudKeys, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="providers-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl h-[640px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Settings</span>
                <span className="text-xs text-zinc-400">&gt;</span>
                <h2
                  id="providers-settings-title"
                  className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                >
                  Providers
                </h2>
                {activeEndpointId && (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                    Active: {activeEndpointId}
                  </span>
                )}

                {onSwitchToConnectors && (
                  <div className="hidden sm:flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5 rounded-lg ml-2">
                    <span className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-zinc-900 font-semibold shadow-2xs text-foreground font-mono">
                      ⚡ Providers
                    </span>
                    <button
                      type="button"
                      onClick={onSwitchToConnectors}
                      className="px-2 py-0.5 text-[11px] rounded text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-zinc-800 transition-colors font-mono cursor-pointer"
                    >
                      🔌 Connectors
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Konfigurasi kunci API cloud, OpenAI-compatible custom endpoints, dan model lokal.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Body: 2 Columns (Sidebar + Content View) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/20 p-3 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-1">
              {/* Group Collapsible: ⚡ Providers */}
              <button
                type="button"
                onClick={() => setIsProvidersGroupOpen(!isProvidersGroupOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Providers</span>
                </div>
                {isProvidersGroupOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {isProvidersGroupOpen && (
                <div className="space-y-0.5 pl-2">
                  {/* Item 1: Accounts */}
                  <button
                    type="button"
                    data-testid="tab-providers-accounts"
                    onClick={() => setActiveTab("accounts")}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === "accounts"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Accounts</span>
                  </button>

                  {/* Item 2: API keys */}
                  <button
                    type="button"
                    data-testid="tab-providers-api-keys"
                    onClick={() => setActiveTab("api-keys")}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === "api-keys"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5" />
                      <span>API keys</span>
                    </div>
                    {cloudKeys.filter((k) => k.hasKey).length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>

                  {/* Item 3: Custom Endpoints */}
                  <button
                    type="button"
                    data-testid="tab-providers-custom-endpoints"
                    onClick={() => setActiveTab("custom-endpoints")}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === "custom-endpoints"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Custom Endpoints</span>
                    </div>
                    {customEndpoints.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {customEndpoints.length}
                      </span>
                    )}
                  </button>

                  {/* Item 4: Local Models */}
                  <button
                    type="button"
                    data-testid="tab-providers-local-models"
                    onClick={() => setActiveTab("local-models")}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === "local-models"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Local Models</span>
                  </button>
                </div>
              )}

              {/* Group / Tab: 🔌 Connectors Hub (MCP) */}
              {onSwitchToConnectors && (
                <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    data-testid="sidebar-connectors-hub-tab"
                    onClick={onSwitchToConnectors}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Plug className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Connectors (MCP)</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Hub
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar Footer Info */}
            <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] text-zinc-400 font-mono">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero Secret Leak</span>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                Kunci API dienkripsi dan tidak pernah diekspos balik ke browser.
              </p>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* VIEW 1: API KEYS */}
            {activeTab === "api-keys" && (
              <div className="space-y-4">
                {/* Top Shortcut Banner: Local / custom endpoint */}
                <div
                  onClick={() => setActiveTab("custom-endpoints")}
                  className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      <span>Local / custom endpoint</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Point PIEW at any OpenAI-compatible endpoint (Zyphra, vLLM, llama.cpp, Ollama, etc).
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                </div>

                {/* Smart Cascade Failover Pool Strip Indicator */}
                <div
                  data-testid="smart-cascade-pool-strip"
                  className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-500/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-sky-500" />
                      <span>Smart Cascade Failover Pool (Auto-Failover Sequence)</span>
                    </div>
                    <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold uppercase">
                      0ms Fast-Skip Cooldown
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {(cascadeChain.length > 0
                      ? cascadeChain
                      : [
                          { id: "custom", name: "Custom Endpoint" },
                          { id: "groq", name: "Groq LPU" },
                          { id: "gemini", name: "Google Gemini" },
                          { id: "openrouter", name: "OpenRouter" },
                          { id: "ollama", name: "Local Ollama" },
                        ]
                    ).map((p, idx) => {
                      const pHealth = healthReport?.providers?.[p.id];
                      const isCooldown = pHealth?.status === "COOLDOWN";
                      const cooldownRemaining = isCooldown
                        ? Math.max(
                            0,
                            Math.ceil(((pHealth.cooldownUntil || 0) - (currentTime || 0)) / 1000)
                          )
                        : 0;

                      return (
                        <React.Fragment key={p.id}>
                          {idx > 0 && <span className="text-neutral-400 text-[10px]">&rarr;</span>}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background shadow-2xs">
                            <span className="text-foreground font-medium">{p.name}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isCooldown ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                              }`}
                            />
                            <span
                              className={`text-[10px] font-bold ${
                                isCooldown
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isCooldown ? `COOLDOWN (${cooldownRemaining}s)` : "HEALTHY"}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search providers..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Providers List (Accordion Rows) */}
                <div className="space-y-2">
                  {filteredCloudProviders.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-400">
                      Tidak ada penyedia yang cocok dengan pencarian.
                    </div>
                  ) : (
                    filteredCloudProviders.map((p) => {
                      const isExpanded = expandedProviderId === p.providerId;
                      const currentQuickInput = quickKeyInputs[p.providerId] ?? "";
                      const isSaving = savingKeyId === p.providerId;
                      const isSuccess = saveKeySuccessId === p.providerId;

                      return (
                        <div
                          key={p.providerId}
                          className={`rounded-xl border transition-all ${
                            isExpanded
                              ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 shadow-xs"
                              : "border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          {/* Row Header */}
                          <div className="p-3 flex items-center justify-between gap-3">
                            <div
                              onClick={() =>
                                setExpandedProviderId(isExpanded ? null : p.providerId)
                              }
                              className="flex items-center gap-2.5 cursor-pointer flex-1"
                            >
                              {/* Status Dot */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  p.hasKey ? "bg-emerald-500 shadow-xs" : "bg-zinc-300 dark:bg-zinc-700"
                                }`}
                                title={p.hasKey ? "Key terkonfigurasi" : "Belum ada key"}
                              />
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                {p.name}
                              </span>
                              {p.hasKey && (
                                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                  Configured
                                </span>
                              )}
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-zinc-400 ml-auto transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </div>

                            {/* Quick Input on the Right: Paste <Provider> key */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="password"
                                value={currentQuickInput}
                                onChange={(e) =>
                                  setQuickKeyInputs((prev) => ({
                                    ...prev,
                                    [p.providerId]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && currentQuickInput.trim()) {
                                    handleSaveCloudKey(p.providerId, currentQuickInput.trim());
                                  }
                                }}
                                placeholder={
                                  p.hasKey && p.maskedKey
                                    ? p.maskedKey
                                    : `Paste ${p.name} key...`
                                }
                                className="text-xs font-mono px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 w-44 sm:w-56 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                              />
                              {currentQuickInput.trim() && (
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() =>
                                    handleSaveCloudKey(p.providerId, currentQuickInput.trim())
                                  }
                                  className="p-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-600 cursor-pointer"
                                  title="Simpan Kunci"
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                              {isSuccess && (
                                <span className="text-[10px] text-emerald-500 font-medium">Saved!</span>
                              )}
                            </div>
                          </div>

                          {/* Accordion Expanded Details */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                  {p.description}
                                </p>
                                <a
                                  href={p.docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                                >
                                  <span>Get a key</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              <div className="p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-zinc-500">Status Kunci:</span>
                                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                    {p.hasKey ? (
                                      <span className="text-emerald-500 font-semibold">
                                        Aktif ({p.maskedKey || "Tersimpan"})
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">Belum dipasang</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-zinc-500">Variabel Environment:</span>
                                  <code className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                    ${p.envVarName}
                                  </code>
                                </div>
                                {p.hasKey && (
                                  <div className="pt-2 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveCloudKey(p.providerId, "")}
                                      className="text-[11px] text-red-500 hover:text-red-600 cursor-pointer flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Hapus Kunci</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: CUSTOM ENDPOINTS */}
            {activeTab === "custom-endpoints" && (
              <div className="space-y-5">
                {/* Breadcrumb & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <span>Settings</span>
                    <span>&gt;</span>
                    <span>Providers</span>
                    <span>&gt;</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                      Custom Endpoints
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                    {customEndpoints.length} Active Endpoints
                  </span>
                </div>

                {/* Notification */}
                {endpointSaveNotice && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{endpointSaveNotice}</span>
                  </div>
                )}

                {/* Saved Endpoints Cards List */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider">
                    Daftar Kartu Endpoint Tersimpan:
                  </span>

                  {customEndpoints.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-400">
                      Belum ada custom endpoint. Gunakan form di bawah untuk membuat baru.
                    </div>
                  ) : (
                    customEndpoints.map((ep) => {
                      const isActive = ep.id === activeEndpointId || ep.isActive;
                      return (
                        <div
                          key={ep.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div
                            onClick={() => loadEndpointIntoForm(ep)}
                            className="space-y-1 cursor-pointer flex-1"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {ep.name}
                              </span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Active
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {ep.apiMode}
                              </span>
                            </div>

                            <div className="font-mono text-[11px] text-zinc-500 break-all">
                              {ep.endpointUrl}
                            </div>

                            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                              <span>model: <strong className="text-zinc-700 dark:text-zinc-300">{ep.defaultModel}</strong></span>
                              <span>&bull;</span>
                              <span>key: {ep.apiKeyRef || (ep.apiKey ? "${CUSTOM_KEY}" : "none")}</span>
                            </div>
                          </div>

                          {/* Action Buttons: ⚡ Use & 🗑️ */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              data-testid="use-endpoint-btn"
                              onClick={() => handleUseEndpoint(ep)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                isActive
                                  ? "bg-amber-500 text-black shadow-xs"
                                  : "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                              }`}
                            >
                              <Zap className="w-3 h-3" />
                              <span>{isActive ? "In Use" : "⚡ Use"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteEndpoint(ep.id, ep.name)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Hapus Endpoint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Form + Edit / + New Endpoint */}
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-amber-500" />
                      <span>{formMode === "edit" ? `Edit Endpoint: ${formName}` : "+ New Endpoint"}</span>
                    </span>
                    {formMode === "edit" && (
                      <button
                        type="button"
                        onClick={resetFormToNew}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        New endpoint
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveEndpoint} className="space-y-3">
                    {/* Baris 1 (2 Kolom): Name & Provider ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Name:
                        </label>
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="lyra pc"
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Provider ID:
                        </label>
                        <input
                          type="text"
                          required
                          value={formProviderId}
                          onChange={(e) => setFormProviderId(e.target.value)}
                          placeholder="lyra-pc"
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                        />
                      </div>
                    </div>

                    {/* Baris 2 (Penuh): Endpoint URL */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Endpoint URL:
                      </label>
                      <input
                        type="url"
                        required
                        value={formEndpointUrl}
                        onChange={(e) => setFormEndpointUrl(e.target.value)}
                        placeholder="http://100.127.180.57:20128/v1"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>

                    {/* Baris 3 (Segmented Bar 4 Pilihan): API Mode */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                        API Mode:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        {(["Auto-detect", "Chat Completions", "Responses API", "Anthropic Messages"] as ApiMode[]).map(
                          (mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setFormApiMode(mode)}
                              className={`py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                                formApiMode === mode
                                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              }`}
                            >
                              {mode}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Baris 4 (2 Kolom): Default Model & Context */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Default Model:
                        </label>
                        {discoveredModels.length > 0 ? (
                          <div className="flex gap-1.5">
                            <select
                              value={formDefaultModel}
                              onChange={(e) => setFormDefaultModel(e.target.value)}
                              className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                            >
                              {discoveredModels.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={formDefaultModel}
                              onChange={(e) => setFormDefaultModel(e.target.value)}
                              placeholder="or type model"
                              className="w-32 text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={formDefaultModel}
                            onChange={(e) => setFormDefaultModel(e.target.value)}
                            placeholder="hermes-agent"
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Context:
                        </label>
                        <select
                          value={formContext}
                          onChange={(e) => setFormContext(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                        >
                          <option value="Auto">Auto</option>
                          <option value="4k">4k (4,096 tokens)</option>
                          <option value="8k">8k (8,192 tokens)</option>
                          <option value="16k">16k (16,384 tokens)</option>
                          <option value="32k">32k (32,768 tokens)</option>
                          <option value="64k">64k (65,536 tokens)</option>
                          <option value="128k">128k (131,072 tokens)</option>
                        </select>
                      </div>
                    </div>

                    {/* Baris 5 (Penuh): API Key */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        API Key:
                      </label>
                      <input
                        type="password"
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder="Leave blank to keep current key"
                        className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>

                    {/* Baris 6 (Checkboxes) */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-1 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={formUseForNewChats}
                          onChange={(e) => setFormUseForNewChats(e.target.checked)}
                          className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span>Use for new chats</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={formDiscoverModels}
                          onChange={(e) => setFormDiscoverModels(e.target.checked)}
                          className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span>Discover models</span>
                      </label>
                    </div>

                    {/* Test Result Indicator */}
                    {testResult.status !== "idle" && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          testResult.status === "success"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {testResult.status === "success" ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                          )}
                          <span>{testResult.message}</span>
                        </div>
                        {testResult.latencyMs && (
                          <span className="font-mono font-bold text-[10px]">
                            {testResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Baris 7 (Tombol Aksi) */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={resetFormToNew}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        New endpoint
                      </button>

                      <div className="flex items-center gap-2">
                        {/* ⚡ Test */}
                        <button
                          type="button"
                          data-testid="test-endpoint-btn"
                          disabled={isTesting || !formEndpointUrl}
                          onClick={handleTestEndpoint}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isTesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>⚡ Test</span>
                        </button>

                        {/* 💾 Save */}
                        <button
                          type="submit"
                          data-testid="save-endpoint-btn"
                          disabled={isSavingEndpoint || !formName || !formEndpointUrl}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSavingEndpoint ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>💾 Save</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW 3: ACCOUNTS */}
            {activeTab === "accounts" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        PIEW Local Command Center
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        User ID: legacy_default_user • Windows 11 Command Center
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Basis Data:</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                        SQLite WAL Mode (dev.db)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Session Token:</span>
                      <span className="text-emerald-500 font-bold">HMAC-SHA256 Active</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Kebijakan Privasi &amp; Isolasi Data
                  </span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Arsitektur ter-decouple: UI/UX berjalan di PC Windows lokal Anda, sedangkan integrasi backend menggunakan API key terenkripsi dan token sesi bertanda tangan digital.
                  </p>
                </div>
              </div>
            )}

            {/* VIEW 4: LOCAL MODELS */}
            {activeTab === "local-models" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <HardDrive className="w-4 h-4 text-amber-500" />
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Ollama Local Daemon
                        </h4>
                        <span className="text-[11px] font-mono text-zinc-500">
                          http://127.0.0.1:11434
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={ollamaStatus === "checking"}
                      onClick={handleCheckOllama}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${ollamaStatus === "checking" ? "animate-spin" : ""}`}
                      />
                      <span>Cek Status</span>
                    </button>
                  </div>

                  {ollamaStatus === "online" && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Daemon Ollama aktif terhubung! Ditemukan {ollamaModels.length} model lokal.
                      </span>
                    </div>
                  )}

                  {ollamaStatus === "offline" && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Daemon Ollama tidak terdeteksi aktif pada port 11434.</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Akselerasi Perangkat Keras Lokal
                  </span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Mendukung inferensi lokal melalui GPU AMD Radeon RX 6700 XT (12GB) dengan optimalisasi VRAM dan undervolt proteksi spike daya.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
