"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PromptExecutionResult } from "@/types/prompt";
import {
  Play,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  Cpu,
  Clock,
  Zap,
  Variable,
  AlertCircle,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Deteksi placeholder variabel dari teks prompt:
 * - Kurung siku kapital [KEY]
 * - Mustache {{key}}
 */
export function extractClientPlaceholders(promptText: string): string[] {
  if (!promptText || typeof promptText !== "string") {
    return [];
  }

  const results: string[] = [];
  const seen = new Set<string>();

  // 1. Bracket placeholders: [ ... ]
  const bracketRegex = /\[([^\[\]\r\n]{3,})\](?!\()/g;
  let match: RegExpExecArray | null;

  while ((match = bracketRegex.exec(promptText)) !== null) {
    const fullMatch = match[0];
    const inner = match[1].trim();
    const hasUpperCase = /[A-Z]/.test(inner);
    const isPureCodeIndex = /^[a-z0-9_]+$/.test(inner);

    if (hasUpperCase && !isPureCodeIndex) {
      if (!seen.has(fullMatch)) {
        seen.add(fullMatch);
        results.push(fullMatch);
      }
    }
  }

  // 2. Mustache / double curly placeholders: {{ ... }}
  const mustacheRegex = /\{\{\s*([a-zA-Z0-9_ :/-]+)\s*\}\}/g;
  while ((match = mustacheRegex.exec(promptText)) !== null) {
    const fullMatch = match[0];
    if (!seen.has(fullMatch)) {
      seen.add(fullMatch);
      results.push(fullMatch);
    }
  }

  return results;
}

interface PlaygroundCardProps {
  prompt: string;
  originalPrompt?: string | null;
  providerId?: string | null;
  model?: string | null;
}

export function PlaygroundCard({
  prompt,
  originalPrompt,
  providerId = "groq",
  model = "llama-3.3-70b-versatile",
}: PlaygroundCardProps) {
  // Extract placeholders dynamically
  const placeholders = useMemo(() => extractClientPlaceholders(prompt), [prompt]);

  // Form State
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [testInput, setTestInput] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.3);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(1024);

  // Execution & UI State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<PromptExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showResolvedPrompt, setShowResolvedPrompt] = useState<boolean>(false);

  const handlePlaceholderChange = (key: string, value: string) => {
    setPlaceholderValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCopyOutput = async () => {
    if (!executionResult?.output) return;
    try {
      await navigator.clipboard.writeText(executionResult.output);
      setIsCopied(true);
      toast.success("Output berhasil disalin ke clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin output.");
    }
  };

  const handleRunPrompt = async () => {
    setIsRunning(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          originalPrompt: originalPrompt || null,
          placeholderValues,
          testInput: testInput.trim() ? testInput.trim() : null,
          providerId: providerId || "groq",
          targetModel: model || null,
          parameters: {
            temperature: Number(temperature),
            maxOutputTokens: Number(maxOutputTokens),
          },
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || `Eksekusi gagal dengan status ${response.status}`);
      }

      setExecutionResult(json.data);
      toast.success("Prompt berhasil dieksekusi pada target model!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengeksekusi prompt.";
      setErrorMessage(msg);
      toast.error("Eksekusi gagal: " + msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card data-testid="playground-card" className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="bg-muted/20 pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-primary fill-primary" />
              <span>Target Model Playground</span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                Vercel AI Sandbox
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Uji langsung prompt teroptimasi pada provider AI target ({providerId || "groq"} &bull; {model || "default"}) dengan nilai variabel riil.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[11px] gap-1 bg-muted/60">
              <Cpu className="h-3 w-3 text-muted-foreground" />
              <span>{providerId || "groq"}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 1. Placeholder Inputs Dynamic Form */}
        {placeholders.length > 0 && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/40 border border-border/60" data-testid="placeholder-inputs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Variable className="h-3.5 w-3.5 text-primary" />
                <span>Variabel &amp; Placeholder Terdeteksi ({placeholders.length})</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Isi nilai variabel untuk menggantikan slot template
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {placeholders.map((p) => (
                <div key={p} className="space-y-1">
                  <Label htmlFor={`placeholder-${p}`} className="text-xs font-mono font-medium text-foreground/80 flex items-center gap-1">
                    <span className="text-primary">&bull;</span> {p}
                  </Label>
                  <input
                    id={`placeholder-${p}`}
                    type="text"
                    value={placeholderValues[p] || ""}
                    onChange={(e) => handlePlaceholderChange(p, e.target.value)}
                    placeholder={`Contoh nilai untuk ${p}...`}
                    disabled={isRunning}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Optional Test Case Input */}
        <div className="space-y-1.5">
          <Label htmlFor="playground-test-input" className="text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Kasus Uji / Contoh Input Tambahan (Test Input Opsional)</span>
            </span>
            <span className="text-[10px] text-muted-foreground">Akan digabungkan di akhir prompt sebagai studi kasus</span>
          </Label>
          <Textarea
            id="playground-test-input"
            data-testid="playground-test-input"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Masukkan data sampel, cuplikan kode uji, atau studi kasus untuk dieksekusi bersama prompt..."
            rows={3}
            disabled={isRunning}
            className="text-xs font-mono resize-y"
          />
        </div>

        {/* 3. Execution Parameters & Run Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-md bg-muted/20 border border-border">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Temperature:</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                disabled={isRunning}
                className="w-16 h-7 px-2 text-xs font-mono rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Max Tokens:</span>
              <select
                value={maxOutputTokens}
                onChange={(e) => setMaxOutputTokens(parseInt(e.target.value, 10) || 1024)}
                disabled={isRunning}
                className="h-7 px-2 text-xs font-mono rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value={256}>256</option>
                <option value={512}>512</option>
                <option value={1024}>1024 (Default)</option>
                <option value={2048}>2048</option>
              </select>
            </div>
          </div>

          <Button
            type="button"
            data-testid="run-playground-btn"
            onClick={handleRunPrompt}
            disabled={isRunning}
            size="sm"
            className="gap-2 font-medium shrink-0 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Mengeksekusi Model...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Jalankan pada Model Tujuan (Run Prompt)</span>
              </>
            )}
          </Button>
        </div>

        {/* 4. Error Message Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Gagal Mengeksekusi Prompt</p>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 5. Execution Result Display */}
        {executionResult && (
          <div data-testid="playground-result" className="space-y-4 pt-2 border-t border-border">
            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[11px] font-mono gap-1 bg-primary/5 text-primary border-primary/20">
                  <Cpu className="h-3 w-3" />
                  <span>{executionResult.providerId} &bull; {executionResult.model}</span>
                </Badge>
                <Badge variant="secondary" className="text-[11px] font-mono gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{executionResult.latencyMs} ms</span>
                </Badge>
                <Badge variant="secondary" className="text-[11px] font-mono gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span>
                    {executionResult.usage?.totalTokens ?? 0} tokens
                    {executionResult.usage?.promptTokens !== undefined &&
                      ` (${executionResult.usage.promptTokens} in / ${executionResult.usage.completionTokens ?? 0} out)`}
                  </span>
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyOutput}
                className="h-7 text-xs gap-1.5 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Output</span>
                  </>
                )}
              </Button>
            </div>

            {/* Actual Output */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileCode2 className="h-3.5 w-3.5 text-primary" />
                <span>Respons Nyata Model Tujuan:</span>
              </div>
              <div className="p-4 rounded-md bg-muted/40 border border-border/80 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {executionResult.output}
              </div>
            </div>

            {/* Collapsible Resolved Prompt */}
            <div className="rounded-md border border-border/60 bg-muted/20 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowResolvedPrompt(!showResolvedPrompt)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-left"
              >
                <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>Pratinjau Prompt Final Terkirim (Resolved Prompt)</span>
                </span>
                {showResolvedPrompt ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showResolvedPrompt && (
                <div className="p-3 border-t border-border/60 bg-background/50 space-y-2">
                  <pre className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-muted-foreground">
                    {executionResult.resolvedPrompt}
                  </pre>
                  {executionResult.unresolvedPlaceholders?.length > 0 && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>
                        Peringatan: {executionResult.unresolvedPlaceholders.length} placeholder belum diisi (
                        {executionResult.unresolvedPlaceholders.join(", ")}).
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nondeterminism Notice (Blueprint 5.6 & 23) */}
            {executionResult.nondeterminismNotice && (
              <p className="text-[10px] text-muted-foreground italic leading-snug">
                &bull; {executionResult.nondeterminismNotice}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
