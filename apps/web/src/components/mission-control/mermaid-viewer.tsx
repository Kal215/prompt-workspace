"use client";

import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download, Copy, Check, AlertCircle } from "lucide-react";

interface MermaidViewerProps {
  chart: string;
  title?: string;
  description?: string;
  className?: string;
}

export function MermaidViewer({
  chart,
  title,
  description,
  className = "",
}: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart || !chart.trim()) {
        setSvgContent("");
        setError(null);
        setIsRendering(false);
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-jetbrains, monospace)",
          themeVariables: {
            darkMode: true,
            background: "#09090b",
            primaryColor: "#27272a",
            primaryTextColor: "#f4f4f5",
            primaryBorderColor: "#52525b",
            lineColor: "#71717a",
            secondaryColor: "#18181b",
            tertiaryColor: "#111113",
          },
        });

        // Bersihkan karakter tak terduga atau format chart
        const sanitizedChart = chart.trim();
        const id = `mermaid-svg-${Math.random().toString(36).slice(2, 10)}`;

        const { svg } = await mermaid.render(id, sanitizedChart);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn("[MERMAID_RENDER_WARN]", err);
          setError((err as Error)?.message || "Gagal me-render diagram Mermaid");
          setIsRendering(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleZoomIn = () => setScale((s) => Math.min(2.5, s + 0.2));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, s - 0.2));
  const handleReset = () => setScale(1);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "diagram").toLowerCase().replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-sm ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="min-w-0 pr-2">
          {title && (
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {description}
            </p>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset Skala"
            className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-800 mx-0.5" />
          <button
            type="button"
            onClick={handleCopyCode}
            title="Salin Kode Mermaid"
            className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!svgContent}
            title="Unduh File SVG"
            className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Render Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[300px] max-h-[550px] overflow-auto p-4 flex items-center justify-center bg-zinc-900/10 dark:bg-black/40"
      >
        {isRendering ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs py-8">
            <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <span>Me-render diagram arsitektur...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center max-w-md">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <p className="text-xs text-zinc-400">Diagram tidak dapat di-render secara grafis.</p>
            <pre className="text-[10px] text-left p-3 rounded bg-zinc-900 text-zinc-300 w-full overflow-x-auto font-mono">
              {chart}
            </pre>
          </div>
        ) : svgContent ? (
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
            className="transition-transform duration-150 ease-out flex items-center justify-center w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-xs text-zinc-500 py-8">Tidak ada kode diagram yang tersedia.</div>
        )}
      </div>

      {/* Scale Indicator */}
      {svgContent && (
        <div className="absolute bottom-2 right-3 text-[10px] font-mono text-zinc-500 bg-zinc-900/60 backdrop-blur-xs px-2 py-0.5 rounded border border-zinc-800 pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
