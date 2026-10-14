"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  HelpCircle,
  Bug,
  Sparkles,
} from "lucide-react";

export function UserGuideSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div data-testid="user-guide-section" className="w-full">
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Panduan Cepat &amp; Dokumentasi Pengguna Workspace
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  v1.1.0
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Cara kerja optimasi prompt, interpretasi taksonomi temuan, keamanan data, dan pengujian model.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <span>{isOpen ? "Tutup Panduan" : "Buka Panduan"}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isOpen && (
          <CardContent className="p-6 pt-2 border-t border-border/60 space-y-6 text-xs">
            {/* 1. Alur Kerja Langkah Demi Langkah */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Alur Kerja 4 Langkah Penggunaan Workspace</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Langkah 1 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="font-semibold text-foreground text-xs">Pilih Domain &amp; Provider</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Tentukan <strong>Mode Domain</strong> (Coding, Debugging, Akademik, Bisnis, atau Umum) dan pilih <strong>Provider AI</strong> serta target model yang akan digunakan untuk optimasi dan eksekusi.
                  </p>
                </div>

                {/* Langkah 2 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="font-semibold text-foreground text-xs">Analisis &amp; Optimasi</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Ketik atau tempel prompt awal Anda. Masukkan konteks opsional jika diperlukan. Klik tombol <strong>Optimalkan Prompt</strong> untuk memulai audit taksonomi kelemahan.
                  </p>
                </div>

                {/* Langkah 3 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span className="font-semibold text-foreground text-xs">Tinjau Temuan &amp; Diff</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Periksa kartu <strong>Intent Guard</strong> untuk memastikan maksud asli terjaga. Teliti kartu <strong>Taksonomi Temuan</strong> dan bandingkan perubahan kalimat demi kalimat pada <strong>Diff Viewer</strong>.
                  </p>
                </div>

                {/* Langkah 4 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                      4
                    </span>
                    <span className="font-semibold text-foreground text-xs">Uji &amp; Simpan Riwayat</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Gunakan <strong>Playground</strong> untuk mengisi variabel placeholder dan menguji respons model secara riil. Simpan prompt yang disetujui dengan <strong>Accept &amp; Save</strong> ke riwayat Anda.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Keamanan Data & Privasi */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-foreground space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Pedoman Keamanan &amp; Perlindungan Data Pribadi (Privasi Zero-Leakage)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed pl-1">
                <li>
                  <strong>Hindari Memasukkan Data Sensitif:</strong> Jangan memasukkan kunci API, password, token otentikasi, nomor kartu kredit, atau Personally Identifiable Information (PII) ke dalam form prompt.
                </li>
                <li>
                  <strong>Kontrol Riwayat Sesi:</strong> Semua riwayat disimpan secara terisolasi per sesi pengguna. Anda dapat menghapus rekaman riwayat kapan saja melalui tombol ikon tempat sampah di Sidebar Riwayat.
                </li>
                <li>
                  <strong>Transparansi Provider:</strong> Komunikasi ke API provider (Groq, Gemini, OpenRouter, Ollama) dilakukan secara server-to-server. Kunci API tidak pernah dikirim ke browser klien.
                </li>
              </ul>
            </div>

            {/* 3. Bantuan, FAQ & Pelaporan Masalah */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <span>FAQ &amp; Memahami Skor Prompt</span>
                </div>
                <div className="space-y-1 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Skor Prompt (0-100):</strong> Merepresentasikan tingkat kejelasan, kelengkapan batasan, dan kekebalan terhadap ambiguitas berdasarkan rubrik Domain terpilih.
                  </p>
                  <p>
                    <strong>Sifat Non-Deterministik LLM:</strong> Model bahasa besar bersifat probabilistik. Hasil eksekusi pada Playground dapat bervariasi pada temperature &gt; 0.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Bug className="h-4 w-4 text-rose-500" />
                  <span>Pelaporan Masalah &amp; Bug Tracking</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Menemukan perilaku tidak wajar atau memiliki masukan perbaikan? Silakan laporkan issue melalui repository GitHub resmi kami di:
                </p>
                <div className="pt-1">
                  <a
                    href="https://github.com/Kal215/prompt-workspace/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-4 font-mono font-medium hover:text-primary/80"
                  >
                    <span>github.com/Kal215/prompt-workspace/issues</span>
                    &rarr;
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
