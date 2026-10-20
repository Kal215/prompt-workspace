"use client"

import React, { useState } from "react"
import { IconCheck, IconCopy, IconFileCode } from "@tabler/icons-react"

interface SyntaxCodeCardProps {
  filename: string
  copyContent?: string
  lang?: "id" | "en"
  children: React.ReactNode
}

export function SyntaxCodeCard({
  filename,
  copyContent,
  lang = "en",
  children,
}: SyntaxCodeCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!copyContent) return
    try {
      await navigator.clipboard.writeText(copyContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className="my-6 rounded-2xl border border-white/10 bg-[#08090d] overflow-hidden shadow-2xl shadow-black/80">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[#111319] border-b border-white/[0.08] text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <IconFileCode className="w-4 h-4 text-sky-400" />
          <span className="text-zinc-300 font-medium tracking-wide">{filename}</span>
        </div>

        {copyContent && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">
                  {lang === "en" ? "Copied" : "Tersalin"}
                </span>
              </>
            ) : (
              <>
                <IconCopy className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Copy" : "Salin"}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Code Body with real syntax highlighting */}
      <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-[13.5px] font-mono leading-relaxed text-zinc-200 scrollbar-thin">
        <code>{children}</code>
      </pre>
    </div>
  )
}
