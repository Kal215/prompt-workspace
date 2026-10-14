"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PromptOptimizationResult } from "@/types/prompt";
import { ResultDashboard } from "@/components/workspace/result-dashboard";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sliders,
} from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptOptimizationResult | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setError("Prompt asli tidak boleh kosong.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: context.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan optimasi prompt.");
      }

      setResult(data as PromptOptimizationResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan yang tidak terduga."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setContext("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight sm:text-base">
                Prompt Intelligence Workspace
              </span>
              <span className="ml-2 text-xs text-muted-foreground hidden sm:inline-block border border-border px-1.5 py-0.5 rounded font-mono">
                MVP v1.0
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Engine Mock Ready</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Intro */}
        <section className="text-center max-w-2xl mx-auto space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Rekayasa & Optimasi Prompt Terstruktur
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Audit semantik, perkuat batasan eksekusi (guardrails), dan validasi preserved intent sebelum digunakan di model produksi.
          </p>
        </section>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Input Form Column */}
          <section
            className={`space-y-4 transition-all duration-200 ${
              result ? "lg:col-span-4" : "lg:col-span-5"
            }`}
          >
            <Card className="border-border/80 shadow-xs sticky top-20">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-semibold">
                      Input Prompt
                    </CardTitle>
                  </div>
                  {prompt && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {prompt.length} karakter
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Masukkan prompt asli dan konteks operasional yang ingin Anda evaluasi.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Prompt Input */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="original-prompt"
                      className="font-medium text-xs flex items-center justify-between"
                    >
                      <span>
                        Prompt Asli <span className="text-destructive">*</span>
                      </span>
                    </Label>
                    <Textarea
                      id="original-prompt"
                      rows={result ? 5 : 7}
                      placeholder="Contoh: Buatkan saya fungsi TypeScript debounce dengan parameter immediate execution..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-xs font-mono leading-relaxed focus-visible:ring-1"
                      required
                    />
                  </div>

                  {/* Context Input */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="context-prompt"
                      className="font-medium text-xs flex items-center justify-between"
                    >
                      <span>
                        Konteks Tambahan{" "}
                        <span className="text-muted-foreground font-normal">
                          (Opsional)
                        </span>
                      </span>
                    </Label>
                    <Textarea
                      id="context-prompt"
                      rows={result ? 2 : 3}
                      placeholder="Contoh: Gunakan framework Next.js 16 App Router, target produksi enterprise..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-xs leading-relaxed"
                    />
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>{error}</div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={isLoading || !prompt.trim()}
                      className="flex-1 h-9 text-xs font-medium cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Menganalisis & Mengoptimasi...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3.5 w-3.5" />
                          Analisis & Optimasi
                        </>
                      )}
                    </Button>

                    {(prompt || result) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={isLoading}
                        title="Reset Form"
                        className="h-9 px-3 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* Result / Output Section */}
          <section
            className={`space-y-6 ${
              result ? "lg:col-span-8" : "lg:col-span-7"
            }`}
          >
            {!result && !isLoading && (
              <Card className="border-dashed border-border/80 bg-muted/20 h-full min-h-[380px] flex items-center justify-center p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Belum Ada Hasil Analisis
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ketik prompt Anda di kolom sebelah kiri lalu klik tombol{" "}
                    <span className="font-semibold text-foreground">
                      Analisis & Optimasi
                    </span>{" "}
                    untuk melihat audit Intent Guard, rincian temuan perbaikan, serta perbandingan diff prompt.
                  </p>
                </div>
              </Card>
            )}

            {isLoading && (
              <Card className="border-border/80 min-h-[420px] flex items-center justify-center p-8 text-center animate-pulse">
                <div className="space-y-4 max-w-sm">
                  <Loader2 className="h-9 w-9 animate-spin mx-auto text-primary" />
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground text-sm">
                      Memproses Rekayasa & Evaluasi Prompt...
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Menjalankan audit semantik, memetakan polaritas intent, memeriksa ambiguitas, dan menyusun prompt berstandar produksi.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {result && !isLoading && (
              <ResultDashboard
                result={result}
                onRegenerate={() => handleSubmit()}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
