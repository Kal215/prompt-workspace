"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  BookmarkCheck,
  ChevronRight,
  Database,
} from "lucide-react";
import { useState } from "react";

export interface SavedPromptItem {
  id: string;
  requestId: string;
  originalPrompt: string;
  optimizedPrompt: string;
  timestamp: string;
  score: number;
  detectedIntent?: string;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: SavedPromptItem[];
  onSelectPrompt?: (item: SavedPromptItem) => void;
  onClearHistory?: () => void;
}

export function HistorySidebar({
  isOpen,
  onClose,
  items,
  onSelectPrompt,
  onClearHistory,
}: HistorySidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin", err);
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
              <History className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Riwayat Prompt
                </h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {items.length}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Prompt yang diterima & disimpan di sesi ini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && onClearHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
                className="h-7 text-[11px] text-muted-foreground hover:text-destructive px-2"
              >
                Hapus Semua
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/60">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Belum ada prompt yang disimpan
                </p>
                <p className="text-[11px] leading-relaxed max-w-xs text-muted-foreground">
                  Klik tombol <strong className="text-foreground">"Accept & Save"</strong> pada hasil optimasi untuk menyimpan prompt ke workspace Anda.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-muted/50 border border-border/50 text-muted-foreground px-2.5 py-1 rounded-full">
                  <Database className="h-3 w-3" />
                  Persiapan Integrasi Database (Tahap 5)
                </span>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectPrompt?.(item)}
                className="group rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/30 p-3 space-y-2 cursor-pointer transition-all hover:border-primary/40 relative"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-mono">
                    {new Date(item.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  >
                    Skor: {item.score}/100
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-foreground line-clamp-2">
                    {item.originalPrompt}
                  </div>
                  {item.detectedIntent && (
                    <div className="text-[11px] text-muted-foreground line-clamp-1 italic">
                      Intent: "{item.detectedIntent}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {item.optimizedPrompt.length} karakter
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleCopy(item.id, item.optimizedPrompt, e)}
                      className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Salin
                        </>
                      )}
                    </Button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/60 bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
            <BookmarkCheck className="h-3 w-3 text-primary" />
            Prompt tersimpan di memori sesi aktif
          </p>
        </div>
      </div>
    </div>
  );
}
