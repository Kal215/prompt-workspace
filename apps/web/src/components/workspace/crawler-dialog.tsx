"use client";

import React, { useState } from "react";
import { Globe, ShieldCheck, AlertCircle, Loader2, Check, ArrowRight, ExternalLink } from "lucide-react";

interface CrawlerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroundingImported: (data: { sourceUrl: string; facts: string[]; combinedText: string }) => void;
  lang?: "en" | "id";
  initialUrl?: string;
}

export function CrawlerDialog({
  isOpen,
  onClose,
  onGroundingImported,
  lang = "en",
  initialUrl = "",
}: CrawlerDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl, isOpen]);

  if (!isOpen) return null;

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        targetUrl: url.trim(),
        mode: "EXTRACT_GROUNDING_CONTEXT",
        sourceType: url.includes("github") ? "GITHUB_RAW_FILE" : "DOCUMENTATION_PAGE",
      };

      let res = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Auto-retry once jika token sesi lama dibersihkan oleh server
      if (res.status === 401) {
        res = await fetch("/api/crawl", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === "en" ? "Failed to extract content from URL" : "Gagal mengekstrak konten dari URL"));
      }

      setResult(data.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    const facts = (result.items || []).map((it: any) => it.content || it.snippet || "");
    const combinedText = facts.join("\n\n---\n\n");
    onGroundingImported({
      sourceUrl: result.sourceUrl,
      facts,
      combinedText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-stone-200 bg-[#faf9f6] p-6 shadow-2xl text-stone-900 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                {lang === "en" ? "Web Crawler Grounding" : "Penyedot Konteks Web (Grounding)"}
              </h3>
              <p className="text-xs text-stone-600">
                {lang === "en"
                  ? "Import technical specifications or API docs safely with SSRF Guard."
                  : "Impor spesifikasi teknis atau dokumentasi API resmi secara aman."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 transition-colors text-xs font-mono px-2 py-1 rounded-md hover:bg-stone-200/60 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCrawl} className="space-y-3">
          <label className="block text-xs font-medium text-stone-700">
            {lang === "en" ? "Documentation / GitHub Raw URL" : "URL Dokumentasi Resmi / File Mentah GitHub"}
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.stripe.com/webhooks or https://raw.githubusercontent.com/..."
              className="flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-300/40 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === "en" ? "Crawling..." : "Menyedot..."}</span>
                </>
              ) : (
                <>
                  <span>{lang === "en" ? "Fetch Facts" : "Ambil Fakta"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Feature Indicators */}
        <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono border-t border-white/[0.04] pt-3">
          <span className="flex items-center gap-1.5 text-emerald-400/90">
            <ShieldCheck className="w-3.5 h-3.5" /> SSRF Loopback Guard
          </span>
          <span className="flex items-center gap-1.5 text-sky-400/90">
            <Check className="w-3.5 h-3.5" /> Secret Auto-Redaction
          </span>
          <span>Max 512 KB</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Result Preview */}
        {result && (
          <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {lang === "en"
                  ? `Extracted ${(result.items || []).length} Grounding Facts`
                  : `Berhasil Mengekstrak ${(result.items || []).length} Fakta Konteks`}
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                {(result.bytesRead / 1024).toFixed(1)} KB read
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {(result.items || []).slice(0, 4).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] font-mono text-zinc-400 leading-relaxed"
                >
                  {item.snippet || item.content}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="w-full rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-400 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <span>{lang === "en" ? "Inject into Master Prompt Workspace" : "Terapkan Fakta ke Workspace"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
