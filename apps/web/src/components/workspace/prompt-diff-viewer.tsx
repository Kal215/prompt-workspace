"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { diffWordsWithSpace } from "diff";
import {
  Copy,
  Check,
  Columns,
  GitCompare,
  FileCheck,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  FileDown,
  Loader2,
} from "lucide-react";

interface PromptDiffViewerProps {
  originalPrompt: string;
  optimizedPrompt: string;
  onRegenerate?: () => void;
  onExportMarkdown?: () => void;
  onAcceptAndSave?: () => void;
  isSaving?: boolean;
}

export function PromptDiffViewer({
  originalPrompt,
  optimizedPrompt,
  onRegenerate,
  onExportMarkdown,
  onAcceptAndSave,
  isSaving = false,
}: PromptDiffViewerProps) {
  const [copied, setCopied] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Compute inline diff
  const diffParts = useMemo(() => {
    return diffWordsWithSpace(originalPrompt, optimizedPrompt);
  }, [originalPrompt, optimizedPrompt]);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(optimizedPrompt).catch(() => {});
      }
    } catch (err) {
      console.warn("Clipboard access warning:", err);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptClick = () => {
    setAccepted(true);
    onAcceptAndSave?.();
    setTimeout(() => setAccepted(false), 3000);
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Perbandingan Prompt & Hasil Optimasi
            </CardTitle>
            <CardDescription className="text-xs">
              Inspeksi perubahan struktural antara input awal dan hasil rekayasa engine
            </CardDescription>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Salin Hasil
                </>
              )}
            </Button>

            {onExportMarkdown && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportMarkdown}
                title="Unduh laporan lengkap dalam format Markdown"
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-muted/60"
              >
                <FileDown className="h-3.5 w-3.5 text-primary" />
                Export as Markdown (.md)
              </Button>
            )}

            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleAcceptClick}
              className="h-8 text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan ke DB...
                </>
              ) : accepted ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Diterima & Tersimpan!
                </>
              ) : (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Accept & Save
                </>
              )}
            </Button>

            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                title="Optimasi Ulang"
                className="h-8 px-2.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {accepted && (
          <div className="mb-4 rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Prompt berhasil diterima, disimpan ke riwayat workspace, dan disalin ke clipboard!
            </span>
          </div>
        )}

        <Tabs defaultValue="side-by-side" className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-sm h-8 p-0.5">
            <TabsTrigger value="side-by-side" className="text-xs gap-1.5">
              <Columns className="h-3.5 w-3.5" />
              Berdampingan
            </TabsTrigger>
            <TabsTrigger value="inline-diff" className="text-xs gap-1.5">
              <GitCompare className="h-3.5 w-3.5" />
              Inline Diff
            </TabsTrigger>
            <TabsTrigger value="clean-output" className="text-xs gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              Output Bersih
            </TabsTrigger>
          </TabsList>

          {/* Side by Side View */}
          <TabsContent value="side-by-side" className="space-y-3 pt-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Prompt Asli (Input)
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                    {originalPrompt.length} karakter
                  </Badge>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/60 p-3.5 font-mono text-xs leading-relaxed min-h-[280px] whitespace-pre-wrap select-text">
                  {originalPrompt}
                </div>
              </div>

              {/* Optimized */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Prompt Teroptimasi (Engine)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-normal bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  >
                    {optimizedPrompt.length} karakter
                  </Badge>
                </div>
                <div className="rounded-lg bg-primary/[0.02] border border-primary/20 p-3.5 font-mono text-xs leading-relaxed min-h-[280px] whitespace-pre-wrap select-text text-foreground">
                  {optimizedPrompt}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Inline Diff View */}
          <TabsContent value="inline-diff" className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
              <span className="text-[11px]">
                Legenda:{" "}
                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] ml-1">
                  + Penambahan / Pengayaan
                </span>
                <span className="inline-block px-1.5 py-0.5 rounded bg-red-500/20 text-red-800 dark:text-red-300 line-through font-mono text-[10px] ml-2">
                  - Teks Dihapus / Direvisi
                </span>
              </span>
            </div>

            <div className="rounded-lg bg-muted/20 border border-border/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text min-h-[260px]">
              {diffParts.map((part, index) => {
                if (part.added) {
                  return (
                    <mark
                      key={index}
                      className="bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded px-1 py-0.5 font-semibold no-underline"
                    >
                      {part.value}
                    </mark>
                  );
                }
                if (part.removed) {
                  return (
                    <del
                      key={index}
                      className="bg-red-500/20 text-red-800 dark:text-red-300 line-through rounded px-1 py-0.5 opacity-70"
                    >
                      {part.value}
                    </del>
                  );
                }
                return <span key={index}>{part.value}</span>;
              })}
            </div>
          </TabsContent>

          {/* Clean Output View */}
          <TabsContent value="clean-output" className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px]">
                Format siap copy-paste langsung ke ChatGPT, Claude, atau API backend
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-xs gap-1"
              >
                {copied ? (
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
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text text-foreground">
              {optimizedPrompt}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
