"use client";

import React, { useEffect, useState } from "react";
import { History, X, Trash2, ArrowUpRight, Loader2, Sparkles } from "lucide-react";

interface SavedPromptRecord {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  intentSummary?: string | null;
  score: number;
  createdAt: string;
}

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (record: SavedPromptRecord) => void;
  lang?: "en" | "id";
}

export function HistorySheet({
  isOpen,
  onClose,
  onSelectPrompt,
  lang = "en",
}: HistorySheetProps) {
  const [history, setHistory] = useState<SavedPromptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/history?limit=30");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistory(data.data);
      }
    } catch (err) {
      console.warn("Failed to load history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.warn("Failed to delete prompt:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#faf9f6] border-l border-stone-200 p-6 shadow-2xl flex flex-col justify-between text-stone-900 z-10 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  {lang === "en" ? "Prompt History" : "Riwayat Prompt Tersimpan"}
                </h3>
                <p className="text-[11px] text-stone-500 font-mono">SQLite WAL Database ({history.length} items)</p>
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

          {/* List Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-xs gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                <span>{lang === "en" ? "Loading database..." : "Memuat database SQLite..."}</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 space-y-2">
                <Sparkles className="w-6 h-6 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-400">
                  {lang === "en" ? "No saved prompts yet" : "Belum ada riwayat tersimpan"}
                </p>
                <p className="text-[11px] text-zinc-600 max-w-[200px]">
                  {lang === "en"
                    ? "Synthesized master prompts will appear here when saved."
                    : "Master prompt yang Anda simpan akan muncul di sini."}
                </p>
              </div>
            ) : (
              history.map((record) => (
                <div
                  key={record.id}
                  onClick={() => {
                    onSelectPrompt(record);
                    onClose();
                  }}
                  className="group relative rounded-xl border border-stone-200 bg-white p-3.5 hover:bg-stone-50 hover:border-stone-300 transition-all cursor-pointer space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-stone-500">
                      {new Date(record.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-mono font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Score {record.score}%
                    </span>
                  </div>

                  <p className="text-xs text-stone-800 font-medium line-clamp-2 leading-relaxed">
                    {record.originalPrompt}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <span className="text-[10px] text-stone-500 font-mono">
                      {record.optimizedPrompt.length} chars
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, record.id)}
                        disabled={deletingId === record.id}
                        title="Delete"
                        className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deletingId === record.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-[11px] text-stone-900 font-medium inline-flex items-center gap-0.5">
                        {lang === "en" ? "Load" : "Muat"} <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t border-stone-200 pt-3 text-center text-[10px] font-mono text-stone-500">
            {lang === "en" ? "Persistent SQLite storage with WAL mode" : "Penyimpanan SQLite persisten dengan WAL mode"}
          </div>
        </div>
      </div>
    </div>
  );
}
