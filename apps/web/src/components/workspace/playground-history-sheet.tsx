"use client";

import { useState, useEffect } from "react";
import {
  X,
  History,
  Trash2,
  Clock,
  Sparkles,
  Search,
  RotateCcw,
  Cpu,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import type { PlaygroundHistoryRecord } from "@/app/api/playground-history/route";

interface PlaygroundHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (record: PlaygroundHistoryRecord) => void;
  lang?: "en" | "id";
}

export default function PlaygroundHistorySheet({
  isOpen,
  onClose,
  onSelectRecord,
  lang = "id",
}: PlaygroundHistorySheetProps) {
  const [records, setRecords] = useState<PlaygroundHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playground-history");
      const json = await res.json();
      if (res.ok && json.success) {
        setRecords(json.data || []);
      }
    } catch {
      // Abaikan error jaringan awal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/playground-history?id=${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        toast.success(lang === "en" ? "Session removed from history" : "Sesi dihapus dari riwayat");
      } else {
        throw new Error(json.error || "Gagal menghapus riwayat");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus item riwayat");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(lang === "en" ? "Delete all Playground history sessions?" : "Hapus seluruh riwayat Playground?")) {
      return;
    }
    setIsClearingAll(true);
    try {
      const res = await fetch("/api/playground-history?all=true", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRecords([]);
        toast.success(lang === "en" ? "All Playground history cleared" : "Semua riwayat Playground dibersihkan");
      } else {
        throw new Error(json.error || "Gagal membersihkan riwayat");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membersihkan riwayat");
    } finally {
      setIsClearingAll(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.prompt.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.modelA.name.toLowerCase().includes(q) ||
      (r.modelB?.name.toLowerCase().includes(q) ?? false)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-stone-50 border-l border-stone-200 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 border-b border-stone-200/80 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {lang === "en" ? "Playground History" : "Riwayat Playground"}
                </h3>
                <p className="text-[11px] font-mono text-stone-500">
                  {lang === "en"
                    ? `Independent playground storage (${records.length} items)`
                    : `Penyimpanan mandiri playground (${records.length} sesi)`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-stone-200/60 bg-white/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder={lang === "en" ? "Filter by prompt or model..." : "Cari teks prompt atau model..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 transition-all font-mono"
              />
            </div>
          </div>

          {/* Records List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-stone-400">
                <RotateCcw className="w-5 h-5 animate-spin text-lime-600" />
                <span className="text-xs font-mono">
                  {lang === "en" ? "Loading sessions..." : "Memuat riwayat..."}
                </span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500 font-mono">
                  {searchQuery
                    ? lang === "en"
                      ? "No records matching query"
                      : "Tidak ada riwayat yang cocok"
                    : lang === "en"
                    ? "No saved Playground sessions yet"
                    : "Belum ada riwayat sesi Playground"}
                </p>
              </div>
            ) : (
              filteredRecords.map((item) => (
                <div
                  key={item.id}
                  data-playground-history-card="true"
                  onClick={() => onSelectRecord(item)}
                  className="group relative p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer text-left space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-900 line-clamp-2">
                      {item.prompt}
                    </span>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                      title={lang === "en" ? "Delete session" : "Hapus sesi"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded-md ${
                        item.mode === "arena"
                          ? "bg-purple-100 text-purple-800 border border-purple-200/60"
                          : "bg-blue-100 text-blue-800 border border-blue-200/60"
                      }`}
                    >
                      {item.mode === "arena" ? "Arena (2 Models)" : "Single Model"}
                    </span>

                    <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/60 flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5 text-stone-400" />
                      {item.modelA.model || item.modelA.name}
                    </span>

                    {item.modelB && (
                      <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/60 flex items-center gap-1">
                        vs {item.modelB.model || item.modelB.name}
                      </span>
                    )}

                    {item.winner && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200/60 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5 text-amber-600" />
                        {item.winner === "tie"
                          ? "Tie"
                          : `Winner: ${item.winner === "A" ? "Model A" : "Model B"}`}
                      </span>
                    )}
                  </div>

                  {/* Footer Stats & Timestamp */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 border-t border-stone-100 pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleString(lang === "en" ? "en-US" : "id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-stone-500 font-medium">
                      {item.modelA.latencyMs ? `${item.modelA.latencyMs}ms` : ""}
                      {item.modelB?.latencyMs ? ` / ${item.modelB.latencyMs}ms` : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Controls */}
          {records.length > 0 && (
            <div className="p-3 border-t border-stone-200/80 bg-white flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Clear All" : "Hapus Semua"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-mono transition-colors cursor-pointer"
              >
                {lang === "en" ? "Close" : "Tutup"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
