"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BlueprintStudio } from "@/components/mission-control/blueprint-studio";
import { UnifiedSettingsModal } from "@/components/workspace/unified-settings-modal";
import { HistorySidebar } from "@/components/workspace/history-sidebar";
import { Cpu, CheckCircle2 } from "lucide-react";

export default function ProPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyRefreshKey] = useState(0);
  const [settingsState, setSettingsState] = useState<{
    isOpen: boolean;
    initialTab: "providers" | "connectors";
  }>({
    isOpen: false,
    initialTab: "providers",
  });

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

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#FF4D00]/20 selection:text-foreground flex flex-col font-sans firecrawl-grid-bg relative">
      {/* Universal Top Navigation Header */}
      <AppHeader
        historyCount={historyCount}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={(tab = "providers") =>
          setSettingsState({ isOpen: true, initialTab: tab })
        }
      />

      {/* Architectural Grid Master Frame Container */}
      <div className="w-full max-w-[1320px] mx-auto border-x border-border bg-background flex-1 flex flex-col relative shadow-[0_0_80px_rgba(0,0,0,0.02)]">
        {/* Sparkle Crosshair Pins at Container Corners */}
        <div className="absolute -top-4 -left-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-2xs text-[#FF4D00]">
          ✦
        </div>
        <div className="absolute -top-4 -right-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-2xs text-[#FF4D00]">
          ✦
        </div>

        {/* Hero Section: Pro Tier Branding */}
        <section className="relative pt-10 pb-8 px-4 sm:px-8 border-b border-border overflow-hidden">
          {/* Subtle ASCII Texture Background */}
          <div className="absolute inset-0 opacity-[0.12] font-mono text-[8px] leading-tight select-none pointer-events-none p-4 overflow-hidden text-neutral-500">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap">
                + · : · + . : · + · : · + . : · + · : · + . : · + · : · + . : · [PIEW_PRO_TOPOLOGY] · + · : · + . : · + · : · + . : · + · : · + . : · +
              </div>
            ))}
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-4">
            {/* Top Tier Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 shadow-2xs">
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono font-bold">PIEW PRO ARCHITECT</span>
              <span className="text-muted-foreground">— Multi-Agent Meta-Blueprint Engine</span>
            </div>

            {/* Section Eyebrow */}
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span>{"//"}</span>
              <span className="w-2 h-2 rounded-xs bg-amber-500" />
              <span>TIER 2 • PROFESSIONAL ARCHITECTURE SUITE</span>
              <span>{"//"}</span>
            </div>

            {/* Primary Display Title */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]">
              Architect multi-stage AI systems with{" "}
              <span className="text-amber-600 dark:text-amber-500 underline decoration-amber-500/30">
                Mermaid topology &amp; council
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Synthesize full-system blueprints with reactive Mermaid diagrams, multi-specialist council review, and 6-phase executable roadmaps.
            </p>

            {/* Plan Features Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Unlimited Blueprint Synthesis</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Interactive Mermaid Graphs</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Specialist Council Consensus</span>
              </span>
            </div>
          </div>
        </section>

        {/* Section Divider Band */}
        <div className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-amber-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-amber-600 dark:text-amber-500">01 / 02</strong> • META-BLUEPRINT &amp; TOPOLOGY STUDIO
          </span>
        </div>

        {/* Blueprint Studio Workspace */}
        <section className="p-4 sm:p-8 border-b border-border">
          <BlueprintStudio />
        </section>

        {/* Section Divider Band: Specs */}
        <div className="architectural-section-band border-b-0">
          <span className="w-0.5 h-3.5 bg-neutral-400 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-foreground">02 / 02</strong> • ENTERPRISE SPECIFICATION • PIEW PRO v3.1
          </span>
        </div>
      </div>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        refreshKey={historyRefreshKey}
        onCountChange={setHistoryCount}
      />

      {/* Unified Settings Modal */}
      <UnifiedSettingsModal
        isOpen={settingsState.isOpen}
        initialTab={settingsState.initialTab}
        onClose={() => setSettingsState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
