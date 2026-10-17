"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Hash,
  AlertTriangle,
} from "lucide-react";
import {
  MemoryRecord,
  MemoryScope,
  MemoryType,
} from "@prompt-workspace/prompt-contracts";

export function AgentMemoryPanel() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State for Adding New Memory
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<MemoryType>("semantic");
  const [formScope, setFormScope] = useState<MemoryScope>("project");
  const [formContent, setFormContent] = useState("");
  const [formConfidence, setFormConfidence] = useState(0.95);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/memory?all=true");
      const json = await res.json();
      if (json.success && Array.isArray(json.memories)) {
        setMemories(json.memories);
      }
    } catch {
      // silent fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleProposeMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) return;

    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          scope: formScope,
          content: formContent.trim(),
          confidence: formConfidence,
          ownerId: "operator-local",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengusulkan memory.");
      }

      setNotification({
        type: "success",
        message: `Memory ${json.memory.id} berhasil diusulkan dan disimpan ke Vault.`,
      });
      setFormContent("");
      setShowAddForm(false);
      fetchMemories();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: (err as Error).message,
      });
    }
  };

  const handleValidateMemory = async (id: string) => {
    try {
      const res = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate",
          id,
          ownerId: "operator-local",
          validationMethod: "human",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memvalidasi memory.");
      }
      setNotification({
        type: "success",
        message: `Memory ${id} berhasil divalidasi sebagai memori terverifikasi.`,
      });
      fetchMemories();
    } catch (err: unknown) {
      setNotification({ type: "error", message: (err as Error).message });
    }
  };

  const handleCorrectMemory = async (id: string) => {
    if (!editingContent.trim()) return;
    try {
      const res = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "correct",
          id,
          content: editingContent.trim(),
          ownerId: "operator-local",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengoreksi memory.");
      }
      setNotification({
        type: "success",
        message: `Memory ${id} berhasil dikoreksi dan SHA-256 diperbarui.`,
      });
      setEditingId(null);
      fetchMemories();
    } catch (err: unknown) {
      setNotification({ type: "error", message: (err as Error).message });
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm(`Hapus memory ${id} secara permanen dari Vault?`)) return;
    try {
      const res = await fetch(`/api/memory?id=${encodeURIComponent(id)}&ownerId=operator-local`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus memory.");
      }
      setNotification({
        type: "success",
        message: `Memory ${id} berhasil dihapus dari Vault.`,
      });
      fetchMemories();
    } catch (err: unknown) {
      setNotification({ type: "error", message: (err as Error).message });
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (selectedType !== "all" && m.type !== selectedType) return false;
    if (selectedStatus !== "all" && m.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.contentHash.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      data-testid="agent-memory-panel"
      className="space-y-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Brain className="w-3.5 h-3.5 text-emerald-500" />
            <span>PILAR 2 • HYBRID MEMORY SERVICE v1.0</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Hybrid Memory Vault &amp; Anti-Poisoning Guard</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Penyimpanan memori multi-layer berbatas hak milik (Anti-IDOR) dengan lifecycle ketat
            (proposed &rarr; validated &rarr; stale), validasi empiris nyata, dan perlindungan Anti-Poisoning.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Memori</span>
          </button>
          <button
            type="button"
            onClick={fetchMemories}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-neutral-50 dark:hover:bg-zinc-900 text-xs font-mono text-muted-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[11px] font-mono underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Form Tambah Memori (Collapsible) */}
      {showAddForm && (
        <form
          onSubmit={handleProposeMemory}
          className="p-5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-sky-500" />
              <span>Usulkan Record Memori Baru (Anti-Poisoning Protected)</span>
            </h3>
            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400">
              Default: Proposed (membutuhkan validasi)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground">Tipe Memori</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as MemoryType)}
                className="w-full text-xs font-mono p-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="working">Working</option>
                <option value="episodic">Episodic</option>
                <option value="semantic">Semantic</option>
                <option value="procedural">Procedural</option>
                <option value="experimental">Experimental</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground">Scope Isolasi</label>
              <select
                value={formScope}
                onChange={(e) => setFormScope(e.target.value as MemoryScope)}
                className="w-full text-xs font-mono p-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="project">Project</option>
                <option value="user">User</option>
                <option value="workspace">Workspace</option>
                <option value="global">Global</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-muted-foreground">Confidence ({formConfidence})</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formConfidence}
                onChange={(e) => setFormConfidence(parseFloat(e.target.value))}
                className="w-full h-8 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-muted-foreground">Isi Memori (Knowledge Statement)</label>
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Contoh: Endpoint webhook wajib selalu menggunakan timing-safe string comparison untuk HMAC signature."
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-muted-foreground cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Simpan Usulan Memori
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="p-2 rounded-xl border border-border bg-background text-foreground cursor-pointer"
          >
            <option value="all">Semua Tipe ({memories.length})</option>
            <option value="working">Working</option>
            <option value="episodic">Episodic</option>
            <option value="semantic">Semantic</option>
            <option value="procedural">Procedural</option>
            <option value="experimental">Experimental</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 rounded-xl border border-border bg-background text-foreground cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="validated">Validated (Aman)</option>
            <option value="proposed">Proposed (Draft)</option>
            <option value="stale">Stale</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari konten atau hash..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Memories Table / Card List */}
      <div className="overflow-x-auto rounded-xl border border-border">
        {filteredMemories.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-muted-foreground">
            Belum ada memori yang cocok dengan filter. Tambahkan memori pertama Anda ke Vault.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-100 dark:bg-zinc-900 border-b border-border text-muted-foreground text-[11px]">
              <tr>
                <th className="p-3">ID &amp; Tipe</th>
                <th className="p-3">Konten Memori</th>
                <th className="p-3">Status</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">SHA-256 Provenance</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMemories.map((m) => {
                const isEditing = editingId === m.id;
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="font-bold text-foreground">{m.id}</div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-200 dark:bg-zinc-800 text-muted-foreground uppercase">
                          {m.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">· {m.scope}</span>
                      </div>
                    </td>

                    <td className="p-3 align-top max-w-md">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full text-xs font-mono p-2 rounded-lg border border-border bg-background text-foreground resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCorrectMemory(m.id)}
                              className="px-2.5 py-1 rounded bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Simpan Koreksi
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 rounded border border-border bg-background text-[10px] text-muted-foreground cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-foreground leading-relaxed">
                          {m.content}
                          <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-2">
                            <span>Source: {m.sourceRunId}</span>
                            <span>• Method: {m.validationMethod}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-3 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === "validated"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : m.status === "stale"
                            ? "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {m.status === "validated" && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                        <span>{m.status}</span>
                      </span>
                    </td>

                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="text-foreground font-semibold">
                        {Math.round(m.confidence * 100)}%
                      </span>
                    </td>

                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3 text-sky-500 shrink-0" />
                        <span title={m.contentHash}>{m.contentHash.slice(0, 12)}…</span>
                      </div>
                    </td>

                    <td className="p-3 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {m.status !== "validated" && (
                          <button
                            type="button"
                            title="Validasi memori ini"
                            onClick={() => handleValidateMemory(m.id)}
                            className="p-1 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Koreksi konten"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditingContent(m.content);
                          }}
                          className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Hapus memori"
                          onClick={() => handleDeleteMemory(m.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
