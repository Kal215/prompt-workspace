"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar"
import { PiewLaunchModal } from "@/components/piew-launch-modal"
import { PiewFooter } from "@/components/piew-footer"
import { FirecrawlMcpCard } from "@/components/docs/firecrawl-mcp-card"
import { FirecrawlCodeTabs } from "@/components/docs/firecrawl-code-tabs"
import { FirecrawlCapabilityCards } from "@/components/docs/firecrawl-capability-cards"
import { SyntaxCodeCard } from "@/components/docs/syntax-code-card"
import { PiewFaq } from "@/components/piew-faq"
import { useLanguage } from "@/hooks/use-language"
import {
  IconSearch,
  IconCopy,
  IconCheck,
  IconSparkles,
  IconBrandGithub,
  IconChecklist,
  IconArrowRight,
  IconChevronRight,
  IconListCheck,
  IconPlayerPlay,
} from "@tabler/icons-react"

export default function DocsPage() {
  const { lang, setLang } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)
  const [copiedPage, setCopiedPage] = useState(false)
  const [activeSection, setActiveSection] = useState("get-started")

  const navItems = [
    { name: "Playground", link: "/playground" },
    { name: "Classic", link: "/classic" },
    { name: "Pro", link: "/pro" },
    { name: "Agent", link: "/agent" },
  ]

  const tocLinks = [
    { id: "get-started", label: lang === "en" ? "Get started" : "Memulai Cepat" },
    { id: "setup-mcp", label: lang === "en" ? "Set up PIEW MCP" : "Konfigurasi MCP" },
    { id: "other-ways", label: lang === "en" ? "Other ways to start" : "Cara lainnya" },
    { id: "capabilities", label: lang === "en" ? "What can PIEW do?" : "Kapabilitas PIEW" },
    { id: "interactive-sdk", label: lang === "en" ? "SDKs & API execution" : "SDK & Eksekusi Sintesis" },
    { id: "why-piew", label: lang === "en" ? "Why PIEW?" : "Kenapa PIEW?" },
    { id: "faq", label: lang === "en" ? "FAQ" : "Pertanyaan Umum (FAQ)" },
  ]

  // Track active section for right TOC
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200
      for (let i = tocLinks.length - 1; i >= 0; i--) {
        const el = document.getElementById(tocLinks[i].id)
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(tocLinks[i].id)
          break
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [tocLinks])

  const handleCopyPageUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedPage(true)
      setTimeout(() => setCopiedPage(false), 2000)
    } catch {
      // fallback
    }
  }

  const npxCommand =
    lang === "en"
      ? 'npx @piew/agent "Build an inventory management dashboard with low-stock alerts"'
      : 'npx @piew/agent "Buatkan dashboard analitik inventaris gudang dengan notifikasi stok menipis"'

  return (
    <main className="relative min-h-screen bg-[#000000] text-zinc-100 overflow-x-clip selection:bg-sky-500 selection:text-black">
      {/* Top viewport subtle fade behind floating navbar */}
      <div className="fixed top-0 inset-x-0 h-24 bg-gradient-to-b from-black via-black/90 to-transparent pointer-events-none z-40" />

      {/* Floating Resizable Navbar (Persis Landing Page) */}
      <Navbar>
        <NavBody>
          <NavbarLogo href="/" />
          <NavItems items={navItems} />

          {/* Right Action & Language Switch */}
          <div className="relative z-30 flex items-center gap-3 pointer-events-auto">
            {/* Language Switch */}
            <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setLang("id")}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 transition-colors ${
                  lang === "id"
                    ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 transition-colors ${
                  lang === "en"
                    ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            <NavbarButton
              variant="primary"
              as="button"
              onClick={() => setIsLaunchModalOpen(true)}
            >
              {lang === "en" ? "Launch" : "Mulai"}
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo href="/" />
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setLang("id")}
                  className={`cursor-pointer rounded-full px-2 py-0.5 ${
                    lang === "id"
                      ? "bg-sky-500/20 text-sky-300 font-semibold"
                      : "text-zinc-400"
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`cursor-pointer rounded-full px-2 py-0.5 ${
                    lang === "en"
                      ? "bg-sky-500/20 text-sky-300 font-semibold"
                      : "text-zinc-400"
                  }`}
                >
                  EN
                </button>
              </div>

              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-docs-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm text-zinc-300 hover:text-white py-1"
              >
                {item.name}
              </a>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <NavbarButton
                as="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsLaunchModalOpen(true)
                }}
                variant="primary"
                className="w-full text-center"
              >
                {lang === "en" ? "Launch Studio" : "Mulai Studio"}
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* 3-Column Firecrawl Docs Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= COLUMN 1: LEFT SIDEBAR ================= */}
          <aside className="lg:col-span-3 sticky top-28 self-start hidden lg:block space-y-6 pr-2 text-xs font-sans">
            {/* Search Input Box */}
            <div className="relative">
              <IconSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                readOnly
                placeholder={lang === "en" ? "Search docs (Ctrl+K)..." : "Cari dokumentasi (Ctrl+K)..."}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-400 focus:outline-none cursor-pointer hover:border-white/20 transition-all"
              />
            </div>

            {/* Quick Links */}
            <div className="space-y-1 pb-3 border-b border-white/[0.08]">
              <a
                href="/playground"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <IconPlayerPlay className="w-3.5 h-3.5 text-sky-400" />
                <span>Playground</span>
              </a>
              <a
                href="https://github.com/Kal215/prompt-workspace"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <IconBrandGithub className="w-3.5 h-3.5 text-zinc-300" />
                <span>GitHub Repository</span>
              </a>
              <a
                href="#why-piew"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <IconChecklist className="w-3.5 h-3.5 text-emerald-400" />
                <span>Changelog</span>
              </a>
            </div>

            {/* Group: GET STARTED */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block px-3">
                {lang === "en" ? "GET STARTED" : "MULAI CEPAT"}
              </span>
              <nav className="space-y-0.5">
                <a
                  href="#get-started"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white font-medium border-l-2 border-sky-400 shadow-sm"
                >
                  <span>{lang === "en" ? "Introduction" : "Pengenalan"}</span>
                </a>
                <a
                  href="#setup-mcp"
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  <span>{lang === "en" ? "MCP Setup" : "Pengaturan MCP"}</span>
                </a>
                <a
                  href="#other-ways"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  <span>{lang === "en" ? "Installation Methods" : "Metode Instalasi"}</span>
                </a>
              </nav>
            </div>

            {/* Group: INTEGRATIONS (MCP) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block px-3">
                {lang === "en" ? "INTEGRATIONS" : "INTEGRASI AGENT"}
              </span>
              <nav className="space-y-0.5">
                <a
                  href="#setup-mcp"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  Cursor IDE
                </a>
                <a
                  href="#setup-mcp"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  Claude & Claude Code
                </a>
                <a
                  href="#setup-mcp"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  ChatGPT & Codex
                </a>
              </nav>
            </div>

            {/* Group: CORE ENGINE */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block px-3">
                {lang === "en" ? "CORE ENGINE" : "ARSITEKTUR INTI"}
              </span>
              <nav className="space-y-0.5">
                <a
                  href="#capabilities"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  {lang === "en" ? "Prompt Calibration" : "Kalibrasi Prompt"}
                </a>
                <a
                  href="#capabilities"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  {lang === "en" ? "Prisma Database ORM" : "Database Prisma ORM"}
                </a>
                <a
                  href="#why-piew"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  {lang === "en" ? "Security & Ownership" : "Keamanan & Hak Milik"}
                </a>
                <a
                  href="#faq"
                  className="block px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  {lang === "en" ? "FAQ" : "Pertanyaan Umum (FAQ)"}
                </a>
              </nav>
            </div>
          </aside>

          {/* ================= COLUMN 2: CENTER MAIN CONTENT ================= */}
          <article className="lg:col-span-6 space-y-12">
            {/* Top Breadcrumb & Page Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-sans text-zinc-500 mb-2">
                <span>{lang === "en" ? "Get Started" : "Panduan Awal"}</span>
                <IconChevronRight className="w-3 h-3 text-zinc-600" />
                <span className="text-zinc-300">{lang === "en" ? "Introduction" : "Pengenalan"}</span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  {lang === "en" ? "Introduction" : "Pengenalan"}
                </h1>

                <button
                  type="button"
                  onClick={handleCopyPageUrl}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-sans text-zinc-300 transition-all cursor-pointer"
                >
                  {copiedPage ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{lang === "en" ? "Copied" : "Tersalin"}</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-3.5 h-3.5" />
                      <span>{lang === "en" ? "Copy link" : "Salin link"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Lead-in Paragraphs */}
              <p className="mt-4 text-base sm:text-lg font-medium text-zinc-200 leading-snug">
                {lang === "en"
                  ? "The prompt intelligence & engineering workspace for AI agents. Transform raw natural language into verifiable full-stack architecture, schemas, and production code."
                  : "Ruang kerja rekayasa instruksi dan orkestrasi kode untuk agen AI. Mengubah ide mentah menjadi cetak biru arsitektur full-stack, skema database, dan kode siap produksi."}
              </p>

              <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed">
                {lang === "en"
                  ? "PIEW calibrates user intent, validates database relations ahead of code generation, and connects seamlessly to AI IDEs through the Model Context Protocol (MCP)."
                  : "PIEW mengalibrasi maksud kebutuhan pengguna, memverifikasi keterkaitan basis data sebelum kode pertama ditulis, dan terhubung mulus ke AI IDE melalui Model Context Protocol (MCP)."}
              </p>
            </div>

            {/* Section 1: Get Started */}
            <section id="get-started" className="scroll-mt-32 space-y-4">
              <div className="border-b border-white/[0.08] pb-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {lang === "en" ? "Get started" : "Memulai Cepat"}
                </h2>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                {lang === "en"
                  ? "Connect PIEW to your current coding agent or IDE in seconds. Choose your target environment below:"
                  : "Hubungkan PIEW ke coding agent atau IDE Anda dalam hitungan detik. Pilih lingkungan target di bawah:"}
              </p>

              {/* The 4-Tab MCP Setup Card using the attractive SyntaxCodeCard terminal */}
              <div id="setup-mcp" className="scroll-mt-32">
                <FirecrawlMcpCard lang={lang} />
              </div>
            </section>

            {/* Section 2: Other Ways to Get Started */}
            <section id="other-ways" className="scroll-mt-32 space-y-6">
              <div className="border-b border-white/[0.08] pb-3">
                <h3 className="text-lg font-bold tracking-tight text-white">
                  {lang === "en" ? "Other ways to get started" : "Cara lainnya untuk memulai"}
                </h3>
              </div>

              {/* 1. Instant NPX */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white">
                  {lang === "en" ? "Instant Execution (NPX)" : "Eksekusi Instan (NPX)"}
                </h4>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {lang === "en"
                    ? "Test and synthesize prompts on demand without polluting global package namespaces:"
                    : "Uji coba langsung dari terminal tanpa perlu memasang paket permanen di sistem:"}
                </p>

                <SyntaxCodeCard
                  filename="terminal_execution.sh"
                  copyContent={npxCommand}
                  lang={lang}
                >
                  <span className="text-[#22c55e]">
                    {lang === "en"
                      ? "# Execute directly from terminal without installation"
                      : "# Jalankan langsung dari terminal tanpa instalasi"}
                  </span>
                  {"\n"}
                  <span className="text-[#f43f5e]">npx</span>{" "}
                  <span className="text-[#38bdf8]">@piew/agent</span>{" "}
                  <span className="text-[#fde047]">
                    &quot;{lang === "en" ? "Build an inventory management dashboard with low-stock alerts" : "Buatkan dashboard analitik inventaris gudang dengan notifikasi stok menipis"}&quot;
                  </span>
                  {"\n\n"}
                  <span className="text-[#22c55e]">
                    {lang === "en"
                      ? "# Result: verified intent, Next.js routes, and database schema"
                      : "# Hasil: verifikasi intent, rute Next.js, dan skema basis data"}
                  </span>
                  {"\n"}
                  <span className="text-[#64748b]">[OK]</span>{" "}
                  <span className="text-[#22c55e]">
                    {lang === "en" ? "Project synthesized successfully" : "Proyek berhasil disiapkan"}
                  </span>{" "}
                  |{" "}
                  <span className="text-[#38bdf8]">
                    {lang === "en" ? "4 routes detected" : "4 rute terdeteksi"}
                  </span>{" "}
                  |{" "}
                  <span className="text-[#fb923c]">Database: SQLite</span>
                </SyntaxCodeCard>
              </div>

              {/* 2. Automated Scripts */}
              <div className="space-y-2 pt-2">
                <h4 className="text-sm font-semibold text-white">
                  {lang === "en" ? "Automated Installation Script" : "Skrip Otomatisasi Instalasi"}
                </h4>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {lang === "en"
                    ? "Verifies dependencies, provisions local database schemas, and sets up PATH automatically:"
                    : "Memeriksa dependensi sistem, menyiapkan skema SQLite lokal, dan mendaftarkan PATH:"}
                </p>

                <SyntaxCodeCard
                  filename="install_powershell.ps1"
                  copyContent={`irm https://get.piew.dev/install.ps1 | iex`}
                  lang={lang}
                >
                  <span className="text-[#22c55e]"># Windows (PowerShell)</span>
                  {"\n"}
                  <span className="text-[#38bdf8]">irm</span>{" "}
                  <span className="text-[#fde047]">https://get.piew.dev/install.ps1</span>{" "}
                  <span className="text-[#f43f5e]">|</span>{" "}
                  <span className="text-[#38bdf8]">iex</span>
                </SyntaxCodeCard>

                <SyntaxCodeCard
                  filename="install_bash.sh"
                  copyContent={`curl -fsSL https://get.piew.dev/install.sh | bash`}
                  lang={lang}
                >
                  <span className="text-[#22c55e]"># macOS & Linux (Terminal)</span>
                  {"\n"}
                  <span className="text-[#38bdf8]">curl</span>{" "}
                  <span className="text-[#fb923c]">-fsSL</span>{" "}
                  <span className="text-[#fde047]">https://get.piew.dev/install.sh</span>{" "}
                  <span className="text-[#f43f5e]">|</span>{" "}
                  <span className="text-[#38bdf8]">bash</span>
                </SyntaxCodeCard>
              </div>
            </section>

            {/* Section 3: What Can PIEW Do? */}
            <section id="capabilities" className="scroll-mt-32 space-y-4">
              <div className="border-b border-white/[0.08] pb-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {lang === "en" ? "What can PIEW do?" : "Kapabilitas PIEW"}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  {lang === "en"
                    ? "Core primitives designed to bridge natural language requirements and enterprise-grade software."
                    : "Prinsip arsitektur inti yang menjembatani instruksi manusia ke aplikasi web standar industri."}
                </p>
              </div>

              <FirecrawlCapabilityCards lang={lang} />
            </section>

            {/* Section 4: Multi-Language SDKs & Execution */}
            <section id="interactive-sdk" className="scroll-mt-32 space-y-4">
              <div className="border-b border-white/[0.08] pb-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {lang === "en" ? "SDKs & API Execution" : "SDK & Eksekusi Sintesis"}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  {lang === "en"
                    ? "Integrate PIEW into your CI/CD pipelines, build scripts, or backend services."
                    : "Integrasikan PIEW ke dalam alur pipeline CI/CD, skrip build, atau layanan backend Anda."}
                </p>
              </div>

              <FirecrawlCodeTabs lang={lang} />
            </section>

            {/* Section 5: Why PIEW? */}
            <section id="why-piew" className="scroll-mt-32 space-y-4">
              <div className="border-b border-white/[0.08] pb-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {lang === "en" ? "Why PIEW?" : "Kenapa Memilih PIEW?"}
                </h2>
              </div>

              <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  <div>
                    <strong className="text-white font-semibold">
                      {lang === "en" ? "Production-Ready Architecture:" : "Arsitektur Siap Produksi:"}
                    </strong>{" "}
                    {lang === "en"
                      ? "Clean Next.js 16 modular components, Tailwind CSS styling, and strictly typed TypeScript contracts."
                      : "Komponen modular Next.js 16 yang bersih, styling Tailwind CSS, dan kontrak data TypeScript bertipe ketat."}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white font-semibold">
                      {lang === "en" ? "Resolves Complexity:" : "Mengatasi Kerumitan:"}
                    </strong>{" "}
                    {lang === "en"
                      ? "Eliminates hallucinations in database schemas, auto-resolves package dependency conflicts, and enforces valid routing hierarchies."
                      : "Mencegah halusinasi skema database, menyelesaikan konflik dependensi paket secara otomatis, dan memastikan rute halaman valid."}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <div>
                    <strong className="text-white font-semibold">
                      {lang === "en" ? "100% Code Ownership:" : "Hak Milik Kode 100%:"}
                    </strong>{" "}
                    {lang === "en"
                      ? "Zero vendor lock-in. No obfuscated runtime wrappers. Export as standard git repositories or .zip and deploy to Vercel, Netlify, or any self-hosted VPS."
                      : "Bebas keterikatan vendor. Tanpa kode pembungkus tertutup. Ekspor ke repositori Git standar dan deploy ke Vercel, Netlify, atau VPS mandiri."}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <div>
                    <strong className="text-white font-semibold">
                      {lang === "en" ? "Local Credential Quarantine:" : "Karantina Kredensial Lokal:"}
                    </strong>{" "}
                    {lang === "en"
                      ? "All secrets, database credentials, and API keys are quarantined locally. Nothing is ever sent to third-party telemetry servers."
                      : "Semua token rahasia, kredensial basis data, dan kunci API dikarantina di mesin lokal Anda tanpa kebocoran ke server luar."}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Frequently Asked Questions (FAQ) */}
            <PiewFaq lang={lang} isDocsEmbed />
          </article>

          {/* ================= COLUMN 3: RIGHT SIDEBAR ================= */}
          <aside className="lg:col-span-3 sticky top-28 self-start hidden lg:block space-y-8 pl-2">
            {/* Table of Contents */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                <IconListCheck className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "On this page" : "Di halaman ini"}</span>
              </div>

              <nav className="space-y-1 text-xs">
                {tocLinks.map((link) => {
                  const isActive = activeSection === link.id
                  return (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      className={`block py-1 px-2.5 rounded-md transition-all ${
                        isActive
                          ? "text-white font-semibold bg-white/10 border-l-2 border-sky-400"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      {link.label}
                    </a>
                  )
                })}
              </nav>
            </div>

            {/* Sticky Conversion / CTA Card ala Firecrawl ('Ready to build?') */}
            <div className="rounded-2xl border border-white/10 bg-[#0c0d12] p-5 space-y-3.5 shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <IconSparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-sm">PIEW Studio</span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">
                  {lang === "en" ? "Ready to build?" : "Siap mewujudkan ide?"}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {lang === "en"
                    ? "Start transforming raw prompts into production web apps for free."
                    : "Mulai ubah prompt kasar menjadi aplikasi web siap produksi secara gratis."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsLaunchModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{lang === "en" ? "Start for free" : "Mulai sekarang"}</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>

              <a
                href="https://github.com/Kal215/prompt-workspace"
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-medium text-xs transition-all text-center block"
              >
                {lang === "en" ? "See our GitHub →" : "Lihat di GitHub →"}
              </a>
            </div>
          </aside>

        </div>
      </div>

      {/* Footer (Persis Landing Page) */}
      <PiewFooter lang={lang} />

      {/* Launch Modal (Persis Landing Page) */}
      <PiewLaunchModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        lang={lang}
      />
    </main>
  )
}
