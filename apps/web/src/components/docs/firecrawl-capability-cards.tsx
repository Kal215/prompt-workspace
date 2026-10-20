"use client"

import React from "react"
import { IconArrowRight } from "@tabler/icons-react"

interface CapabilityCardsProps {
  lang: "id" | "en"
}

export function FirecrawlCapabilityCards({ lang }: CapabilityCardsProps) {
  const capabilities = [
    {
      title: lang === "en" ? "Prompt Calibration" : "Kalibrasi Prompt",
      desc:
        lang === "en"
          ? "Transforms freeform requirements into verifiable, deterministic full-stack web architectures."
          : "Mengubah instruksi bebas menjadi cetak biru arsitektur web yang presisi dan terverifikasi secara matematis.",
      link: "#interactive-sdk",
    },
    {
      title: lang === "en" ? "Instant NPX Execution" : "Eksekusi NPX Instan",
      desc:
        lang === "en"
          ? "Execute prompts directly in any folder without polluting global npm packages: `npx @piew/agent`."
          : "Jalankan sintesis kode di direktori mana pun tanpa mengotori sistem: `npx @piew/agent`.",
      link: "#setup-mcp",
    },
    {
      title: lang === "en" ? "Global CLI Daemon" : "Daemon CLI Global",
      desc:
        lang === "en"
          ? "Persistent background watcher syncing local project files with real-time browser preview sessions."
          : "Daemon background yang menyinkronkan file proyek lokal dengan sesi pratinjau browser secara langsung.",
      link: "#setup-mcp",
    },
    {
      title: lang === "en" ? "Prisma Database ORM" : "Database Relasional Prisma",
      desc:
        lang === "en"
          ? "Automatically infers schemas and relations for SQLite locally and PostgreSQL in production."
          : "Otomatis menyusun skema dan relasi data untuk SQLite lokal maupun PostgreSQL di server produksi.",
      link: "#interactive-sdk",
    },
    {
      title: lang === "en" ? "Model Context Protocol" : "Server MCP Terbuka",
      desc:
        lang === "en"
          ? "Standard MCP endpoint providing intelligent prompt audit tools directly into your AI editor."
          : "Endpoint MCP standar yang menghubungkan keahlian PIEW langsung ke panel percakapan Cursor & Claude.",
      link: "#setup-mcp",
    },
    {
      title: lang === "en" ? "Zero Secret Leakage" : "Karantina Kredensial 100%",
      desc:
        lang === "en"
          ? "100% client proprietary code ownership. All secrets and API tokens stay safely on your local host."
          : "Hak milik kode 100% milik Anda. Kunci API dan kredensial aman terkarantina di komputer pribadi.",
      link: "#why-piew",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
      {capabilities.map((c, idx) => (
        <a
          key={idx}
          href={c.link}
          className="group rounded-2xl bg-[#090a0f] hover:bg-[#0e1017] border border-white/8 hover:border-white/20 p-5 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center justify-between mb-2">
              <span>{c.title}</span>
              <IconArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
          </div>
        </a>
      ))}
    </div>
  )
}
