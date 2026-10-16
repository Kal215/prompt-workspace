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
  activeWorkspaceMode?: "classic" | "mission-control";
  onWorkspaceModeChange?: (mode: "classic" | "mission-control") => void;
}

export function AppHeader({
  historyCount = 0,
  onOpenHistory,
  onOpenSettings,
  activeWorkspaceMode = "classic",
  onWorkspaceModeChange,
}: AppHeaderProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const handleModeSwitch = (mode: "classic" | "mission-control") => {
    if (onWorkspaceModeChange) {
      onWorkspaceModeChange(mode);
    }
    const workbenchEl = document.getElementById("workbench") || document.getElementById("studio");
    if (workbenchEl) {
      workbenchEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { href: "#overview", label: "Overview" },
    { href: "#architecture", label: "Architecture" },
    { href: "#spider-security", label: "Spider Security" },
    { href: "#guides", label: "Guides" },
  ];

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-background/85 backdrop-blur-md border-b border-border px-3 sm:px-6 flex items-center justify-between overflow-x-auto sm:overflow-x-visible no-scrollbar">
      {/* Kiri: Brand Identity & Product Name */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <TerminalSquare className="h-4 w-4 text-sky-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-base tracking-tight text-foreground whitespace-nowrap">
              Prompt Intelligence Workspace
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono border border-sky-500/30 px-1.5 py-0.5 rounded bg-sky-500/5 hidden sm:inline-block font-medium">
              PIEW v3.1
            </span>
          </div>
        </Link>

        <span className="text-border hidden md:inline">/</span>

        {/* Tengah: Mode Pills (Classic Studio vs Mission Control) & Quick Links */}
        {isHomePage ? (
          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Pills Switcher */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/70 border border-border">
              <button
                type="button"
                data-testid="tab-classic-studio"
                onClick={() => handleModeSwitch("classic")}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeWorkspaceMode === "classic"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                {activeWorkspaceMode === "classic" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                )}
                <Zap className={`w-3.5 h-3.5 ${activeWorkspaceMode === "classic" ? "text-sky-500" : "text-muted-foreground"}`} />
                <span>Classic Studio</span>
              </button>

              <button
                type="button"
                data-testid="tab-mission-control"
                onClick={() => handleModeSwitch("mission-control")}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeWorkspaceMode === "mission-control"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                {activeWorkspaceMode === "mission-control" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                <Bot className={`w-3.5 h-3.5 ${activeWorkspaceMode === "mission-control" ? "text-emerald-500" : "text-muted-foreground"}`} />
                <span>Mission Control</span>
              </button>
            </div>

            {/* Quick Section Anchor Links */}
            <nav className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-muted-foreground ml-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="hover:text-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        ) : (
          /* Multi-Tier Navigation Segmented Switcher on Inner Pages */
          <nav className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-muted/70 border border-border shrink-0">
            <Link
              href="/"
              data-testid="tab-classic-studio"
              className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                pathname === "/"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-sky-500" />
              <span>Classic</span>
            </Link>
            <Link
              href="/pro"
              data-testid="tab-pro-architect"
              className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                pathname === "/pro"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {pathname === "/pro" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              <span>Pro</span>
            </Link>
            <Link
              href="/agent"
              data-testid="tab-agent-supervision"
              className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                pathname === "/agent"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {pathname === "/agent" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
              <Bot className="w-3.5 h-3.5 text-emerald-500" />
              <span>Agent</span>
            </Link>
            <Link
              href="/docs"
              data-testid="tab-docs-specs"
              className={`flex items-center gap-1 sm:gap-1.5 py-1 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                pathname === "/docs"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {pathname === "/docs" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>Docs</span>
            </Link>
          </nav>
        )}
      </div>

      {/* Kanan: Engine Status, Settings/Providers, Riwayat, Theme Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-2">
        {/* Status Engine (Groq LPUs Aktif dengan dot hijau berkedip) */}
        <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-muted-foreground px-2.5 py-1 rounded-md bg-muted/40 border border-border">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 dark:text-slate-300">Groq LPUs Aktif</span>
        </div>

        {/* Tombol Providers / Settings (data-testid="open-providers-settings-button") */}
        <Button
          variant="outline"
          size="sm"
          data-testid="open-providers-settings-button"
          onClick={() => onOpenSettings?.("providers")}
          className="h-8 text-xs gap-1.5 cursor-pointer border-border hover:bg-muted/80 px-2.5 sm:px-3 font-mono rounded-lg"
          title="Pengaturan AI Providers & Connectors"
        >
          <Sliders className="h-3.5 w-3.5 text-sky-500" />
          <span>Providers</span>
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

        {/* Tombol Riwayat (Membuka HistorySidebar) */}
        {onOpenHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHistory}
            className="h-8 text-xs gap-1 cursor-pointer border-border hover:bg-muted/80 px-2 sm:px-3 font-mono rounded-lg"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Riwayat</span>
            <span className="font-mono text-[11px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold rounded-full px-1.5 py-0.2 ml-0.5 border border-sky-500/20">
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
