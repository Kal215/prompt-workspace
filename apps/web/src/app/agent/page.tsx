"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconTerminal2, IconSparkles } from "@tabler/icons-react";
import { useLanguage } from "@/hooks/use-language";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

export default function AgentPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-[#07080b] text-white flex overflow-hidden font-sans selection:bg-lime-400 selection:text-black">
      {/* Workspace Sidebar from D:\navbar */}
      <WorkspaceSidebar activeMode="Agent" />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-2xl w-full rounded-3xl bg-[#090a0d] border border-white/10 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
            {/* Subtle aurora glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-lime-300/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-48 rounded-full bg-cyan-400/8 blur-3xl" />

            <div className="w-12 h-12 rounded-2xl bg-lime-300/10 border border-lime-300/20 flex items-center justify-center text-lime-300 mx-auto mb-6 shadow-inner">
              <IconTerminal2 className="w-6 h-6" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-lime-300/10 text-lime-300 border border-lime-300/20 text-xs font-mono font-semibold mb-4">
              AGENT
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              {lang === "en" ? "PIEW Agent" : "PIEW Agent"}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed mb-8">
              {lang === "en"
                ? "Autonomous multi-agent orchestration, interactive CLI execution loop, and native Model Context Protocol (MCP) integrations."
                : "Orkestrasi multi-agent otonom, eksekusi interaktif loop CLI di terminal, dan integrasi protokol resmi Model Context Protocol (MCP)."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/classic"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-lime-300 text-stone-950 font-semibold text-sm hover:bg-lime-400 transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <IconSparkles className="w-4 h-4" />
                <span>{lang === "en" ? "Open Classic Studio" : "Buka Studio Classic"}</span>
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-medium transition-all cursor-pointer"
              >
                {lang === "en" ? "Back to Landing" : "Kembali ke Beranda"}
              </Link>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-white/[0.06] py-5 text-center text-xs text-zinc-600 font-mono">
          PIEW Agent Studio • MCP v1.0 • Autonomous Synthesis Platform
        </footer>
      </div>
    </div>
  );
}
