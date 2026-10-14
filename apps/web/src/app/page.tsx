"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { PromptOptimizationResult } from "@/types/prompt";
import { ResultDashboard } from "@/components/workspace/result-dashboard";
import {
  HistorySidebar,
  SavedPromptItem,
} from "@/components/workspace/history-sidebar";
import { PrivacyDisclosure } from "@/components/workspace/privacy-disclosure";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sliders,
  RefreshCw,
  Cpu,
  History,
} from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptOptimizationResult | null>(null);

  // History Sidebar state (real-time SQLite database)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyCount, setHistoryCount] = useState<number>(0);

  // Sync initial history count from SQLite database
  useEffect(() => {
    fetch("/api/history?limit=50")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setHistoryCount(json.data.length);
        }
      })
      .catch(() => {});
  }, [historyRefreshKey]);

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
        throw new Error(
          data.error ||
            "Engine sedang sibuk atau gagal menganalisis. Coba lagi atau sederhanakan prompt."
        );
      }

      setResult(data as PromptOptimizationResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Engine sedang sibuk atau gagal menganalisis. Coba lagi atau sederhanakan prompt."
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

  const handleSelectHistoryPrompt = (item: SavedPromptItem) => {
    setPrompt(item.originalPrompt);
    setIsHistoryOpen(false);
    toast.info("Prompt dimuat ke editor workspace", {
      description: "Anda dapat memodifikasi atau menganalisis ulang prompt ini.",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleSelectHistoryPrompt}
        refreshKey={historyRefreshKey}
        onCountChange={setHistoryCount}
      />

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
                v1.0 (Live Engine)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* History Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="h-8 text-xs gap-1.5 cursor-pointer border-border/80 hover:bg-muted/60"
            >
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Riwayat</span>
              {historyCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0 font-mono"
                >
                  {historyCount}
                </Badge>
              )}
            </Button>

            {/* Groq Engine Live Indicator */}
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2 pl-2 border-l border-border/40">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground/80 flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Groq Engine Live
              </span>
            </div>
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
                      placeholder="Contoh: Buatkan saya kode Python untuk web scraping..."
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
                      placeholder="Contoh: Target e-commerce data extraction, gunakan BeautifulSoup..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      disabled={isLoading}
                      className="resize-y text-xs leading-relaxed"
                    />
                  </div>

                  {/* Error Notification Alert */}
                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-3 animate-in fade-in">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="font-semibold text-destructive">
                          Terjadi Kendala Pemrosesan
                        </div>
                        <div className="leading-relaxed opacity-90">{error}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmit()}
                          className="mt-1 h-7 text-[11px] border-destructive/30 hover:bg-destructive/20 text-destructive cursor-pointer"
                        >
                          <RefreshCw className="mr-1.5 h-3 w-3" />
                          Coba Lagi
                        </Button>
                      </div>
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

                {/* Privacy, External Provider & Data Retention Disclosure */}
                <PrivacyDisclosure />
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
                    untuk menjalankan audit Intent Guard, temuan taksonomi kelemahan, serta rekonstruksi prompt berstandar produksi.
                  </p>
                </div>
              </Card>
            )}

            {isLoading && (
              <Card className="border-border/80 min-h-[420px] flex items-center justify-center p-8 text-center animate-pulse">
                <div className="space-y-4 max-w-sm">
                  <Loader2 className="h-9 w-9 animate-spin mx-auto text-primary" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground text-sm">
                      Menjalankan Pipeline Engine via Groq LLM...
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tahap 1: Analyzer (audit kelemahan semantik & deteksi maksud)
                      <br />
                      Tahap 2: Optimizer (rekonstruksi prompt terstruktur & Intent Preservation)
                    </p>
                    <span className="inline-block text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                      Estimasi durasi: 3-8 detik
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {result && !isLoading && (
              <ResultDashboard
                result={result}
                onRegenerate={() => handleSubmit()}
                onRefreshHistory={() =>
                  setHistoryRefreshKey((prev) => prev + 1)
                }
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
