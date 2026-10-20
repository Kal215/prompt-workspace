[English](../../README.md) · **Bahasa Indonesia**

# PIEW: Prompt Intelligence & Engineering Workspace

### Insinyur Pengawas Mutu Otonom, Pengarah Arsitektur & Runtime Model Context Protocol (MCP)

**Menghilangkan halusinasi agen koding AI, perulangan tanpa henti (*infinite loop*), dan jebakan laporan palsu (*self-report trap*) melalui verifikasi fisik berbasis bukti nyata.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%202.0-5c4ee5?style=flat-square)](https://modelcontextprotocol.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-orange?style=flat-square)](#arsitektur-monorepo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](../../LICENSE)

---

**[Mulai Cepat](#mulai-cepat)** · **[Mengapa PIEW](#mengapa-piew)** · **[Kemampuan Utama](#kemampuan-utama)** · **[Cara Kerja PIEW](#cara-kerja-piew)** · **[Integrasi IDE (MCP)](#integrasi-ide-ai-mcp-server)** · **[Referensi CLI](#referensi-cli-terminal)** · **[Peta Monorepo](#arsitektur-monorepo)**

```bash
npm run piew -- --help
```

> [!IMPORTANT]
> **Prinsip Bukti Fisik di Atas Klaim Teks (*Evidence Over Claims*)**: Agen koding AI kerap mengklaim sebuah tugas telah tuntas, padahal menyisakan galat kompilasi, impor yang rusak, unit test yang gagal, atau penghapusan skema kritis secara diam-diam. PIEW tidak pernah mempercayai klaim teks agen; sistem selalu memeriksa *git diff* nyata, kode keluar kompiler, dan runner pengujian sebelum mengizinkan kemajuan proyek.

---

## Mengapa PIEW?

Agen koding AI modern (Cursor, Claude Code, Windsurf, Aider) adalah eksekutor yang andal, namun mereka tidak memiliki pengawas arsitektural independen:

| Celah Kegagalan Agen AI | Dampak Nyata di Proyek | Solusi PIEW |
|---|---|---|
| **Jebakan Laporan Palsu (*Self-Report Trap*)** | Agen menyatakan *"Semua fitur sudah selesai dibuat!"* padahal kode gagal kompilasi. | **Audit Empiris Fisik**: Wajib membuktikan perubahan baris kode di `git diff` dan exit code 0 kompiler. |
| **Perulangan Revisi Tanpa Henti (*Infinite Loop*)** | Agen berhalusinasi memperbaiki error yang sama, menghabiskan kuota token konteks. | **Sirkuit Pengaman 3x (*Circuit Breaker*)**: Batas revisi maksimal 3 kali sebelum eskalasi ke manusia. |
| **Penyimpangan Batasan (*Negative Constraint Drift*)** | Agen membuat data tiruan (*dummy mock*) atau menghapus tabel transaksi penting. | **Penjaga Batasan Negatif**: Audit AST & regex untuk mencekal pola yang dilarang pengguna. |
| **Tugas Monolitik Terlalu Luas (*Scope Creep*)** | Agen mencoba membuat DB, API, dan UI sekaligus dalam 1 putaran, menghasilkan kode rintisan yang rusak. | **Pemisahan Fase Bertahap (*Phasing*)**: Mendekonstruksi proyek menjadi tahapan linier (DB &rarr; API &rarr; UI). |

---

## Mulai Cepat

### 1. Hubungkan ke Cursor / Claude Desktop (Model Context Protocol)

PIEW menyediakan server MCP standar industri yang mengekspos alat inspeksi fisik dan pengawasan otonom langsung ke IDE AI Anda.

Tambahkan ke berkas konfigurasi MCP Anda (`cursor.json` atau `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "piew": {
      "command": "npx",
      "args": ["tsx", "scripts/piew-mcp-server.ts"]
    }
  }
}
```

Agen di IDE Anda kini dapat memanggil alat pengawas PIEW secara otonom sebelum menandai suatu pekerjaan selesai.

### 2. Jalankan Mandiri via Terminal (PIEW CLI)

Jalankan audit mutu fisik secara langsung pada direktori kerja lokal Anda:

```bash
# Verifikasi direktori kerja aktif terhadap kompilasi TypeScript dan suite pengujian
npm run piew -- --audit --session=piew-proj-alpha --build-cmd="npm run typecheck" --test-cmd="npm test"

# Sintesis Master Prompt berstruktur tinggi dengan penjaga batasan anti-scope-creep
npm run piew -- "Buat sistem manajemen stok toko roti. DILARANG membuat modul POS fisik." --supervise
```

### 3. Jalankan Antarmuka Web Mission Control (Next.js 15)

```bash
# Pasang seluruh dependensi pada 8 paket monorepo
npm install

# Jalankan server pengembangan Next.js
npm run dev --workspace=web
```
Buka [http://localhost:3000](http://localhost:3000) untuk memantau grafik riwayat audit, transisi status fase, dan telemetri *circuit breaker* secara visual.

---

## Kemampuan Utama

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESIN PENGAWAS PIEW                              │
├───────────────────────┬──────────────────────────┬──────────────────────────┤
│ 1. AUDIT EMPIRIS      │ 2. KOREKSI DETERMINISTIK │ 3. KONEKTOR ENTERPRISE   │
│ • Git Diff Inspector  │ • Naskah 4-Komponen      │ • 10 Konektor Standar    │
│ • Terminal Verifier   │ • Circuit Breaker 3x     │ • GitHub, Linear, Sentry │
│ • Docker Health Check │ • Milestone Bertahap     │ • Figma, DB, Puppeteer   │
│ • Penjaga Larangan    │ • Intervensi Manusia     │ • Filesystem Terisolasi  │
└───────────────────────┴──────────────────────────┴──────────────────────────┘
```

### 1. Pengawas Mutu Empiris Fisik (`packages/prompt-engine/src/supervisor/`)
* **`gitDiffInspector`**: Memeriksa penambahan dan modifikasi baris kode fisik, serta mendeteksi peringatan jika terjadi penghapusan berkas sepihak.
* **`terminalVerifier`**: Menjalankan perintah build dan test dengan *timeout guard* terisolasi (60 detik) serta parser galat baris kompiler (`file(line,col): error`).
* **`dockerHealthChecker`**: Memvalidasi kesehatan kontainer Docker, pemetaan port, dan deteksi pola *crash-loop*.
* **`negativeConstraintGuard`**: Menghentikan regresi terhadap larangan mutlak yang diberikan pengguna (seperti larangan data dummy atau mock API).

### 2. Pengarah Koreksi Deterministik & Sirkuit Pengaman (*Circuit Breaker*)
Saat audit mendeteksi kegagalan, PIEW tidak memberikan masukan ambigu. Sistem menerbitkan **Direktif Koreksi 4-Komponen**:
1. **Diagnosis Empiris**: Cuplikan kegagalan kompiler atau runtime nyata dari stderr.
2. **Lokasi Berkas & Baris Cacat**: Jalur berkas absolut, nomor baris, dan nomor kolom.
3. **Tindakan Perbaikan Wajib**: Langkah terarah yang wajib dilakukan untuk menyelesaikan galat.
4. **Batasan Toleransi Mutlak**: Larangan yang tidak boleh dilanggar selama perbaikan.

*Jika agen pelaksana gagal memperbaiki kode selama 3 kali berturut-turut pada fase yang sama, PIEW memutus sirkuit (*`BLOCKED_CIRCUIT_BREAKER_TRIGGERED`*), menghentikan pemborosan token, dan meminta persetujuan manusia.*

### 3. 10 Konektor MCP Enterprise (`packages/provider-adapters/src/mcp-catalog.ts`)
Integrasi native untuk alur rekayasa perangkat lunak produksi:
* **GitHub**: Operasi branch, commit, dan telaah pull request.
* **Linear**: Sinkronisasi tiket tugas dan pelacakan milestone issue.
* **Sentry**: Penarikan jejak telemetri error dan stack trace aplikasi.
* **Figma**: Ekstraksi token antarmuka visual dan spesifikasi layout.
* **Docker Engine**: Diagnostik status kontainer lokal dan pembacaan log.
* **Database**: Pengujian query dan inspeksi skema fisik PostgreSQL / SQLite.
* **Brave / Firecrawl Search**: Penarikan dokumentasi teknis eksternal dengan proteksi SSRF.
* **Sandboxed File System**: Manipulasi berkas workspace yang aman.
* **Memory Bridge**: Penyimpanan dan pemanggilan memori semantik jangka panjang via Qdrant & Mem0.
* **Puppeteer**: Browser headless untuk inspeksi DOM halaman web dan penangkapan layar.

---

## Cara Kerja PIEW

```text
Instruksi Pengguna / Target Proyek
                 │
                 ▼
     ┌────────────────────────┐
     │ Pemecahan Fase Proyek  │ ── Milestone Linier (DB ➔ API ➔ UI)
     └────────────────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │ Agen Koding Bekerja    │ ── Cursor / Claude Code memodifikasi berkas lokal
     └────────────────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │ Audit Empiris PIEW     │ ── Git Diff + Kompiler (tsc) + Test Runner + Docker
     └────────────────────────┘
                 │
                 ├─────────────────────────────────┐
                 ▼ [LULUS]                         ▼ [GAGAL]
     ┌────────────────────────┐       ┌────────────────────────┐
     │ Buka Kunci Fase Berikut│       │ Terbitkan Prompt Revisi│ ◄── Maksimal 3x
     └────────────────────────┘       └────────────────────────┘
                                                   │
                                                   ▼ [Melebihi 3x]
                                      ┌────────────────────────┐
                                      │ PICU CIRCUIT BREAKER   │ ── Eskalasi ke Manusia
                                      └────────────────────────┘
```

---

## Arsitektur Monorepo

PIEW dirancang dengan arsitektur **Modular Monolith** berorientasi keamanan tipe berbasis `npm workspaces`:

```text
prompt-workspace/
├── apps/
│   └── web/                         # Next.js 15 (Turbopack, App Router, Tailwind CSS, Lucide)
│       └── src/app/api/             # Route Handlers Next.js (/api/supervision, /api/agent-runs, /api/skills)
│
├── packages/
│   ├── prompt-contracts/            # Kontrak data Zod & Single Source of Truth skema monorepo
│   ├── prompt-engine/               # Core Engine & Runtime Supervisor Otonom
│   │   ├── src/supervisor/          # Modul inspeksi fisik, Steering Director & Circuit Breaker
│   │   └── scripts/                 # Suite pengujian otomatis supervisor empiris
│   ├── provider-adapters/           # Router failover multi-provider & 10 Enterprise MCP Connectors
│   ├── prompt-crawler/              # Scraper dokumentasi aman SSRF & penyensor rahasia otomatis
│   ├── prompt-spider/               # Matriks uji stres adversarial 5-cabang
│   ├── domain-rules/                # Paket aturan rekayasa prompt berstandar industri
│   └── database/                    # Prisma ORM & mesin penyimpanan SQLite WAL
│
├── docs/
│   ├── readme/                      # Dokumentasi multi-bahasa (README_id.md)
│   ├── architecture/                # Architecture Decision Records (ADRs) & spesifikasi
│   └── product/                     # Catatan rilis & panduan pengguna
│
├── scripts/
│   ├── piew-cli.ts                  # Eksekutor baris perintah (CLI) supervisor
│   └── piew-mcp-server.ts           # Server Model Context Protocol (MCP) standar
│
├── SUPERVISOR_EXECUTION_STATE.md    # Berkas pelacak status runtime fisik permanen
├── RANCANG_BANGUN_PIEW_AUTONOMOUS_SUPERVISOR.pdf  # Dokumen spesifikasi arsitektur 8 halaman kanonis
└── package.json                     # Konfigurasi workspace root monorepo
```

---

## Perintah Kerja & Pengujian Mutu (Scripts)

Seluruh paket menerapkan standar zero-regression yang ketat:

```bash
# Verifikasi kompilasi TypeScript di seluruh 8 workspace
npm run typecheck

# Jalankan suite pengujian empiris pengawas otonom lengkap
npx tsx packages/prompt-engine/scripts/test-empirical-supervisor.ts

# Uji konektivitas katalog MCP enterprise & kepatuhan skema JSON-RPC
npm run test:mcp

# Uji failover pool multi-provider dan cascade router
npm run test:providers

# Jalankan build produksi penuh monorepo
npm run build
```

---

## Kontribusi & Keamanan

* **Panduan Kontribusi**: Silakan pelajari [CONTRIBUTING.md](../../CONTRIBUTING.md) untuk konvensi penamaan cabang, DoR (Definition of Ready), dan DoD (Definition of Done).
* **Pelaporan Kerentanan & Keamanan**: Rujuk ke [SECURITY.md](../../SECURITY.md) untuk prosedur pengungkapan dan protokol rotasi kredensial.
* **Aturan Batasan Wilayah Kerja**: Agen Backend memodifikasi `packages/*` dan `scripts/*`; Agen Frontend memodifikasi `apps/web/*`.

---

## Lisensi

Didistribusikan di bawah Lisensi Resmi MIT. Lihat [LICENSE](../../LICENSE) untuk rincian lebih lanjut.
