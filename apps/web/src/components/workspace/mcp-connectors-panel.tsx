"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plug,
  Search,
  Plus,
  Zap,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Trash2,
  Sliders,
  Loader2,
} from "lucide-react";
import { McpConnectorConfig, McpTool } from "@prompt-workspace/prompt-contracts";
import { toast } from "sonner";

export interface McpConnectorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectorsChanged?: () => void;
}

type FilterTab = "all" | "on-device" | "available";

export function McpConnectorsModal({
  isOpen,
  onClose,
  onConnectorsChanged,
}: McpConnectorsPanelProps) {
  const [connectors, setConnectors] = useState<McpConnectorConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // State untuk modal Edit / Add your own
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<Partial<McpConnectorConfig> | null>(null);
  const [editToken, setEditToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // State untuk pengujian handshake live
  const [testingConnectorId, setTestingConnectorId] = useState<string | null>(null);
  const [_testResultModal, setTestResultModal] = useState<{
    connectorId: string;
    ok: boolean;
    latencyMs?: number;
    discoveredTools?: McpTool[];
    errorMessage?: string;
  } | null>(null);

  // State untuk Safety Gate Human-in-the-Loop Modal
  const [safetyApprovalModal, setSafetyApprovalModal] = useState<{
    isOpen: boolean;
    connectorId: string;
    toolName: string;
    args: Record<string, unknown>;
  } | null>(null);
  const [isExecutingApproval, setIsExecutingApproval] = useState(false);

  // Fetch daftar konektor dari /api/mcp-connectors
  const fetchConnectors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/mcp-connectors");
      const data = await res.json();
      if (data.success && Array.isArray(data.connectors)) {
        setConnectors(data.connectors);
      }
    } catch (err) {
      console.warn("[MCP_CONNECTORS_FETCH_WARN]", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConnectors();
    }
  }, [isOpen]);

  // Handler toggle on / off
  const handleToggle = async (connectorId: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    // Optimistic UI update
    setConnectors((prev) =>
      prev.map((c) =>
        c.connectorId === connectorId ? { ...c, enabled: nextEnabled } : c
      )
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
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Status konektor diperbarui.`);
        onConnectorsChanged?.();
      } else {
        // Rollback
        setConnectors((prev) =>
          prev.map((c) =>
            c.connectorId === connectorId ? { ...c, enabled: currentEnabled } : c
          )
        );
        toast.error(data.error || "Gagal mengubah status konektor.");
      }
    } catch {
      // Rollback
      setConnectors((prev) =>
        prev.map((c) =>
          c.connectorId === connectorId ? { ...c, enabled: currentEnabled } : c
        )
      );
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  // Handler Test & Discover live handshake
  const handleTestAndDiscover = async (connectorId: string) => {
    setTestingConnectorId(connectorId);
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
      setTestResultModal({
        connectorId,
        ok: data.ok ?? data.success,
        latencyMs: data.latencyMs,
        discoveredTools: data.discoveredTools,
        errorMessage: data.errorMessage || data.error,
      });
      if (data.ok) {
        toast.success(`Handshake MCP sukses (${data.latencyMs}ms)! ${data.discoveredTools?.length || 0} tools ditemukan.`);
        fetchConnectors();
        onConnectorsChanged?.();
      } else {
        toast.warning(data.errorMessage || "Handshake selesai dengan peringatan.");
      }
    } catch (err: unknown) {
      toast.error(`Gagal menguji konektor: ${(err as Error).message}`);
    } finally {
      setTestingConnectorId(null);
    }
  };

  // Handler Hapus Custom Connector
  const handleDeleteConnector = async (connectorId: string) => {
    try {
      const res = await fetch(`/api/mcp-connectors?id=${encodeURIComponent(connectorId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Konektor '${connectorId}' berhasil dihapus.`);
        fetchConnectors();
        onConnectorsChanged?.();
      } else {
        toast.error(data.error || "Gagal menghapus konektor.");
      }
    } catch {
      toast.error("Gagal menghapus konektor.");
    }
  };

  // Handler Simpan Konfigurasi / Add your own
  const handleSaveConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConnector || !editingConnector.name) return;

    setIsSaving(true);
    try {
      const payload: any = {
        action: "upsert",
        connector: {
          ...editingConnector,
          enabled: editingConnector.enabled ?? true,
          installedOnDevice: true,
        },
      };

      // Injeksi token / PAT jika diisi
      if (editToken.trim()) {
        if (editingConnector.transportType === "stdio") {
          payload.connector.stdioConfig = {
            ...(editingConnector.stdioConfig || { command: "npx", args: [] }),
            envVars: {
              ...(editingConnector.stdioConfig?.envVars || {}),
              AUTH_TOKEN: editToken.trim(),
            },
          };
        } else {
          payload.connector.httpConfig = {
            ...(editingConnector.httpConfig || { endpointUrl: "http://localhost:8000" }),
            apiKeyOrToken: editToken.trim(),
          };
        }
      }

      const res = await fetch("/api/mcp-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Konfigurasi konektor berhasil disimpan.");
        setIsEditModalOpen(false);
        setEditingConnector(null);
        setEditToken("");
        fetchConnectors();
        onConnectorsChanged?.();
      } else {
        toast.error(data.error || "Gagal menyimpan konektor.");
      }
    } catch (err: unknown) {
      toast.error(`Terjadi kesalahan: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Eksekusi Safety Gate Approval
  const handleApproveExecution = async (approved: boolean) => {
    if (!safetyApprovalModal) return;
    setIsExecutingApproval(true);

    try {
      const res = await fetch("/api/mcp-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_tool",
          connectorId: safetyApprovalModal.connectorId,
          toolName: safetyApprovalModal.toolName,
          args: safetyApprovalModal.args,
          userApproved: approved,
        }),
      });
      const data = await res.json();
      if (approved) {
        if (data.ok) {
          toast.success(`Aksi '${safetyApprovalModal.toolName}' berhasil disetujui & dieksekusi!`);
        } else {
          toast.error(data.message || "Eksekusi gagal.");
        }
      } else {
        toast.info("Eksekusi aksi mutatif ditolak oleh pengguna.");
      }
    } catch {
      toast.error("Gagal mengirim persetujuan eksekusi.");
    } finally {
      setIsExecutingApproval(false);
      setSafetyApprovalModal(null);
    }
  };

  // Filter konektor
  const filteredConnectors = useMemo(() => {
    return connectors.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "on-device") {
        return c.enabled || c.installedOnDevice || c.connectionStatus === "connected";
      }
      if (activeFilter === "available") {
        return !c.enabled && c.badgeType === "MCP · Catalog";
      }
      return true;
    });
  }, [connectors, searchQuery, activeFilter]);

  const onDeviceConnectors = useMemo(() => {
    return filteredConnectors.filter((c) => c.enabled || c.installedOnDevice || c.connectionStatus === "connected");
  }, [filteredConnectors]);

  const availableConnectors = useMemo(() => {
    return filteredConnectors.filter((c) => !c.enabled && (!c.installedOnDevice || c.badgeType === "MCP · Catalog"));
  }, [filteredConnectors]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="mcp-connectors-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[820px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Connectors</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                  Model Context Protocol
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Connect PIEW with local tools, external design systems, databases & APIs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search + Filter Pills + Add your own */}
        <div className="p-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-50/30 dark:bg-zinc-950/20">
          {/* Left: Filter Segmented Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs self-start">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === "all"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              All ({connectors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("on-device")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === "on-device"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              On this device ({connectors.filter((c) => c.enabled).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("available")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === "available"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Available ({connectors.filter((c) => !c.enabled && c.badgeType === "MCP · Catalog").length})
            </button>
          </div>

          {/* Right: Search & Add your own Button */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                data-testid="mcp-search-input"
                placeholder="Search connectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <button
              type="button"
              data-testid="mcp-add-custom-btn"
              onClick={() => {
                setEditingConnector({
                  name: "",
                  category: "custom",
                  badgeType: "MCP · Custom",
                  description: "",
                  transportType: "stdio",
                  permissionMode: "write_with_approval",
                  enabled: true,
                  installedOnDevice: true,
                  stdioConfig: { command: "npx", args: [], envVars: {} },
                });
                setEditToken("");
                setIsEditModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your own</span>
            </button>
          </div>
        </div>

        {/* Scrollable Connector Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs">Memuat katalog MCP Connectors...</span>
            </div>
          ) : filteredConnectors.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-2">
              <Plug className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm">Tidak ada konektor yang sesuai dengan filter pencarian.</p>
            </div>
          ) : (
            <>
              {/* SECTION: ON THIS DEVICE (Jika ada atau filter all/on-device) */}
              {(activeFilter === "all" || activeFilter === "on-device") && onDeviceConnectors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                      On This Device ({onDeviceConnectors.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {onDeviceConnectors.map((connector) => {
                      const isConnected = connector.connectionStatus === "connected";
                      const isTesting = testingConnectorId === connector.connectorId;

                      return (
                        <div
                          key={connector.connectorId}
                          data-testid={`mcp-card-${connector.connectorId}`}
                          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                        >
                          {/* Info Konektor */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {connector.name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {connector.badgeType}
                              </span>

                              {/* Status Koneksi */}
                              <span
                                className={`text-[10px] font-mono px-2 py-0.2 rounded-full flex items-center gap-1 ${
                                  isConnected
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : connector.enabled
                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isConnected ? "bg-emerald-500" : connector.enabled ? "bg-sky-500" : "bg-zinc-400"
                                  }`}
                                />
                                {isConnected
                                  ? `Connected (${connector.latencyMs ?? 0}ms)`
                                  : connector.enabled
                                  ? "On, ready"
                                  : "Off"}
                              </span>

                              {/* Permission Mode Badge */}
                              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                {connector.permissionMode === "read_only" ? (
                                  <>
                                    <Lock className="w-2.5 h-2.5 text-zinc-400" />
                                    <span>Read-Only</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="w-2.5 h-2.5 text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400">Approval Required</span>
                                  </>
                                )}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                              {connector.description}
                            </p>

                            {/* Discovered Tools Chips */}
                            {connector.discoveredTools && connector.discoveredTools.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                <span className="text-[10px] text-zinc-400 font-mono">Tools:</span>
                                {connector.discoveredTools.slice(0, 4).map((t) => (
                                  <span
                                    key={t.name}
                                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 flex items-center gap-1"
                                  >
                                    <span>{t.name}</span>
                                    {t.isMutating && (
                                      <span className="text-[9px] text-amber-500 font-bold" title="Mutating tool">
                                        *
                                      </span>
                                    )}
                                  </span>
                                ))}
                                {connector.discoveredTools.length > 4 && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    +{connector.discoveredTools.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Test, Configure, Switch */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Tombol Test & Discover */}
                            <button
                              type="button"
                              data-testid="test-mcp-discover-btn"
                              disabled={isTesting}
                              onClick={() => handleTestAndDiscover(connector.connectorId)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              title="Ping JSON-RPC 2.0 & Discover tools"
                            >
                              {isTesting ? (
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                              ) : (
                                <Zap className="w-3 h-3 text-emerald-500" />
                              )}
                              <span>Test &amp; Discover</span>
                            </button>

                            {/* Tombol Configure */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingConnector(connector);
                                setEditToken("");
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                              title="Ubah Konfigurasi"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Hapus jika Custom */}
                            {connector.badgeType !== "MCP · Catalog" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteConnector(connector.connectorId)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Hapus Konektor Custom"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Switch Toggle On/Off */}
                            <button
                              type="button"
                              data-testid="toggle-mcp-btn"
                              onClick={() => handleToggle(connector.connectorId, connector.enabled)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                connector.enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                              }`}
                              role="switch"
                              aria-checked={connector.enabled}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  connector.enabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: AVAILABLE (Katalog Populer) */}
              {(activeFilter === "all" || activeFilter === "available") && availableConnectors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                      Available Connectors ({availableConnectors.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {availableConnectors.map((connector) => (
                      <div
                        key={connector.connectorId}
                        data-testid={`mcp-available-${connector.connectorId}`}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-xs flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span>{connector.name}</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {connector.category}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                            {connector.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                          <span className="text-[10px] font-mono text-zinc-400">
                            {connector.discoveredTools?.length || 0} tools cataloged
                          </span>

                          <button
                            type="button"
                            data-testid="connect-mcp-btn"
                            onClick={() => {
                              setEditingConnector(connector);
                              setEditToken("");
                              setIsEditModalOpen(true);
                            }}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black transition-colors shadow-xs cursor-pointer"
                          >
                            Connect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero Secret Leakage — Tokens/keys are encrypted &amp; never sent raw to browser.</span>
          </div>
          <span className="text-zinc-500">~/.piew/mcp-connectors.json</span>
        </div>
      </div>

      {/* MODAL 1: EDIT / CONFIGURE CONNECTOR */}
      {isEditModalOpen && editingConnector && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {editingConnector.connectorId ? `Configure ${editingConnector.name}` : "Add Custom MCP Connector"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConnector} className="space-y-3.5 text-xs">
              {/* Nama */}
              <div>
                <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Connector Name
                </label>
                <input
                  type="text"
                  required
                  value={editingConnector.name || ""}
                  onChange={(e) => setEditingConnector({ ...editingConnector, name: e.target.value })}
                  placeholder="e.g. Acme Internal Postgres MCP"
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingConnector.description || ""}
                  onChange={(e) => setEditingConnector({ ...editingConnector, description: e.target.value })}
                  placeholder="Deskripsi singkat fungsi konektor..."
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              {/* Permission Mode */}
              <div>
                <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Permission Mode
                </label>
                <select
                  value={editingConnector.permissionMode || "write_with_approval"}
                  onChange={(e) =>
                    setEditingConnector({
                      ...editingConnector,
                      permissionMode: e.target.value as "read_only" | "write_with_approval",
                    })
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="write_with_approval">Write with Approval (Safety Gate Confirmed)</option>
                  <option value="read_only">Strict Read-Only (Blocks All Mutations)</option>
                </select>
              </div>

              {/* Access Token / Secret Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-zinc-600 dark:text-zinc-400">
                    Access Token / API Key
                  </label>
                  <span className="text-[10px] text-zinc-400">Leave blank to keep current key</span>
                </div>
                <input
                  type="password"
                  value={editToken}
                  onChange={(e) => setEditToken(e.target.value)}
                  placeholder="Paste token / leave blank to keep saved key"
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="save-mcp-connector-btn"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Konektor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFETY GATE APPROVAL MODAL (Human-in-the-Loop) */}
      {safetyApprovalModal && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="mcp-safety-gate-modal"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500 pb-2 border-b border-amber-500/20">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Human-in-the-Loop Safety Approval
                </h3>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                  Aksi mutatif membutuhkan persetujuan manusia sebelum dijalankan
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-zinc-800 dark:text-zinc-200 space-y-1">
                <div>
                  Konektor: <strong className="font-mono text-foreground">{safetyApprovalModal.connectorId}</strong>
                </div>
                <div>
                  Nama Tool: <strong className="font-mono text-amber-600 dark:text-amber-400">{safetyApprovalModal.toolName}</strong>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 font-mono block mb-1">
                  Preview Payload Parameter:
                </label>
                <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-40 border border-zinc-800">
                  {JSON.stringify(safetyApprovalModal.args, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                data-testid="mcp-safety-reject-btn"
                disabled={isExecutingApproval}
                onClick={() => handleApproveExecution(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Tolak Aksi
              </button>
              <button
                type="button"
                data-testid="mcp-safety-approve-btn"
                disabled={isExecutingApproval}
                onClick={() => handleApproveExecution(true)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isExecutingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Setujui &amp; Jalankan (Approve)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
