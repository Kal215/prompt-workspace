"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Check,
  AlertCircle,
  Move,
  Maximize2,
} from "lucide-react";

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  // Pan & Zoom Transformation States
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  // Reset pan and zoom when chart content changes
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [chart]);

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
          theme: "neutral",
          securityLevel: "loose",
          fontFamily: "var(--font-mono, monospace)",
          themeVariables: {
            background: "#ffffff",
            primaryColor: "#f5f5f4",
            primaryTextColor: "#1c1917",
            primaryBorderColor: "#d6d3d1",
            lineColor: "#57534e",
            secondaryColor: "#e7e5e4",
            tertiaryColor: "#fafaf9",
          },
        });

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
          setError((err as Error)?.message || "Gagal merender diagram Mermaid");
          setIsRendering(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  // Non-passive wheel listener for smooth diagram zoom without scrolling the parent window
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      // Mencegah window/halaman ikut scroll saat kursor di atas kanvas diagram
      e.preventDefault();

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setScale((prevScale) => {
        const next = Math.min(Math.max(prevScale * zoomFactor, 0.2), 5.0);
        return Math.round(next * 100) / 100;
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Pointer drag event handlers (Mendukung Mouse drag, Trackpad, dan Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({
      x: Math.round(dragRef.current.initialPanX + dx),
      y: Math.round(dragRef.current.initialPanY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(5.0, Math.round((s + 0.2) * 10) / 10));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.2, Math.round((s - 0.2) * 10) / 10));
  };

  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

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
    link.download = `${(title || "architecture-blueprint").toLowerCase().replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm select-none ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 bg-[#faf9f6]">
        <div className="min-w-0 pr-2">
          {title && (
            <h4 className="text-xs font-semibold text-stone-900 truncate">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-[11px] text-stone-500 truncate">
              {description}
            </p>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Perbesar (Zoom In)"
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Perkecil (Zoom Out)"
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset Posisi & Skala"
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-stone-300 mx-0.5" />
          <button
            type="button"
            onClick={handleCopyCode}
            title="Salin Kode Mermaid"
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!svgContent}
            title="Unduh Berkas SVG"
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Infinite Canvas Viewport (Bisa Digeser & Scroll Zoom) */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex-1 min-h-[380px] max-h-[620px] overflow-hidden bg-[#faf9f6] flex items-center justify-center touch-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundImage: "radial-gradient(#e7e5e4 1.2px, transparent 1.2px)",
          backgroundSize: "20px 20px",
        }}
      >
        {isRendering ? (
          <div className="flex flex-col items-center gap-2.5 text-stone-500 text-xs py-14 pointer-events-none">
            <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
            <span>Merender diagram arsitektur...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-5 text-center max-w-md pointer-events-auto">
            <AlertCircle className="w-6 h-6 text-amber-600" />
            <p className="text-xs text-stone-600">Diagram tidak dapat dirender secara grafis.</p>
            <pre className="text-[10px] text-left p-3 rounded-xl bg-stone-100 text-stone-800 w-full overflow-x-auto font-mono border border-stone-200">
              {chart}
            </pre>
          </div>
        ) : svgContent ? (
          <div
            className={`mermaid-canvas-content w-full flex items-center justify-center ${
              isDragging ? "transition-none" : "transition-transform duration-100 ease-out"
            }`}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
              transformOrigin: "center center",
              willChange: "transform",
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-xs text-stone-500 py-14 pointer-events-none">
            Tidak ada kode diagram yang tersedia.
          </div>
        )}

        {/* Floating Canvas Badges & HUD */}
        {svgContent && !isRendering && !error && (
          <>
            {/* Gesture Helper Hint (Bottom Left) */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] font-mono text-stone-500 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs pointer-events-none">
              <Move className="w-3 h-3 text-stone-400" />
              <span>Geser untuk memindahkan • Scroll untuk zoom</span>
            </div>

            {/* Quick Floating Zoom Dock (Bottom Right) */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl border border-stone-200 shadow-sm text-xs font-mono">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>

              <span
                onClick={handleReset}
                title="Klik untuk reset zoom (100%)"
                className="px-1.5 py-0.5 text-[11px] font-semibold text-stone-700 hover:text-stone-950 cursor-pointer"
              >
                {Math.round(scale * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>

              <div className="w-[1px] h-3 bg-stone-200 mx-0.5" />

              <button
                type="button"
                onClick={handleReset}
                title="Reset Posisi (Center)"
                className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scoped CSS for Mermaid SVG Elements */}
      <style jsx global>{`
        .mermaid-canvas-content svg {
          max-width: none !important;
          height: auto !important;
          pointer-events: none !important;
          user-select: none !important;
        }
      `}</style>
    </div>
  );
}
