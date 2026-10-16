"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { UserGuideSection } from "@/components/workspace/user-guide-section";
import { PrivacyDisclosure } from "@/components/workspace/privacy-disclosure";
import { UnifiedSettingsModal } from "@/components/workspace/unified-settings-modal";
import { HistorySidebar } from "@/components/workspace/history-sidebar";
import {
  BookOpen,
  Cpu,
  ShieldCheck,
  Plug,
} from "lucide-react";

export default function DocsPage() {
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

        {/* Hero Section: Documentation Header */}
        <section className="relative pt-12 pb-8 px-4 sm:px-8 border-b border-border overflow-hidden">
          {/* Subtle ASCII Texture Background */}
          <div className="absolute inset-0 opacity-[0.12] font-mono text-[8px] leading-tight select-none pointer-events-none p-4 overflow-hidden text-neutral-500">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap">
                + · : · + . : · + · : · + . : · + · : · + . : · + · : · + . : · [PIEW_DOCS_REPOSITORY] · + · : · + . : · + · : · + . : · + · : · + . : · +
              </div>
            ))}
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-4">
            {/* Top Tier Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-border px-3.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-[#FF4D00]" />
              <span className="font-mono text-[#FF4D00] font-bold">PIEW DOCUMENTATION</span>
              <span>— Architectural Specs, Governance &amp; User Guides</span>
            </div>

            {/* Section Eyebrow */}
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span>{"//"}</span>
              <span className="w-2 h-2 rounded-xs bg-[#FF4D00]" />
              <span>REFERENCE ARCHITECTURE &amp; ZERO-TRUST SPEC</span>
              <span>{"//"}</span>
            </div>

            {/* Primary Display Title */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]">
              Platform specifications &amp;{" "}
              <span className="text-[#FF4D00]">prompt engineering guide</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Complete reference documentation for multi-model synthesis, adversarial defense matrix, Model Context Protocol hub, and enterprise privacy compliance.
            </p>
          </div>
        </section>

        {/* Section Divider Band 01: Architectural Capabilities */}
        <div id="capabilities" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-[#FF4D00] shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-[#FF4D00]">01 / 04</strong> • ARCHITECTURAL CAPABILITIES &amp; ZERO-TRUST SPEC
          </span>
        </div>

        {/* Section 01: Three Pillars Grid */}
        <section className="p-6 sm:p-10 border-b border-border space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 border border-border rounded-2xl overflow-hidden bg-card">
            {/* Capability 1 */}
            <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-border space-y-4 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Multi-Model Synthesis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with Groq LPUs, Google Gemini, OpenRouter, and local Ollama models with automatic key rotation and zero latency overhead.
              </p>
              <div className="pt-2 text-xs font-mono text-[#FF4D00] flex items-center gap-1 font-semibold">
                <span>Pelajari model adaptif ›</span>
              </div>
            </div>

            {/* Capability 2 */}
            <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-border space-y-4 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Adversarial Defense</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Spider 5-category stress testing automatically probes prompt stability against prompt injection, jailbreaks, and context drifting before deployment.
              </p>
              <div className="pt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <span>Evaluasi spider matrix ›</span>
              </div>
            </div>

            {/* Capability 3 */}
            <div className="p-6 sm:p-8 space-y-4 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                <Plug className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Universal MCP Hub</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seamlessly ground prompts with live context from Model Context Protocol servers: Figma, GitHub, Brave Search, and Postgres databases.
              </p>
              <div className="pt-2 text-xs font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1 font-semibold">
                <span>Jelajahi konektor ›</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider Band 02: User Guide */}
        <div id="guide" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-[#FF4D00] shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-[#FF4D00]">02 / 04</strong> • COMPREHENSIVE USER GUIDE &amp; BEST PRACTICES
          </span>
        </div>

        {/* Section 02: User Guide */}
        <section className="p-6 sm:p-10 border-b border-border">
          <UserGuideSection />
        </section>

        {/* Section Divider Band 03: Privacy Disclosure */}
        <div id="privacy" className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-emerald-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-emerald-600 dark:text-emerald-400">03 / 04</strong> • PRIVACY DISCLOSURE &amp; ZERO RAW-PROMPT LOGGING
          </span>
        </div>

        {/* Section 03: Privacy Policy */}
        <section className="p-6 sm:p-10 border-b border-border">
          <PrivacyDisclosure />
        </section>

        {/* Section Divider Band 04: Tier Specifications */}
        <div id="tiers" className="architectural-section-band border-b-0">
          <span className="w-0.5 h-3.5 bg-neutral-400 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-foreground">04 / 04</strong> • ARCHITECTURAL TIERS &amp; COMMERCIAL PACKAGING • PIEW v3.1
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
