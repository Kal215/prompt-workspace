"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TerminalSquare,
  Cpu,
  Bot,
  BookOpen,
  Sliders,
  History,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppHeaderProps {
  historyCount?: number;
  onOpenHistory?: () => void;
  onOpenSettings?: (initialTab?: "providers" | "connectors") => void;
}

export function AppHeader({
  historyCount = 0,
  onOpenHistory,
  onOpenSettings,
}: AppHeaderProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Classic",
      fullLabel: "⚡ Classic Studio",
      icon: Zap,
      active: pathname === "/",
      badge: "v2.0",
      testId: "tab-classic-studio",
    },
    {
      href: "/pro",
      label: "Pro",
      fullLabel: "🏛 Pro Architect",
      icon: Cpu,
      active: pathname === "/pro",
      badge: "PRO",
      testId: "tab-pro-architect",
    },
    {
      href: "/agent",
      label: "Agent",
      fullLabel: "🤖 Agent Console",
      icon: Bot,
      active: pathname === "/agent",
      badge: "v3.1",
      testId: "tab-agent-supervision",
    },
    {
      href: "/docs",
      label: "Docs",
      fullLabel: "📖 Docs & Specs",
      icon: BookOpen,
      active: pathname === "/docs",
      badge: null,
      testId: "tab-docs-specs",
    },
  ];

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-background/85 backdrop-blur-md border-b border-border px-3 sm:px-6 flex items-center justify-between overflow-x-auto sm:overflow-x-visible no-scrollbar">
      {/* Left: Brand Identity & Tier Navigation */}
      <div className="flex items-center gap-2 sm:gap-6 shrink-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-[#FF4D00] text-white flex items-center justify-center font-bold shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <TerminalSquare className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-base tracking-tight text-foreground whitespace-nowrap">
              Prompt Intelligence Workspace
            </span>
            <span className="text-[10px] text-neutral-500 font-mono border border-border px-1.5 py-0.5 rounded bg-muted/60 hidden sm:inline-block">
              v3.1
            </span>
          </div>
        </Link>

        <span className="text-border hidden md:inline">/</span>

        {/* 4-Tier Top Navigation Segmented Switcher */}
        <nav className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-muted/70 border border-border shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                  item.active
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                {item.active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
                )}
                <Icon className={`w-3.5 h-3.5 ${item.active ? "text-[#FF4D00]" : "text-muted-foreground"}`} />
                <span className="hidden md:inline">{item.fullLabel}</span>
                <span className="md:hidden">{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded border hidden lg:inline-block ${
                    item.badge === "PRO" 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Side Controls: Telemetry, Settings (Providers + MCP), History, Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-2">
        {/* Engine Status Dot */}
        <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-muted-foreground px-2.5 py-1 rounded-md bg-muted/40 border border-border">
          <span className="inline-block h-2 w-2 rounded-full bg-[#FF4D00] animate-pulse" />
          <span>Groq LPUs Aktif</span>
        </div>

        {/* Unified Settings Button (Opens Providers & MCP Hub) */}
        <Button
          variant="outline"
          size="sm"
          data-testid="open-providers-settings-button"
          onClick={() => onOpenSettings?.("providers")}
          className="h-8 text-xs gap-1.5 cursor-pointer border-border hover:bg-muted/80 px-2.5 sm:px-3 font-mono rounded-lg"
          title="Pengaturan Workspace: AI Providers, API Keys & MCP Connectors Hub"
        >
          <Sliders className="h-3.5 w-3.5 text-[#FF4D00]" />
          <span>Settings</span>
        </Button>

        {/* Quick Hidden/Accessible MCP Connectors Trigger for E2E Contract Compatibility */}
        <button
          type="button"
          data-testid="mcp-connectors-tab"
          onClick={() => onOpenSettings?.("connectors")}
          className="sr-only"
          aria-label="Model Context Protocol (MCP) Connectors Hub"
          title="Model Context Protocol (MCP) Connectors Hub"
        >
          Connectors Hub
        </button>

        {/* History Toggle Button */}
        {onOpenHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHistory}
            className="h-8 text-xs gap-1 cursor-pointer border-border hover:bg-muted/80 px-2 sm:px-3 font-mono rounded-lg"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Riwayat</span>
            <span className="font-mono text-[11px] bg-secondary text-secondary-foreground rounded-full px-1.5 py-0.2 ml-0.5">
              {historyCount}
            </span>
          </Button>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
