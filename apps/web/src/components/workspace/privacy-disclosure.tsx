"use client";

import React from "react";
import { ShieldCheck, Cloud, Database } from "lucide-react";

export function PrivacyDisclosure() {
  return (
    <div
      data-testid="privacy-disclosure"
      className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2 text-xs text-muted-foreground mt-4"
    >
      <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-semibold tracking-tight">
          Kebijakan Privasi & Transparansi Data
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] leading-relaxed">
        <div className="flex items-start gap-1.5">
          <Cloud className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <p>
            <span className="font-medium text-foreground">Pemrosesan Eksternal:</span>{" "}
            Prompt dikirim ke penyedia LLM eksternal (<span className="font-semibold text-foreground">Groq API</span>) melalui koneksi server terenkripsi dengan kebijakan{" "}
            <span className="italic font-medium text-foreground/90">Zero Raw-Prompt Logging</span> (prompt disensor pada log operasional). Dilarang memasukkan kredensial, API key, atau data pribadi sensitif (PII).
          </p>
        </div>

        <div className="flex items-start gap-1.5">
          <Database className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p>
            <span className="font-medium text-foreground">Retensi & Sesi:</span>{" "}
            Prompt dianalisis sementara di memori dan <span className="font-medium text-foreground">tidak disimpan otomatis</span> ke database. Penyimpanan hanya terjadi jika Anda menekan tombol{" "}
            <span className="font-medium text-foreground">&quot;Terima &amp; Simpan&quot; (Accept &amp; Save)</span>, terikat ke sesi browser aktif (<span className="font-mono text-[10px]">HttpOnly</span>), dan dapat dihapus kapan saja melalui panel{" "}
            <span className="font-medium text-foreground">Riwayat</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
