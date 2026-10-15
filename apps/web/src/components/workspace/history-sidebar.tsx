"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  X,
  Clock,
  Trash2,
  Copy,
  Check,
  BookmarkCheck,
  Database,
  RefreshCw,
  Loader2,
} from "lucide-react";

export interface SavedPromptItem {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  intentSummary?: string | null;
  score: number;
  createdAt: string;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (item: SavedPromptItem) => void;
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}

export function HistorySidebar({
  isOpen,
  onClose,
  onSelectPrompt,
  refreshKey = 0,
  onCountChange,
}: HistorySidebarProps) {
  const [items, setItems] = useState<SavedPromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history?limit=50");
      const json = await res.json();
      if (res.ok && json.success) {
        const fetchedItems: SavedPromptItem[] = json.data || [];
        setItems(fetchedItems);
        onCountChange?.(fetchedItems.length);
      } else {
        setError(json.error || "Gagal memuat riwayat dari database.");
      }
    } catch (err) {
      console.error("Fetch history error:", err);
      setError("Koneksi gagal saat memuat riwayat database.");
    } finally {
      setIsLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      queueMicrotask(() => {
        if (!ignore) {
          fetchHistory();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, refreshKey, fetchHistory]);

  const handleCopy = async (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedId(id);
      toast.success("Prompt teroptimasi disalin ke clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin", err);
      toast.error("Gagal menyalin prompt ke clipboard.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Prompt dihapus dari riwayat database.");
        setItems((prev) => {
          const next = prev.filter((item) => item.id !== id);
          onCountChange?.(next.length);
          return next;
        });
      } else {
        toast.error(json.error || "Gagal menghapus prompt.");
      }
    } catch (err) {
      console.error("Delete history error:", err);
      toast.error("Gagal menghapus prompt dari database.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-card border-r border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Riwayat Tersimpan
                </h2>
                {!isLoading && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 font-mono"
                  >
                    {items.length}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Database SQLite • Terikat sesi browser aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchHistory}
              disabled={isLoading}
              title="Refresh Riwayat"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Skeleton Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg border border-border/50 bg-muted/20 animate-pulse space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-4 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="h-3.5 w-full bg-muted rounded" />
                  <div className="h-3 w-4/5 bg-muted rounded" />
                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-6 w-14 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2 text-center">
              <p className="font-semibold">Gagal Mengambil Riwayat</p>
              <p className="opacity-90">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                className="h-7 text-xs border-destructive/40 hover:bg-destructive/20 text-destructive cursor-pointer"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && items.length === 0 && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 space-y-3 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/60">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Belum ada prompt yang disimpan
                </p>
                <p className="text-[11px] leading-relaxed max-w-xs text-muted-foreground">
                  Klik tombol <strong className="text-foreground">&quot;Accept &amp; Save&quot;</strong> pada hasil optimasi untuk menyimpan prompt langsung ke database workspace Anda.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                  <Database className="h-3 w-3" />
                  SQLite Prisma Engine Aktif
                </span>
              </div>
            </div>
          )}

          {/* Items List (LangSmith Trace Style) */}
          {!isLoading &&
            !error &&
            items.length > 0 &&
            items.map((item) => {
              const scoreBadgeClass =
                item.score >= 80
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : item.score >= 60
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectPrompt?.(item)}
                  className="group rounded-md border border-border/70 bg-card hover:bg-muted/30 p-3 space-y-2 cursor-pointer transition-all hover:border-primary/50 relative"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(item.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-mono font-medium ${scoreBadgeClass}`}
                    >
                      Skor: {item.score}/100
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                      {item.originalPrompt}
                    </div>
                    {item.intentSummary && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 italic font-sans">
                        Maksud: &ldquo;{item.intentSummary}&rdquo;
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {item.optimizedPrompt.length} karakter
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPrompt?.(item);
                        }}
                        className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 cursor-pointer"
                        title="Muat ke Editor"
                      >
                        Muat
                      </Button>

                      {/* Copy Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) =>
                          handleCopy(item.id, item.optimizedPrompt, e)
                        }
                        className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Salin Prompt Teroptimasi"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Salin
                          </>
                        )}
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === item.id}
                        onClick={(e) => handleDelete(item.id, e)}
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Hapus Prompt dari Database"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/60 bg-muted/20 space-y-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <BookmarkCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Terhubung ke Prisma SQLite Client</span>
          </div>
          <p className="text-[10px] text-muted-foreground/90 leading-tight">
            Data riwayat diisolasi berdasarkan sesi browser (<span className="font-mono text-[9px]">HttpOnly</span>). Item bawaan sistem (<span className="italic">legacy baseline</span>) bersifat <span className="font-medium text-foreground/80">read-only</span> dan terlindungi.
          </p>
        </div>
      </div>
    </div>
  );
}
