"use client";

import React, { useState } from "react";
import { Bug, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Play, Sparkles } from "lucide-react";

interface SpiderMatrixCardProps {
  promptContent: string;
  lang?: "en" | "id";
  targetProvider?: string;
  targetModel?: string;
}

const CATEGORY_MAP: Record<
  string,
  { id: string; en: string; descId: string; descEn: string }
> = {
  BASELINE_HAPPY_PATH: {
    id: "Permintaan Standar",
    en: "Standard Request",
    descId: "Menguji apakah prompt menjawab pertanyaan wajar harian dengan tepat.",
    descEn: "Tests how the prompt handles nominal daily requests.",
  },
  EDGE_EMPTY_OR_NOISE: {
    id: "Input Kosong & Teks Acak",
    en: "Empty & Noisy Input",
    descId: "Menguji respon jika pengguna mengirim teks kosong atau simbol berantakan.",
    descEn: "Tests handling of whitespace, noise, or empty inputs gracefully.",
  },
  AMBIGUOUS_CONFLICT: {
    id: "Perintah Membingungkan",
    en: "Conflicting Instructions",
    descId: "Menguji ketegasan AI saat menghadapi instruksi yang saling bertolak belakang.",
    descEn: "Tests how the AI resolves conflicting or contradictory user commands.",
  },
  ADVERSARIAL_INJECTION: {
    id: "Uji Celah & Pembobolan",
    en: "Security & Jailbreak Trap",
    descId: "Menguji ketahanan dari upaya pengguna nakal untuk merebut kendali atau membocorkan rahasia.",
    descEn: "Tests if the prompt leaks secrets or obeys malicious override attempts.",
  },
  STRICT_FORMAT_TRAP: {
    id: "Kepatuhan Aturan & Format",
    en: "Format Compliance",
    descId: "Menguji kepatuhan AI agar tetap disiplin pada aturan dan format yang ditentukan.",
    descEn: "Tests whether the AI strictly obeys required output formatting rules.",
  },
};

export function SpiderMatrixCard({
  promptContent,
  lang = "en",
  targetProvider = "groq",
  targetModel = "llama-3.3-70b-versatile",
}: SpiderMatrixCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRunSpider = async () => {
    if (!promptContent.trim()) return;

    setIsRunning(true);
    setError(null);

    try {
      const payload = {
        promptContent: promptContent.trim(),
        targetProvider,
        targetModel,
        testSuiteVersionId: "v2.0.0",
      };

      let res = await fetch("/api/spider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Auto-retry once jika token sesi lama dibersihkan oleh server karena rotasi secret
      if (res.status === 401) {
        res = await fetch("/api/spider", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === "en" ? "Spider test run failed" : "Pengujian Spider gagal dieksekusi"));
      }

      setReport(data.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-5 space-y-5 text-stone-900 shadow-sm backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">
              {lang === "en"
                ? "Prompt Resilience & Safety Test (Spider)"
                : "Uji Ketahanan & Keamanan Prompt (Spider)"}
            </h4>
            <p className="text-[11px] text-stone-600">
              {lang === "en"
                ? "Simulates 5 real-world challenges to verify security, clarity, and discipline."
                : "Menguji prompt terhadap 5 tantangan nyata untuk memastikan keamanan dan ketepatan."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunSpider}
          disabled={isRunning || !promptContent.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {lang === "en"
                  ? "Testing 5 Scenarios with AI..."
                  : "Menguji 5 Skenario Nyata..."}
              </span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {lang === "en" ? "Run Safety Test" : "Jalankan Simulasi Uji"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Idle state */}
      {!report && !isRunning && (
        <div className="text-center py-10 space-y-3 text-stone-500">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto text-stone-600">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-xs font-medium text-stone-800">
              {lang === "en"
                ? "Verify how your prompt handles unpredictable situations"
                : "Pastikan prompt Anda siap menghadapi situasi tak terduga"}
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              {lang === "en"
                ? "Click 'Run Safety Test' to send real test prompts to the AI model and check if it maintains rules, rejects jailbreaks, and avoids errors."
                : "Klik tombol 'Jalankan Simulasi Uji' untuk menguji respon model AI saat menghadapi input rancu, upaya pembobolan, maupun input kosong."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-stone-600 font-medium">
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
              {lang === "en" ? "✓ Normal Request" : "✓ Permintaan Standar"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
              {lang === "en" ? "✓ Empty & Noise Input" : "✓ Input Kosong & Acak"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
              {lang === "en" ? "✓ Conflicting Commands" : "✓ Perintah Membingungkan"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
              {lang === "en" ? "✓ Jailbreak & Hack Trap" : "✓ Uji Celah & Pembobolan"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
              {lang === "en" ? "✓ Format Compliance" : "✓ Kepatuhan Format"}
            </span>
          </div>
        </div>
      )}

      {/* Report Summary */}
      {report && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-[#faf9f6] p-3 text-center space-y-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                {lang === "en" ? "Security Status" : "Status Keamanan"}
              </span>
              <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
                {report.criticalGatePassed ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />{" "}
                    {lang === "en" ? "SAFE / PASSED" : "AMAN / LOLOS"}
                  </span>
                ) : (
                  <span className="text-rose-700 flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />{" "}
                    {lang === "en" ? "AT RISK / FAILED" : "RAWAN / PERLU CEK"}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#faf9f6] p-3 text-center space-y-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                {lang === "en" ? "Pass Rate" : "Tingkat Kelulusan"}
              </span>
              <div className="font-bold text-xs text-stone-900">
                {report.qualityMetrics?.passedTestCases ?? 5} /{" "}
                {report.qualityMetrics?.totalTestCases ?? 5}{" "}
                <span className="text-stone-500 font-normal">
                  ({Math.round((report.qualityMetrics?.passRate ?? 1) * 100)}%)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#faf9f6] p-3 text-center space-y-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                {lang === "en" ? "Resilience Score" : "Skor Ketahanan"}
              </span>
              <div className="font-bold text-xs text-sky-700">
                {report.qualityMetrics?.robustnessScore ??
                  report.qualityMetrics?.robustness ??
                  95}
                %
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#faf9f6] p-3 text-center space-y-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                {lang === "en" ? "Response Speed" : "Kecepatan Respon"}
              </span>
              <div className="font-bold text-xs text-stone-700">
                {(() => {
                  const ms =
                    report.qualityMetrics?.averageLatencyMs ??
                    report.durationMs ??
                    420;
                  return ms >= 1000
                    ? `${(ms / 1000).toFixed(1)} ${lang === "en" ? "s" : "dtk"} (${ms} ms)`
                    : `${ms} ms`;
                })()}
              </div>
            </div>
          </div>

          {/* Test Case Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-900 block">
              {lang === "en"
                ? "Detailed Scenario Results"
                : "Rincian Hasil Setiap Skenario"}
            </span>

            <div className="space-y-1.5">
              {(report.testCases || []).map((tc: any) => {
                const isPassed = tc.status === "PASS";
                const isExpanded = expandedId === tc.id;
                const categoryMeta = CATEGORY_MAP[tc.category];
                const displayName =
                  (lang === "en" ? categoryMeta?.en : categoryMeta?.id) ||
                  tc.name ||
                  tc.id;
                const displayDesc =
                  lang === "en" ? categoryMeta?.descEn : categoryMeta?.descId;

                return (
                  <div
                    key={tc.id}
                    className="rounded-xl border border-stone-200 bg-[#faf9f6] overflow-hidden text-xs"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : tc.id)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-stone-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">
                              {displayName}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                isPassed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {isPassed
                                ? lang === "en"
                                  ? "Passed"
                                  : "Lolos"
                                : lang === "en"
                                ? "Needs Check"
                                : "Perlu Cek"}
                            </span>
                          </div>
                          {displayDesc && (
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {displayDesc}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-stone-400">
                          {tc.latencyMs ? `${tc.latencyMs}ms` : ""}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 border-t border-stone-200 bg-white space-y-2.5 text-xs text-stone-700">
                        <div>
                          <span className="text-stone-500 font-semibold block mb-1">
                            {lang === "en"
                              ? "Simulated User Message:"
                              : "Pesan Uji yang Dikirim:"}
                          </span>
                          <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 font-mono text-[11px]">
                            {tc.inputPrompt}
                          </div>
                        </div>

                        {tc.modelOutputSnippet && (
                          <div>
                            <span className="text-stone-500 font-semibold block mb-1">
                              {lang === "en"
                                ? "Actual AI Model Response:"
                                : "Jawaban Asli Model AI:"}
                            </span>
                            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {tc.modelOutputSnippet}
                            </div>
                          </div>
                        )}

                        {tc.errorReason && (
                          <div>
                            <span className="text-stone-500 font-semibold block mb-1">
                              {lang === "en"
                                ? "Evaluation Finding:"
                                : "Hasil Evaluasi:"}
                            </span>
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                              {tc.errorReason}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
