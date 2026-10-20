"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface PiewFaqProps {
  lang: "id" | "en"
  isDocsEmbed?: boolean
}

interface FaqItem {
  id: number
  q: string
  a: React.ReactNode
}

export function PiewFaq({ lang, isDocsEmbed = false }: PiewFaqProps) {
  // Item 0 open by default (matching Resend UI reference)
  const [openItems, setOpenItems] = useState<number[]>([1])

  const toggleItem = (id: number) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const faqData: FaqItem[] = [
    {
      id: 1,
      q:
        lang === "en"
          ? "What exactly is PIEW?"
          : "Apa sebenarnya PIEW itu?",
      a: (
        <p>
          {lang === "en"
            ? "PIEW (Prompt Intelligence & Engineering Workspace) is a prompt engineering workspace that transforms product idea descriptions into structured technical blueprints and production-ready web application code. It acts as an intelligent bridge between your business requirements and AI models, ensuring every prompt yields a stable, modular application with sound software architecture."
            : "PIEW (Prompt Intelligence & Engineering Workspace) adalah ruang kerja rekayasa instruksi yang mengubah deskripsi ide produk menjadi cetak biru teknis terstruktur dan kode aplikasi web siap produksi. PIEW bertindak sebagai jembatan cerdas antara kebutuhan bisnis Anda dengan model kecerdasan buatan, memastikan setiap instruksi yang diterjemahkan menghasilkan aplikasi yang stabil, modular, dan memiliki arsitektur perangkat lunak yang benar."}
        </p>
      ),
    },
    {
      id: 2,
      q:
        lang === "en"
          ? "Why not just prompt ChatGPT or Claude directly? Why do I need PIEW?"
          : "Mengapa tidak langsung menulis prompt biasa ke ChatGPT atau Claude? Mengapa membutuhkan PIEW?",
      a: (
        <div className="space-y-3">
          <p>
            {lang === "en"
              ? "When prompting generic AI chatbots with short instructions, they tend to guess arbitrarily, write fragmented snippets, omit database relations, and trigger runtime errors."
              : "Ketika Anda meminta AI biasa membuat aplikasi dengan instruksi pendek, AI cenderung menebak-nebak, menghasilkan kode sepotong-sepotong, melupakan struktur database, dan sering mengalami galat saat dijalankan."}
          </p>
          <p className="text-zinc-300 font-medium">
            {lang === "en"
              ? "PIEW solves this through three core principles:"
              : "PIEW memecahkan masalah ini dengan tiga keunggulan:"}
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "Architectural Hallucination Prevention: "
                  : "Mencegah Halusinasi Arsitektur: "}
              </strong>
              {lang === "en"
                ? "Analyzes component relationships, routes, and database schemas before writing code."
                : "Menganalisis keterkaitan antar-komponen, rute halaman, dan skema data sebelum baris kode pertama ditulis."}
            </li>
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "Instruction Efficiency & Standards: "
                  : "Efisiensi dan Standarisasi Instruksi: "}
              </strong>
              {lang === "en"
                ? "Translates conversational language into high-precision technical specs without wasting context window."
                : "Mengubah bahasa percakapan sehari-hari menjadi format teknis presisi tanpa memboroskan kuota konteks."}
            </li>
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "Autonomous Quality Verification: "
                  : "Verifikasi Mutu Mandiri: "}
              </strong>
              {lang === "en"
                ? "Validates TypeScript types, package dependencies, and production readiness automatically."
                : "Memastikan kode yang dihasilkan memiliki tipe data yang benar, dependensi yang valid, dan struktur proyek yang siap dijalankan."}
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 3,
      q:
        lang === "en"
          ? "What kind of applications can I build with PIEW?"
          : "Produk atau aplikasi apa saja yang dapat dibangun menggunakan PIEW?",
      a: (
        <div className="space-y-2.5">
          <p>
            {lang === "en"
              ? "You can build diverse modern production-grade web applications, including:"
              : "Anda dapat membangun berbagai aplikasi web modern berskala produksi, antara lain:"}
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "Business Management & Dashboards: "
                  : "Aplikasi Manajemen Bisnis & Dashboard: "}
              </strong>
              {lang === "en"
                ? "Internal operations tools, analytics portals, warehouse inventory, and financial reporting systems."
                : "Sistem internal perusahaan, portal analitik, inventaris stok gudang, dan sistem pelaporan keuangan."}
            </li>
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "E-Commerce & Transaction Platforms: "
                  : "Platform E-Commerce & Transaksi: "}
              </strong>
              {lang === "en"
                ? "Online storefronts, interactive product catalogs, checkout flows, and payment webhook handlers."
                : "Toko daring, katalog produk interaktif, sistem pemesanan terintegrasi, dan alur penanganan webhook pembayaran."}
            </li>
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "Structured API & Backend Systems: "
                  : "Sistem API & Backend Terstruktur: "}
              </strong>
              {lang === "en"
                ? "Modern RESTful endpoints wired to relational databases (PostgreSQL or SQLite) via Prisma ORM."
                : "Endpoint RESTful modern yang terhubung langsung ke database relasional (PostgreSQL atau SQLite) melalui Prisma ORM."}
            </li>
            <li>
              <strong className="text-zinc-200">
                {lang === "en"
                  ? "Collaborative Productivity Tools: "
                  : "Alat Kerja Kolaboratif: "}
              </strong>
              {lang === "en"
                ? "Task management apps, team progress trackers, GitHub automation, and Docker deployments."
                : "Aplikasi pencatatan tugas, pelacak progres proyek tim, hingga integrasi repositori GitHub dan kontainer Docker."}
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 4,
      q:
        lang === "en"
          ? "Do I need coding experience to use PIEW?"
          : "Apakah saya harus mengerti pemrograman untuk menggunakan platform ini?",
      a: (
        <div className="space-y-2">
          <p>
            {lang === "en"
              ? "No. If you are a business owner, product manager, or designer, you simply describe your product goals, target audience, and workflows in plain conversational language. PIEW constructs pages, layouts, and logic for you."
              : "Tidak harus. Anda cukup menceritakan ide, tampilan, dan cara kerja aplikasi yang Anda inginkan menggunakan bahasa sehari-hari. PIEW akan menyusun halaman, tata letak, dan fungsinya untuk Anda."}
          </p>
          <p>
            {lang === "en"
              ? "For software developers, PIEW saves dozens of hours of routine work because all generated source code uses modern industry standards that you can immediately read, extend, and commit to your existing Git workflow."
              : "Bagi pengembang perangkat lunak (developer), PIEW menghemat puluhan jam kerja rutin karena seluruh kode sumber yang dihasilkan menggunakan standar industri modern yang dapat langsung Anda baca, kembangkan, dan integrasikan ke alur kerja Git yang ada."}
          </p>
        </div>
      ),
    },
    {
      id: 5,
      q:
        lang === "en"
          ? "What tech stack does PIEW generate as standard output?"
          : "Tumpukan teknologi (tech stack) apa yang menjadi standar keluaran PIEW?",
      a: (
        <div className="space-y-2">
          <p>
            {lang === "en"
              ? "PIEW produces source code based on open, modern industry standards:"
              : "PIEW menghasilkan kode sumber berbasis standar industri terbuka dan mutakhir:"}
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
            <li>
              <strong className="text-zinc-200">Frontend:</strong> Next.js (App Router), React, TypeScript, Tailwind CSS.
            </li>
            <li>
              <strong className="text-zinc-200">Backend & Logic:</strong> Route Handlers terisolasi dengan validasi skema ketat.
            </li>
            <li>
              <strong className="text-zinc-200">Database:</strong> Prisma ORM siap pakai untuk PostgreSQL, MySQL, atau SQLite lokal.
            </li>
            <li>
              <strong className="text-zinc-200">Design & Accessibility:</strong> Responsif desktop/mobile, standar aksesibilitas tinggi, dan ramah SEO.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 6,
      q:
        lang === "en"
          ? "Which AI models and providers are supported by PIEW?"
          : "Model atau penyedia AI apa saja yang dapat digunakan bersama PIEW?",
      a: (
        <div className="space-y-2">
          <p>
            {lang === "en"
              ? "PIEW is completely provider-agnostic, giving you full flexibility to choose your inference engines:"
              : "PIEW bersifat netral dan agnostik terhadap penyedia AI (Provider Agnostic):"}
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
            <li>
              <strong className="text-zinc-200">Cloud AI:</strong> Groq (LPU ultra-cepat), OpenAI, Anthropic Claude, Google Gemini, xAI (Grok), DeepSeek.
            </li>
            <li>
              <strong className="text-zinc-200">Unified Gateway:</strong> OpenRouter untuk ratusan model komersial dan open-weights.
            </li>
            <li>
              <strong className="text-zinc-200">Local & Self-Hosted:</strong> Ollama untuk inferensi lokal tanpa biaya API, serta custom OpenAI-compatible proxies.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 7,
      q:
        lang === "en"
          ? "How does PIEW integrate with my existing tools?"
          : "Bagaimana cara PIEW terhubung dengan alat kerja saya?",
      a: (
        <p>
          {lang === "en"
            ? "PIEW leverages the open industry standard Model Context Protocol (MCP). Through MCP, the system connects securely to GitHub repositories, Docker containers, local file systems, PostgreSQL databases, and developer observability tools such as Sentry and Linear."
            : "PIEW menggunakan standar industri terbuka bernama Model Context Protocol (MCP). Melalui MCP, sistem dapat terhubung secara aman ke repositori GitHub, kontainer Docker, sistem berkas lokal, database PostgreSQL, serta alat pelaporan dan manajemen seperti Sentry dan Linear."}
        </p>
      ),
    },
    {
      id: 8,
      q:
        lang === "en"
          ? "How secure is my data and who owns the generated code?"
          : "Bagaimana dengan keamanan data dan hak kepemilikan?",
      a: (
        <ul className="space-y-2 list-disc list-inside text-zinc-400">
          <li>
            <strong className="text-zinc-200">
              {lang === "en" ? "100% Full Ownership: " : "Hak Milik Penuh 100%: "}
            </strong>
            {lang === "en"
              ? "You hold absolute ownership of all generated source code, database schemas, and documentation with zero royalties."
              : "Anda adalah pemilik mutlak atas seluruh kode sumber, skema basis data, dan dokumentasi yang dihasilkan tanpa royalti."}
          </li>
          <li>
            <strong className="text-zinc-200">
              {lang === "en" ? "Zero Secret Leakage: " : "Nol Kebocoran Kunci Rahasia: "}
            </strong>
            {lang === "en"
              ? "API keys and sensitive credentials remain stored locally on your machine and are never transmitted to third-party servers."
              : "Kunci API dan kredensial sensitif disimpan secara lokal di mesin Anda dan tidak pernah dikirimkan ke server pihak ketiga mana pun."}
          </li>
          <li>
            <strong className="text-zinc-200">
              {lang === "en" ? "Total Portability (No Lock-In): " : "Portabilitas Total (Tanpa Vendor Lock-in): "}
            </strong>
            {lang === "en"
              ? "Download your project as a .zip or push to GitHub, ready to deploy to Vercel, Netlify, or any VPS independently."
              : "Seluruh proyek dapat diunduh sebagai file .zip atau disinkronkan ke GitHub, lalu di-deploy ke Vercel, VPS pribadi, atau platform hosting mana pun secara mandiri."}
          </li>
        </ul>
      ),
    },
    {
      id: 9,
      q:
        lang === "en"
          ? "Can I connect my own custom domain?"
          : "Bisakah saya menghubungkan domain saya sendiri?",
      a: (
        <p>
          {lang === "en"
            ? "Yes, very easily. Because PIEW produces standard production web code, you can deploy to services like Vercel, Netlify, Cloudflare Pages, or your own server, and attach your personal domain (.com, .id, etc.) directly from your hosting dashboard."
            : "Bisa, sangat mudah. Karena proyek yang dihasilkan berbentuk kode web standar, Anda dapat mengunggahnya (deploy) ke layanan seperti Vercel, Netlify, Cloudflare, atau server VPS Anda sendiri, lalu menyambungkan domain pribadi (seperti .com atau .id) langsung dari panel penyedia hosting tersebut."}
        </p>
      ),
    },
    {
      id: 10,
      q:
        lang === "en"
          ? "How do I refine features or request changes?"
          : "Bagaimana cara melakukan perbaikan atau menambah fitur baru?",
      a: (
        <p>
          {lang === "en"
            ? "Simply supply a specific follow-up prompt, such as asking for a new contact form or switching theme palettes. PIEW intelligently updates only the relevant code modules without disrupting existing functional logic."
            : "Anda cukup menuliskan instruksi lanjutan secara spesifik, misalnya meminta penambahan form kontak baru atau penggantian warna tema. PIEW akan menyesuaikan bagian kode yang relevan tanpa mengganggu fungsi lain yang sudah berjalan dengan benar."}
        </p>
      ),
    },
  ]

  if (isDocsEmbed) {
    return (
      <section id="faq" className="scroll-mt-32 space-y-4 pt-6">
        <div className="border-b border-white/[0.08] pb-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {lang === "en"
              ? "Frequently Asked Questions"
              : "Pertanyaan yang Sering Diajukan"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {lang === "en"
              ? "Common questions regarding architecture, workflow, integration, and security."
              : "Pertanyaan umum seputar arsitektur, alur kerja, integrasi, dan keamanan."}
          </p>
        </div>

        {/* Resend-Style Individual Accordion Cards Stack */}
        <div className="space-y-3">
          {faqData.map((item) => {
            const isOpen = openItems.includes(item.id)
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl sm:rounded-2xl transition-all duration-200 overflow-hidden",
                  "bg-[#141518] border",
                  isOpen
                    ? "border-white/15 shadow-lg shadow-black/40"
                    : "border-white/[0.06] hover:border-white/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center gap-3.5 px-5 py-4 text-left select-none cursor-pointer group"
                >
                  <div className="shrink-0 text-zinc-400 group-hover:text-white transition-colors">
                    <IconChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isOpen && "rotate-90 text-white"
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.q}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 pt-1 pl-12 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-[#000000] select-none border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading (Resend Style: Left-Aligned & Clean) */}
        <div className="mb-8 sm:mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold block mb-2">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            {lang === "en"
              ? "Frequently asked questions"
              : "Pertanyaan yang sering diajukan"}
          </h2>
        </div>

        {/* Resend-Style Individual Accordion Cards Stack */}
        <div className="space-y-3 sm:space-y-3.5">
          {faqData.map((item) => {
            const isOpen = openItems.includes(item.id)
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl sm:rounded-2xl transition-all duration-200 overflow-hidden",
                  "bg-[#141518] border",
                  isOpen
                    ? "border-white/15 shadow-lg shadow-black/40"
                    : "border-white/[0.06] hover:border-white/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center gap-3.5 px-5 py-4 sm:px-6 sm:py-4.5 text-left select-none cursor-pointer group"
                >
                  <div className="shrink-0 text-zinc-400 group-hover:text-white transition-colors">
                    <IconChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isOpen && "rotate-90 text-white"
                      )}
                    />
                  </div>
                  <span className="text-sm sm:text-base font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.q}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6 pl-12 sm:pl-14 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
