"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Globe,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  FileText,
  ArrowRight,
  Database,
  Info,
} from "lucide-react";
import {
  CrawlerResultItem,
  CrawlerExtractionMode,
} from "@/types/v2-workspace";
import {
  validateCrawlerInputUrl,
  ALLOWED_CRAWLER_HOSTS,
} from "@/lib/v2-workspace-helpers";

export interface CrawlerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsPrompt?: (promptText: string) => void;
  onInjectGroundingFacts?: (facts: CrawlerResultItem[]) => void;
  initialUrl?: string;
  onExtract?: (
    url: string,
    mode: CrawlerExtractionMode
  ) => Promise<CrawlerResultItem[]>;
  items?: CrawlerResultItem[];
  isLoading?: boolean;
  error?: string | null;
}

export function CrawlerImportModal({
  isOpen,
  onClose,
  onSelectAsPrompt,
  onInjectGroundingFacts,
  initialUrl = "",
  onExtract,
  items: controlledItems,
  isLoading: controlledIsLoading = false,
  error: controlledError = null,
}: CrawlerImportModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [mode, setMode] = useState<CrawlerExtractionMode>("EXTRACT_GROUNDING_CONTEXT");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<CrawlerResultItem[]>([]);
  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleClose = () => {
    setValidationError(null);
    setGeneralError(null);
    onClose();
  };

  const items = controlledItems || localItems;
  const loading = controlledIsLoading || isExtracting;
  const activeError = controlledError || generalError || validationError;

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextUrl = e.target.value;
    setUrl(nextUrl);
    if (validationError) {
      const check = validateCrawlerInputUrl(nextUrl);
      if (check.valid) {
        setValidationError(null);
      }
    }
  };

  const handleExtract = async () => {
    setGeneralError(null);
    const check = validateCrawlerInputUrl(url);
    if (!check.valid) {
      setValidationError(check.error || "URL sumber tidak valid.");
      return;
    }
    setValidationError(null);

    if (onExtract) {
      try {
        setIsExtracting(true);
        const results = await onExtract(check.normalizedUrl || url, mode);
        setLocalItems(results);
        const autoSelected = new Set(
          results
            .filter((item) => item.type === "GROUNDING_FACT")
            .map((item) => item.id)
        );
        setSelectedFactIds(autoSelected);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Gagal mengekstrak konten.";
        setGeneralError(message);
      } finally {
        setIsExtracting(false);
      }
    } else {
      // Mock UI extraction preview if handler is not yet wired
      setIsExtracting(true);
      setTimeout(() => {
        const dummyResult: CrawlerResultItem[] = [
          {
            id: "extracted-prompt-1",
            type: "PROMPT_CANDIDATE",
            title: "Instruksi Sistem Ekstraksi Data",
            content:
              "Bertindaklah sebagai System Architect yang memvalidasi SLA arsitektur sistem. Hasilkan ringkasan teknis berformat JSON dengan skor kepatuhan.",
            snippet: "Bertindaklah sebagai System Architect yang memvalidasi SLA...",
            confidenceScore: 0.94,
            attribution: {
              sourceUrl: check.normalizedUrl || url,
              sourceDomain: check.hostname || "github.com",
              fetchedAt: new Date().toISOString(),
              byteSize: 2048,
              lineRange: "L1-L15",
            },
          },
          {
            id: "extracted-fact-1",
            type: "GROUNDING_FACT",
            title: "Batas Latensi Endpoint P0",
            content:
              "Seluruh endpoint API publik wajib merespons di bawah 500ms pada persentil p95.",
            snippet: "Seluruh endpoint API publik wajib merespons di bawah 500ms...",
            confidenceScore: 0.98,
            attribution: {
              sourceUrl: check.normalizedUrl || url,
              sourceDomain: check.hostname || "github.com",
              fetchedAt: new Date().toISOString(),
              byteSize: 2048,
              lineRange: "L42-L46",
            },
          },
          {
            id: "extracted-fact-2",
            type: "GROUNDING_FACT",
            title: "Kebijakan Zero Raw Secret Leakage",
            content:
              "Dilarang keras mengekspos token otentikasi atau credential database pada log atau respon klien.",
            snippet: "Dilarang keras mengekspos token otentikasi...",
            confidenceScore: 0.99,
            attribution: {
              sourceUrl: check.normalizedUrl || url,
              sourceDomain: check.hostname || "github.com",
              fetchedAt: new Date().toISOString(),
              byteSize: 2048,
              lineRange: "L80-L85",
            },
          },
        ];
        setLocalItems(dummyResult);
        setSelectedFactIds(
          new Set(
            dummyResult
              .filter((i) => i.type === "GROUNDING_FACT")
              .map((i) => i.id)
          )
        );
        setIsExtracting(false);
      }, 500);
    }
  };

  const toggleFactSelection = (id: string) => {
    setSelectedFactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleInjectSelectedFacts = () => {
    const selected = items.filter((item) => selectedFactIds.has(item.id));
    if (selected.length > 0) {
      onInjectGroundingFacts?.(selected);
      onClose();
    }
  };

  if (!isOpen) return null;

  const promptCandidates = items.filter((i) => i.type === "PROMPT_CANDIDATE");
  const groundingFacts = items.filter((i) => i.type === "GROUNDING_FACT");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crawler-modal-title"
      data-testid="crawler-import-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="crawler-modal-title"
                className="text-base font-semibold leading-none tracking-tight"
              >
                Impor Sumber &amp; Grounding (Web Crawler v2.0)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tarik dokumen resmi dan ekstrak kandidat prompt atau fakta arsitektur terverifikasi.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Tutup Dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info & Privacy Notice Bar */}
        <div className="px-5 py-3 bg-muted/40 border-b border-border/60 space-y-2 text-xs">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Batasan Sumber P0:</strong> Saat ini mendukung URL HTTPS dari{" "}
              <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">
                raw.githubusercontent.com
              </code>{" "}
              dan{" "}
              <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">
                github.com
              </code>{" "}
              (Maks. 512 KB per dokumen).
            </span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Privasi &amp; Redaksi:</strong> Potongan teks akan disensor dari kunci rahasia/secret
              sebelum diekstraksi ke model LLM. Tidak ada kredensial yang tersimpan.
            </span>
          </div>
        </div>

        {/* Body Modal (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Form Input URL & Mode */}
          <div className="space-y-3 p-4 rounded-lg border border-border/70 bg-card/60">
            <label className="text-xs font-semibold text-foreground block">
              URL Dokumen Sumber (HTTPS):
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                data-testid="crawler-url-input"
                placeholder="https://raw.githubusercontent.com/owner/repo/main/PROMPT.md"
                value={url}
                onChange={handleUrlChange}
                disabled={loading}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
              />
              <Button
                type="button"
                data-testid="crawler-extract-btn"
                onClick={handleExtract}
                disabled={loading || !url.trim()}
                className="gap-2 shrink-0 text-xs h-9"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengekstrak...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span>Ekstrak Konten</span>
                  </>
                )}
              </Button>
            </div>

            {/* Mode Ekstraksi */}
            <div className="flex items-center gap-4 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Fokus Ekstraksi:
              </span>
              <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="crawler-mode"
                  value="EXTRACT_GROUNDING_CONTEXT"
                  checked={mode === "EXTRACT_GROUNDING_CONTEXT"}
                  onChange={() => setMode("EXTRACT_GROUNDING_CONTEXT")}
                  className="accent-primary"
                />
                <span>Fakta Konteks Grounding</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="crawler-mode"
                  value="EXTRACT_PROMPTS"
                  checked={mode === "EXTRACT_PROMPTS"}
                  onChange={() => setMode("EXTRACT_PROMPTS")}
                  className="accent-primary"
                />
                <span>Kandidat Prompt Baru</span>
              </label>
            </div>

            {activeError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{activeError}</span>
              </div>
            )}
          </div>

          {/* Hasil Ekstraksi */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  Item Teridentifikasi ({items.length})
                </h3>
                {groundingFacts.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleInjectSelectedFacts}
                    disabled={selectedFactIds.size === 0}
                    className="text-xs h-7 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <ArrowRight className="h-3 w-3" />
                    <span>Suntikkan {selectedFactIds.size} Fakta ke Konteks</span>
                  </Button>
                )}
              </div>

              {/* Bagian 1: Kandidat Prompt */}
              {promptCandidates.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Kandidat Prompt (Dapat langsung digunakan di input utama):
                  </span>
                  <div className="space-y-2">
                    {promptCandidates.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary text-primary-foreground text-[10px] font-mono">
                              PROMPT_CANDIDATE
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {item.title}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onSelectAsPrompt?.(item.content);
                              onClose();
                            }}
                            className="text-[11px] h-7 gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Gunakan sebagai Prompt Asli</span>
                          </Button>
                        </div>
                        <p className="text-xs text-foreground/90 font-mono bg-background/50 p-2 rounded border border-border/40 whitespace-pre-wrap">
                          {item.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {item.attribution.sourceDomain}
                          </span>
                          {item.attribution.lineRange && (
                            <span className="font-mono">
                              Baris: {item.attribution.lineRange}
                            </span>
                          )}
                          <span className="font-mono">
                            Kepercayaan: {Math.round(item.confidenceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bagian 2: Fakta Konteks Arsitektur (Grounding Facts) */}
              {groundingFacts.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Fakta Konteks Arsitektur (Pilih fakta untuk disuntikkan ke kolom konteks):
                  </span>
                  <div className="space-y-2">
                    {groundingFacts.map((fact) => {
                      const isSelected = selectedFactIds.has(fact.id);
                      return (
                        <div
                          key={fact.id}
                          onClick={() => toggleFactSelection(fact.id)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? "border-emerald-500/40 bg-emerald-500/5 shadow-2xs"
                              : "border-border/60 bg-card/40 hover:border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFactSelection(fact.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="accent-emerald-600 rounded h-3.5 w-3.5"
                              />
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                              >
                                GROUNDING_FACT
                              </Badge>
                              <span className="text-xs font-semibold text-foreground">
                                {fact.title}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {Math.round(fact.confidenceScore * 100)}% confident
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 pl-5.5">
                            {fact.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pl-5.5">
                            <span className="font-mono truncate max-w-xs">
                              Sumber: {fact.attribution.sourceUrl}
                            </span>
                            {fact.attribution.lineRange && (
                              <span className="font-mono">
                                Baris {fact.attribution.lineRange}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
          <span className="text-[11px] text-muted-foreground">
            Allowlist Host: {ALLOWED_CRAWLER_HOSTS.join(", ")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-xs h-8"
            >
              Tutup
            </Button>
            {groundingFacts.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleInjectSelectedFacts}
                disabled={selectedFactIds.size === 0}
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Suntikkan Fakta Terpilih ({selectedFactIds.size})</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
