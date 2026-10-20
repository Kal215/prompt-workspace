'use client'

import React from 'react'
import Link from 'next/link'

interface FooterLink {
  title: string
  href: string
}

export function PiewFooter({ lang }: { lang: 'en' | 'id' }) {
  const content = {
    en: {
      copyright: '© 2026 PIEW. All rights reserved.',
      desc: 'A minimal, unified workspace for structured prompt engineering and AI agent orchestration.',
      col1Title: 'Platform',
      col1: [
        { title: 'Playground', href: '/playground' },
        { title: 'Classic Studio', href: '/classic' },
        { title: 'Pro Studio', href: '/pro' },
        { title: 'Agent Workspace', href: '/agent' },
        { title: 'Model Providers', href: '#providers' },
        { title: 'MCP Connectors', href: '#connectors' },
        { title: 'Documentation', href: '/docs' },
        { title: 'Changelog', href: '#' },
      ],
      col2Title: 'Ecosystem',
      col2: [
        { title: 'Model Context Protocol', href: 'https://modelcontextprotocol.io' },
        { title: 'Local Inference (Ollama)', href: 'https://ollama.com' },
        { title: 'Cloud Routing (Groq/vLLM)', href: 'https://groq.com' },
        { title: 'Architecture Specs', href: '#' },
      ],
      col3Title: 'Community',
      col3: [
        { title: 'GitHub', href: 'https://github.com' },
        { title: 'Discord', href: '#' },
        { title: 'X (Twitter)', href: 'https://x.com' },
        { title: 'System Status', href: '#' },
      ],
      col4Title: 'Legal',
      col4: [
        { title: 'Privacy Policy', href: '#' },
        { title: 'Terms of Service', href: '#' },
        { title: 'Security & Sandboxing', href: '#' },
      ],
    },
    id: {
      copyright: '© 2026 PIEW. Hak cipta dilindungi.',
      desc: 'Workspace minimalis dan terpadu untuk alur kerja AI dan prompt engineering terstruktur.',
      col1Title: 'Platform',
      col1: [
        { title: 'Playground', href: '/playground' },
        { title: 'Classic Studio', href: '/classic' },
        { title: 'Pro Studio', href: '/pro' },
        { title: 'Workspace Agen', href: '/agent' },
        { title: 'Penyedia Model', href: '#providers' },
        { title: 'Konektor MCP', href: '#connectors' },
        { title: 'Dokumentasi', href: '/docs' },
        { title: 'Catatan Rilis', href: '#' },
      ],
      col2Title: 'Ekosistem',
      col2: [
        { title: 'Model Context Protocol', href: 'https://modelcontextprotocol.io' },
        { title: 'Inferensi Lokal (Ollama)', href: 'https://ollama.com' },
        { title: 'Cloud Routing (Groq/vLLM)', href: 'https://groq.com' },
        { title: 'Spesifikasi Arsitektur', href: '#' },
      ],
      col3Title: 'Komunitas',
      col3: [
        { title: 'GitHub', href: 'https://github.com' },
        { title: 'Discord', href: '#' },
        { title: 'X (Twitter)', href: 'https://x.com' },
        { title: 'Status Sistem', href: '#' },
      ],
      col4Title: 'Legalitas',
      col4: [
        { title: 'Kebijakan Privasi', href: '#' },
        { title: 'Ketentuan Layanan', href: '#' },
        { title: 'Keamanan & Isolasi', href: '#' },
      ],
    },
  }[lang]

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/[0.08] bg-black px-6 pt-20 pb-12 sm:px-8 md:px-12">
      {/* Upper Grid Section */}
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between text-sm text-zinc-400 lg:flex-row gap-12">
        {/* Left: Brand Identity & Description */}
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center space-x-2.5">
            <img
              src="/logo-white.png"
              alt="PIEW Logo"
              className="h-7 w-auto object-contain select-none"
            />
            <span className="text-lg font-bold tracking-tight text-white">
              PIEW
            </span>
          </Link>
          <p className="mt-3.5 text-xs sm:text-sm text-zinc-500 leading-relaxed">
            {content.desc}
          </p>
          <div className="mt-6 text-xs text-zinc-600 font-mono">
            {content.copyright}
          </div>
        </div>

        {/* Right: Four Grids */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10 lg:gap-12 w-full lg:w-auto">
          {/* Column 1: Platform */}
          <div className="flex flex-col space-y-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              {content.col1Title}
            </p>
            <ul className="list-none space-y-2.5 text-xs sm:text-sm text-zinc-400">
              {content.col1.map((item, idx) => (
                <li key={`col1-${idx}`} className="list-none">
                  <Link
                    href={item.href}
                    className="transition-colors duration-200 hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Ecosystem */}
          <div className="flex flex-col space-y-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              {content.col2Title}
            </p>
            <ul className="list-none space-y-2.5 text-xs sm:text-sm text-zinc-400">
              {content.col2.map((item, idx) => (
                <li key={`col2-${idx}`} className="list-none">
                  <Link
                    href={item.href}
                    className="transition-colors duration-200 hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Community */}
          <div className="flex flex-col space-y-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              {content.col3Title}
            </p>
            <ul className="list-none space-y-2.5 text-xs sm:text-sm text-zinc-400">
              {content.col3.map((item, idx) => (
                <li key={`col3-${idx}`} className="list-none">
                  <Link
                    href={item.href}
                    className="transition-colors duration-200 hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="flex flex-col space-y-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white">
              {content.col4Title}
            </p>
            <ul className="list-none space-y-2.5 text-xs sm:text-sm text-zinc-400">
              {content.col4.map((item, idx) => (
                <li key={`col4-${idx}`} className="list-none">
                  <Link
                    href={item.href}
                    className="transition-colors duration-200 hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Massive Brand Watermark Text (Aceternity 1:1) with custom Logo as 'P' */}
      <div className="relative mt-16 sm:mt-24 select-none pointer-events-none flex items-center justify-center">
        <div className="inline-flex items-center justify-center text-6xl font-black tracking-tight leading-none sm:text-8xl md:text-[10rem] lg:text-[13rem] xl:text-[15rem]">
          {/* Logo replacing letter 'P' with exact cap-height alignment & seamless kerning */}
          <span
            className="inline-block h-[0.69em] aspect-[2064/1104] mr-[0.015em] -translate-y-[0.01em] bg-gradient-to-b from-zinc-600/70 via-zinc-700/40 to-zinc-900/10"
            style={{
              maskImage: 'url(/logo-white.png)',
              WebkitMaskImage: 'url(/logo-white.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
          {/* Letters 'IEW' */}
          <span className="bg-gradient-to-b from-zinc-600/70 via-zinc-700/40 to-zinc-900/10 bg-clip-text text-transparent">
            IEW
          </span>
        </div>
      </div>
    </footer>
  )
}
