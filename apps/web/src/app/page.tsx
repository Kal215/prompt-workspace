'use client';

import React from 'react';
import { Terminal, Shield, ArrowRight } from 'lucide-react';

export default function CleanSlateHomePage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-xs font-mono text-cyan-400">
          <Shield className="size-3.5" />
          <span>PIEW CORE v2.3 • CLEAN SLATE</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Prompt Intelligence &amp; Engineering Workspace
        </h1>

        <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
          Antarmuka web legacy telah dibersihkan secara aman. Seluruh mesin inti, adapter model AI, dan konektor MCP tetap aktif dan terlindungi 100%.
        </p>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 text-left font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-zinc-800">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Terminal className="size-3.5 text-emerald-400" /> Terminal Ready
            </span>
            <span>Status: Engine Active</span>
          </div>
          <p className="text-zinc-400">
            $ npm run piew -- &quot;Deskripsi ide sistem Anda&quot;
          </p>
        </div>

        <div className="pt-2">
          <span className="text-[11px] font-mono text-zinc-500">
            Siap untuk penyambungan antarmuka baru (Landing Page, Settings &amp; FAQ).
          </span>
        </div>
      </div>
    </main>
  );
}
