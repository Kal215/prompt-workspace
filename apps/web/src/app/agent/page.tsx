"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { SupervisionConsole } from "@/components/mission-control/supervision-console";
import { AgentRuntimePanel } from "@/components/agent/agent-runtime-panel";
import { AgentMemoryPanel } from "@/components/agent/agent-memory-panel";
import { AgentSkillsPanel } from "@/components/agent/agent-skills-panel";
import { UnifiedSettingsModal } from "@/components/workspace/unified-settings-modal";
import { HistorySidebar } from "@/components/workspace/history-sidebar";
import { Bot, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function AgentPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyRefreshKey] = useState(0);
  const [activeModule, setActiveModule] = useState<
    "supervision" | "runtime" | "memory" | "skills"
  >("supervision");
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
    <div className="min-h-screen bg-background text-foreground selection:bg-sky-500/20 selection:text-foreground flex flex-col font-sans firecrawl-grid-bg relative">
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
        <div className="absolute -top-4 -left-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-2xs text-sky-500">
          ✦
        </div>
        <div className="absolute -top-4 -right-4 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border shadow-2xs text-sky-500">
          ✦
        </div>

        {/* Hero Section: Enterprise Tier Branding */}
        <section className="relative pt-10 pb-8 px-4 sm:px-8 border-b border-border overflow-hidden">
          {/* Subtle ASCII Texture Background */}
          <div className="absolute inset-0 opacity-[0.12] font-mono text-[8px] leading-tight select-none pointer-events-none p-4 overflow-hidden text-neutral-500">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap">
                + · : · + . : · + · : · + . : · + · : · + . : · + · : · + . : · [PIEW_AGENT_SUPERVISION] · + · : · + . : · + · : · + . : · + · : · + . : · +
              </div>
            ))}
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-4">
            {/* Top Tier Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-3.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-400 shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-mono font-bold">PIEW ENTERPRISE AGENT</span>
              <span className="text-muted-foreground">— Autonomous Zero-Trust Execution Loop</span>
            </div>

            {/* Section Eyebrow */}
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span>{"//"}</span>
              <span className="w-2 h-2 rounded-xs bg-sky-500" />
              <span>TIER 3 • ENTERPRISE ZERO-TRUST RUNTIME</span>
              <span>{"//"}</span>
            </div>

            {/* Primary Display Title */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]">
              Autonomous agent supervision with{" "}
              <span className="text-sky-600 dark:text-sky-500 underline decoration-sky-500/30">
                disk artifact &amp; security gate
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              4-Layer Autonomous Audit, SHA-256 disk artifact inspection, Bounded Agent Loop (L0–L3),
              Hybrid Memory Vault, and Declarative Sandboxed Skill Registry.
            </p>

            {/* Plan Features Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                <span>Zero-Trust Security Gate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                <span>SHA-256 Artifact Verification</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                <span>Deterministic Rollback Engine</span>
              </span>
            </div>
          </div>
        </section>

        {/* Section Divider Band */}
        <div className="architectural-section-band">
          <span className="w-0.5 h-3.5 bg-sky-500 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-sky-600 dark:text-sky-500">01 / 02</strong> • AUTONOMOUS SUPERVISION &amp; ENTERPRISE MODULES
          </span>
        </div>

        {/* Sub-Navigation for 4 Enterprise Modules */}
        <div className="px-4 sm:px-8 py-3 border-b border-border bg-neutral-50/40 dark:bg-zinc-950/40 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            data-testid="subnav-supervision"
            onClick={() => setActiveModule("supervision")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "supervision"
                ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30 shadow-2xs"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <span>🛡️</span>
            <span>MCP Supervision Loop</span>
          </button>

          <button
            type="button"
            data-testid="subnav-runtime"
            onClick={() => setActiveModule("runtime")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "runtime"
                ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30 shadow-2xs"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <span>🤖</span>
            <span>Bounded Agent Runtime (L0–L3)</span>
          </button>

          <button
            type="button"
            data-testid="subnav-memory"
            onClick={() => setActiveModule("memory")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "memory"
                ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30 shadow-2xs"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <span>🧠</span>
            <span>Hybrid Memory Vault</span>
          </button>

          <button
            type="button"
            data-testid="subnav-skills"
            onClick={() => setActiveModule("skills")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeModule === "skills"
                ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30 shadow-2xs"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <span>🧩</span>
            <span>Declarative Skill Registry</span>
          </button>
        </div>

        {/* Modules Content Area (All mounted for DOM selector persistence) */}
        <section className="p-4 sm:p-8 border-b border-border">
          <div data-testid="mcp-supervision-view" className={activeModule === "supervision" ? "block" : "hidden"}>
            <SupervisionConsole />
          </div>

          <div className={activeModule === "runtime" ? "block" : "hidden"}>
            <AgentRuntimePanel />
          </div>

          <div className={activeModule === "memory" ? "block" : "hidden"}>
            <AgentMemoryPanel />
          </div>

          <div className={activeModule === "skills" ? "block" : "hidden"}>
            <AgentSkillsPanel />
          </div>
        </section>

        {/* Section Divider Band: Specs */}
        <div className="architectural-section-band border-b-0">
          <span className="w-0.5 h-3.5 bg-neutral-400 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-500">
            <strong className="text-foreground">02 / 02</strong> • ENTERPRISE SECURITY SPECIFICATION • PIEW v3.1
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
