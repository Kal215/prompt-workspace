"use client";

import React, { useEffect, useState, useMemo } from "react";
import { History, X, Trash2, ArrowUpRight, Search, Sparkles, Layers, Check } from "lucide-react";
import type { ProHistoryRecord } from "@/app/api/pro-history/route";

interface ProHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (record: ProHistoryRecord) => void;
  lang?: "en" | "id";
}

export function ProHistorySheet({
  isOpen,
  onClose,
  onSelectRecord,
  lang = "en",
}: ProHistorySheetProps) {
  const [history, setHistory] = useState<ProHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pro-history");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistory(data.data);
      }
    } catch (err) {
      console.warn("Failed to load Pro history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/pro-history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.warn("Failed to delete pro history item:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    const confirmMsg =
      lang === "en"
        ? "Are you sure you want to delete all Pro Studio history?"
        : "Apakah Anda yakin ingin menghapus seluruh riwayat Pro Studio?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/pro-history?all=true", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory([]);
      }
    } catch (err) {
      console.warn("Failed to clear Pro history:", err);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (h) =>
        h.prompt.toLowerCase().includes(q) ||
        (h.title && h.title.toLowerCase().includes(q)) ||
        (h.domain && h.domain.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#faf9f6] border-l border-stone-200 p-6 shadow-2xl flex flex-col justify-between text-stone-900 z-10 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="space-y-3 border-b border-stone-200 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {lang === "en" ? "Pro Studio History" : "Riwayat Pro Studio"}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    {lang === "en" ? "Independent Pro storage" : "Penyimpanan mandiri Pro"} ({history.length} item)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "en" ? "Search previous prompts..." : "Cari riwayat prompt sebelumnya..."}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-2.5 min-h-0">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-stone-500">
                {lang === "en" ? "Loading history..." : "Memuat riwayat..."}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-200 rounded-2xl bg-white/60 space-y-2">
                <Sparkles className="w-5 h-5 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-500">
                  {searchQuery
                    ? lang === "en"
                      ? "No history matches your search."
                      : "Tidak ada riwayat yang cocok dengan pencarian."
                    : lang === "en"
                    ? "No Pro Studio history yet. Synthesize a prompt to see it here."
                    : "Belum ada riwayat Pro Studio. Jalankan pembuatan prompt untuk menyimpannya."}
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  data-pro-history-card="true"
                  onClick={() => onSelectRecord(item)}
                  className="group relative p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer text-left space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-900 line-clamp-2 leading-snug">
                      {item.prompt}
                    </p>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                      title={lang === "en" ? "Delete from history" : "Hapus dari riwayat"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                      {item.domain.replace("_", " ")}
                    </span>
                    {item.synthesisResult && (
                      <span className="px-1.5 py-0.5 rounded-md bg-lime-50 text-lime-800 border border-lime-200 font-medium flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-lime-600" />
                        <span>Master</span>
                      </span>
                    )}
                    {item.synthesisResult?.blueprint && (
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-medium flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-sky-600" />
                        <span>Diagram</span>
                      </span>
                    )}
                    <span className="ml-auto text-stone-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Controls */}
          <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
            {history.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-stone-400 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Clear All" : "Bersihkan Semua"}</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === "en" ? "Close" : "Tutup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
