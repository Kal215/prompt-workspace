"use client";

import React from "react";
import { ShieldCheck, Cloud, Database } from "lucide-react";

export function PrivacyDisclosure() {
  return (
    <div
      data-testid="privacy-disclosure"
      className="rounded-xl border border-border bg-card p-5 space-y-3 text-xs text-muted-foreground shadow-2xs mt-4"
    >
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <div className="w-6 h-6 rounded-md bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold tracking-tight uppercase font-mono">
            Kebijakan Privasi &amp; Transparansi Data
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#FF4D00] bg-[#FF4D00]/10 border border-[#FF4D00]/20 px-2 py-0.5 rounded-full">
          Zero Raw-Prompt Logging
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed pt-1">
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border/70 bg-muted/20">
          <Cloud className="h-4 w-4 mt-0.5 text-[#FF4D00] shrink-0" />
          <div>
            <span className="font-semibold text-foreground block mb-0.5">Pemrosesan Eksternal</span>
            <p>
              Prompt dikirim ke penyedia LLM eksternal (<span className="font-semibold text-foreground">Groq API</span>) melalui koneksi server terenkripsi dengan kebijakan{" "}
              <span className="italic font-medium text-foreground">Zero Raw-Prompt Logging</span> (prompt disensor pada log operasional). Dilarang memasukkan kredensial, API key, atau data pribadi sensitif (PII).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border/70 bg-muted/20">
          <Database className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
          <div>
            <span className="font-semibold text-foreground block mb-0.5">Retensi &amp; Sesi Mandiri</span>
            <p>
              Prompt dianalisis sementara di memori dan <span className="font-medium text-foreground">tidak disimpan otomatis</span> ke database. Penyimpanan hanya terjadi jika Anda menekan tombol{" "}
              <span className="font-semibold text-foreground">&quot;Terima &amp; Simpan&quot; (Accept &amp; Save)</span>, terikat ke sesi browser aktif (<span className="font-mono text-[10px]">HttpOnly</span>), dan dapat dihapus kapan saja melalui panel{" "}
              <span className="font-medium text-foreground">Riwayat</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}