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
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptOptimizationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleCopy = async () => {
    if (!result?.optimizedPrompt) return;
    try {
      await navigator.clipboard.writeText(result.optimizedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks", err);
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
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight sm:text-base">
                Prompt Intelligence Workspace
              </span>
              <span className="ml-2 text-xs text-muted-foreground hidden sm:inline-block border border-border px-1.5 py-0.5 rounded">
                MVP v1.0
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Mock Ready</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Intro */}
        <section className="text-center max-w-2xl mx-auto space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Rekayasa & Optimasi Prompt Terstruktur
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Temukan celah ambiguitas, pertegas batasan instruksi, dan evaluasi hasil optimasi sebelum digunakan di model produksi.
          </p>
        </section>

        {/* Input Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <section className="lg:col-span-6 space-y-6">
            <Card className="border-border/80 shadow-xs">
              <CardHeader>
                <CardTitle>Input Prompt</CardTitle>
                <CardDescription>
                  Masukkan prompt yang ingin Anda analisis dan optimasi.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Prompt Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="original-prompt" className="font-medium text-sm">
                        Prompt Asli <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {prompt.length} karakter
                      </span>
                    </div>
                    <Textarea
                      id="original-prompt"
                      rows={7}
                      placeholder="Contoh: Buatkan saya draft email penawaran kerja sama untuk klien baru..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-sm font-sans leading-relaxed focus-visible:ring-1"
                      required
                    />
                  </div>

                  {/* Context Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="context-prompt" className="font-medium text-sm">
                        Konteks Tambahan <span className="text-xs text-muted-foreground font-normal">(Opsional)</span>
                      </Label>
                    </div>
                    <Textarea
                      id="context-prompt"
                      rows={3}
                      placeholder="Contoh: Nada bahasa profesional tapi santai, target audiens adalah startup founder teknologi..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-sm leading-relaxed"
                    />
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>{error}</div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading || !prompt.trim()}
                      className="flex-1 h-10 font-medium cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menganalisis & Mengoptimasi...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
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
                        className="h-10 px-3 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* Result / Output Section */}
          <section className="lg:col-span-6 space-y-6">
            {!result && !isLoading && (
              <Card className="border-dashed border-border/80 bg-muted/20 h-full min-h-[380px] flex items-center justify-center p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-foreground text-sm">Belum Ada Hasil</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tuliskan prompt Anda di sebelah kiri lalu klik tombol{" "}
                    <span className="font-semibold text-foreground">Analisis & Optimasi</span> untuk melihat hasil audit struktural dan versi prompt teroptimasi.
                  </p>
                </div>
              </Card>
            )}

            {isLoading && (
              <Card className="border-border/80 min-h-[380px] flex items-center justify-center p-8 text-center animate-pulse">
                <div className="space-y-4 max-w-sm">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <div className="space-y-1.5">
                    <h3 className="font-medium text-foreground text-sm">
                      Memproses Optimasi Prompt...
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Mengevaluasi struktur semantik, intent, dan kelengkapan konteks.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {result && !isLoading && (
              <div className="space-y-6">
                {/* Optimized Prompt Card */}
                <Card className="border-border/80 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Prompt Teroptimasi
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Siap disalin dan diuji coba pada LLM target
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Salin
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted/40 border border-border/60 p-4 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
                      {result.optimizedPrompt}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis Findings Card */}
                <Card className="border-border/80 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Temuan Analisis Engine</CardTitle>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Skor: {result.analysis.score}/100
                      </span>
                    </div>
                    <CardDescription className="text-xs">
                      Evaluasi kualitas instruksi berdasarkan aturan intent dan konteks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.analysis.findings.map((item, idx) => {
                      const isWarning = item.severity === "warning";
                      const isInfo = item.severity === "info";
                      const isSuccess = item.severity === "success";

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-xs sm:text-sm"
                        >
                          {isWarning && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          {isInfo && (
                            <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                          )}
                          {isSuccess && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <p className="text-foreground leading-relaxed">
                              {item.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              Tipe: {item.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40">
                      <span>Request ID: {result.requestId.slice(0, 8)}...</span>
                      <span>Target: {result.metadata.modelTarget}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
