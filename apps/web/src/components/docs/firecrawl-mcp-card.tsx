"use client"

import React, { useState } from "react"
import { SyntaxCodeCard } from "@/components/docs/syntax-code-card"

interface FirecrawlMcpCardProps {
  lang: "id" | "en"
}

export function FirecrawlMcpCard({ lang }: FirecrawlMcpCardProps) {
  const [activeTab, setActiveTab] = useState<"cursor" | "claude" | "codex" | "terminal">("cursor")

  const tabs = [
    {
      id: "cursor",
      title: "Cursor",
      subtitle: lang === "en" ? "One-click config" : "Satu klik konfigurasi",
    },
    {
      id: "claude",
      title: "Claude & Claude Code",
      subtitle: lang === "en" ? "Install MCP plugin" : "Pasang plugin MCP",
    },
    {
      id: "codex",
      title: "ChatGPT & Codex",
      subtitle: lang === "en" ? "Direct connection" : "Koneksi langsung",
    },
    {
      id: "terminal",
      title: "Terminal CLI",
      subtitle: lang === "en" ? "Global npm install" : "Instalasi global",
    },
  ]

  const cursorJson = JSON.stringify(
    {
      mcpServers: {
        piew: {
          command: "npx",
          args: ["-y", "@piew/agent", "mcp"],
        },
      },
    },
    null,
    2
  )

  const claudeJson = JSON.stringify(
    {
      mcpServers: {
        piew: {
          command: "npx",
          args: ["-y", "@piew/agent", "mcp"],
        },
      },
    },
    null,
    2
  )

  const codexCommand = `codex mcp add piew --url https://mcp.piew.dev/v1/sse`
  const terminalPrompt =
    lang === "en"
      ? 'piew "Design an e-commerce checkout system with Stripe webhook"'
      : 'piew "Rancang sistem checkout e-commerce dengan webhook Stripe"'
  const terminalCommand = `npm install -g @piew/agent

${terminalPrompt}`

  return (
    <div className="rounded-2xl border border-white/10 bg-[#08090d] overflow-hidden shadow-2xl my-4">
      {/* 4 Tabs Segmented Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-white/[0.08] bg-[#0d0e14]">
        {tabs.map((t) => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`p-3.5 sm:p-4 text-left transition-all border-b-2 cursor-pointer flex flex-col gap-0.5 ${
                isActive
                  ? "bg-white/[0.04] border-sky-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
              }`}
            >
              <span className="text-xs font-semibold">{t.title}</span>
              <span className="text-[11px] text-zinc-500">{t.subtitle}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panel Content using SyntaxCodeCard with lang support */}
      <div className="p-4 sm:p-5">
        {activeTab === "cursor" && (
          <div>
            <p className="text-xs sm:text-sm text-zinc-300 mb-2">
              {lang === "en"
                ? "Add the following to `.cursor/mcp.json` in your project root:"
                : "Tambahkan konfigurasi berikut ke file `.cursor/mcp.json` di proyek Cursor Anda:"}
            </p>

            <SyntaxCodeCard filename=".cursor/mcp.json" copyContent={cursorJson} lang={lang}>
              <span className="text-[#64748b]">
                {lang === "en" ? "// MCP configuration for Cursor" : "// Konfigurasi MCP untuk Cursor"}
              </span>
              {"\n"}
              &#123;
              {"\n"}  <span className="text-[#38bdf8]">&quot;mcpServers&quot;</span>: &#123;
              {"\n"}    <span className="text-[#38bdf8]">&quot;piew&quot;</span>: &#123;
              {"\n"}      <span className="text-[#f1f5f9]">&quot;command&quot;</span>: <span className="text-[#fde047]">&quot;npx&quot;</span>,
              {"\n"}      <span className="text-[#f1f5f9]">&quot;args&quot;</span>: [<span className="text-[#fde047]">&quot;-y&quot;</span>, <span className="text-[#fde047]">&quot;@piew/agent&quot;</span>, <span className="text-[#fde047]">&quot;mcp&quot;</span>]
              {"\n"}    &#125;
              {"\n"}  &#125;
              {"\n"}&#125;
            </SyntaxCodeCard>
          </div>
        )}

        {activeTab === "claude" && (
          <div>
            <p className="text-xs sm:text-sm text-zinc-300 mb-2">
              {lang === "en"
                ? "Add to `claude_desktop_config.json` for Claude Desktop:"
                : "Tambahkan ke `claude_desktop_config.json` untuk Claude Desktop:"}
            </p>

            <SyntaxCodeCard filename="claude_desktop_config.json" copyContent={claudeJson} lang={lang}>
              <span className="text-[#64748b]">
                {lang === "en" ? "// MCP configuration for Claude Desktop" : "// Konfigurasi MCP untuk Claude Desktop"}
              </span>
              {"\n"}
              &#123;
              {"\n"}  <span className="text-[#38bdf8]">&quot;mcpServers&quot;</span>: &#123;
              {"\n"}    <span className="text-[#38bdf8]">&quot;piew&quot;</span>: &#123;
              {"\n"}      <span className="text-[#f1f5f9]">&quot;command&quot;</span>: <span className="text-[#fde047]">&quot;npx&quot;</span>,
              {"\n"}      <span className="text-[#f1f5f9]">&quot;args&quot;</span>: [<span className="text-[#fde047]">&quot;-y&quot;</span>, <span className="text-[#fde047]">&quot;@piew/agent&quot;</span>, <span className="text-[#fde047]">&quot;mcp&quot;</span>]
              {"\n"}    &#125;
              {"\n"}  &#125;
              {"\n"}&#125;
            </SyntaxCodeCard>
          </div>
        )}

        {activeTab === "codex" && (
          <div>
            <p className="text-xs sm:text-sm text-zinc-300 mb-2">
              {lang === "en"
                ? "Connect via Server-Sent Events (SSE) remote transport to Codex / ChatGPT:"
                : "Hubungkan melalui transport Server-Sent Events (SSE) langsung ke Codex atau ChatGPT:"}
            </p>

            <SyntaxCodeCard filename="codex_mcp_connect.sh" copyContent={codexCommand} lang={lang}>
              <span className="text-[#22c55e]">
                {lang === "en" ? "# Register MCP endpoint with Codex" : "# Daftarkan endpoint MCP ke sesi Codex"}
              </span>
              {"\n"}
              <span className="text-[#38bdf8]">codex</span> <span className="text-[#f1f5f9]">mcp</span> <span className="text-[#38bdf8]">add</span> <span className="text-[#fde047]">piew</span> <span className="text-[#fb923c]">--url</span> <span className="text-[#fde047]">https://mcp.piew.dev/v1/sse</span>
            </SyntaxCodeCard>
          </div>
        )}

        {activeTab === "terminal" && (
          <div>
            <p className="text-xs sm:text-sm text-zinc-300 mb-2">
              {lang === "en"
                ? "Install the canonical PIEW CLI globally across your operating system:"
                : "Pasang CLI PIEW secara global agar perintah `piew` selalu dapat dipanggil di folder mana pun:"}
            </p>

            <SyntaxCodeCard filename="piew_cli_install.sh" copyContent={terminalCommand} lang={lang}>
              <span className="text-[#22c55e]">
                {lang === "en" ? "# Install package globally via NPM" : "# Pasang paket secara global via NPM"}
              </span>
              {"\n"}
              <span className="text-[#f43f5e]">npm</span> <span className="text-[#38bdf8]">install</span> <span className="text-[#fb923c]">-g</span> <span className="text-[#f1f5f9]">@piew/agent</span>
              {"\n\n"}
              <span className="text-[#22c55e]">
                {lang === "en" ? "# Run prompt from any project folder" : "# Eksekusi prompt langsung di terminal"}
              </span>
              {"\n"}
              <span className="text-[#f43f5e]">piew</span>{" "}
              <span className="text-[#fde047]">
                &quot;{lang === "en" ? "Design an e-commerce checkout system with Stripe webhook" : "Rancang sistem checkout e-commerce dengan webhook Stripe"}&quot;
              </span>
            </SyntaxCodeCard>
          </div>
        )}
      </div>
    </div>
  )
}
