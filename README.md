# Prompt Intelligence Engineering Workspace (PIEW)
**Versi: v2.0.0 (Closed-Loop Synthesis Platform, Crawler Grounding & Spider Matrix Evaluation)**

Prompt Intelligence Engineering Workspace (PIEW) adalah platform rekayasa prompt tingkat lanjut (*advanced prompt engineering*) yang mengimplementasikan metodologi **Preserve Intent**, **Analyze Before Optimize**, **Evidence Over Claims**, dan **Closed-Loop Synthesis**.

Mulai versi 2.0.0, PIEW mentransformasikan arsitektur optimasi satu arah (Open-Loop) menjadi siklus iterasi tertutup (*Closed-Loop Synthesis*): mengimpor dokumen spesifikasi eksternal melalui **Crawler Grounding** yang dilindungi SSRF Guard, mengoptimasi prompt dengan 5 Domain Rule Packs berstandar tinggi, menguji prompt secara empiris melalui **Spider Matrix Runner** (5 cabang uji adversarial konkurensi terkontrol), dan menyimpan hasil perbaikan ke dalam silsilah **Prompt Versioning** berbasis SQLite WAL.

---

## 📚 Dokumentasi Cepat (Quick Links)

### Panduan Rilis v2.0.0 & Arsitektur
- 📝 [Catatan Rilis v2.0.0 (Release Notes)](docs/product/RELEASE-NOTES-v2.0.0.md)
- 🏛️ [ADR-002: Integrasi Crawler, Spider & Closed-Loop Engine](docs/architecture/ADR-002-crawler-spider-integration.md)
- 🔍 [Gate 0 Compatibility Report (Audit Skema v1.0 vs v2.0)](docs/architecture/GATE-0-COMPATIBILITY-REPORT.md)
- 🚨 [Panduan Operasional & Penanganan Insiden v2.0 (Runbook SOP)](docs/operations/RUNBOOK.md)

### Panduan Pengguna & Operasi v1.x
- 📖 [Panduan Pengguna Lengkap & FAQ (User Guide & FAQ)](docs/product/USER-GUIDE-AND-FAQ.md)
- 📋 [Checklist Kesiapan Rilis v1.1.0](docs/operations/RELEASE-CHECKLIST-v1.1.0.md)
- 📝 [Catatan Rilis v1.1.0](docs/product/RELEASE-NOTES-v1.1.0.md)

### Tata Kelola Platform & Kontribusi
- 📐 [Kebijakan Kompatibilitas, Versioning & Deprikasi](docs/architecture/COMPATIBILITY-AND-VERSIONING-POLICY.md)
- 🤝 [Panduan Kontribusi Developer (CONTRIBUTING.md)](CONTRIBUTING.md)
- 🔒 [Kebijakan Keamanan & Rotasi Rahasia (SECURITY.md)](SECURITY.md)
- 🏛️ [Keputusan Arsitektur Sistem (ADR-001: Modular Monolith)](docs/architecture/ADR-001-modular-monolith-and-security.md)

---

## 🔄 Alur Kerja Closed-Loop Synthesis v2.0

```text
  [Dokumen Eksternal / GitHub Raw]
                 │
                 ▼
     ┌────────────────────────┐
     │ 1. CRAWLER GROUNDING   │ ── SSRF Guard, Secret Redactor, Content Extractor
     └────────────────────────┘
                 │ (Grounding Context)
                 ▼
     ┌────────────────────────┐
     │ 2. OPTIMIZATION ENGINE │ ── 5 Domain Packs, Preserve Intent, Scaffolding
     └────────────────────────┘
                 │ (Optimized Prompt Version)
                 ▼
     ┌────────────────────────┐
     │ 3. SPIDER MATRIX       │ ── 5-Branch Stress Test, Semaphore Concurrency (2),
     │    EVALUATOR           │    Honest Scoring (criticalGatePassed Rule)
     └────────────────────────┘
                 │ (Quality Metrics & Vulnerabilities)
                 ▼
     ┌────────────────────────┐
     │ 4. VERSION REFINEMENT  │ ── Prompt Version Bar, Linier Diff, Multi-User
     │    & STORAGE           │    SQLite WAL Mode (0% SQLITE_BUSY)
     └────────────────────────┘
```

1. **Crawler Grounding**: Pengguna mengimpor spesifikasi teknis dari web atau berkas mentah GitHub. Engine memverifikasi keamanan URL terhadap serangan SSRF dan menyensor rahasia (API key/token) sebelum mengekstraksi teks relevan.
2. **Engine Optimizer**: Menganalisis kelemahan prompt asli dengan 8 taksonomi celah, menyuntikkan batasan teknis dari dokumen *grounding*, dan menghasilkan versi prompt berstruktur tinggi.
3. **Spider Matrix Evaluator**: Menjalankan matriks pengujian adversarial secara paralel dengan pembatasan konkurensi (Semaphore cap: 2) terhadap 5 cabang kasus (Happy Path, Edge Case, Injection, Format Strictness, Typo Tolerance).
4. **Version Refinement & Storage**: Menyimpan hasil pengujian dan versi prompt ke database SQLite WAL mode, menampilkan komparasi pada Prompt Version Bar, serta merekomendasikan perbaikan lanjutan.

---

## 🏗️ 1. Arsitektur Modular Monolith (8 Packages Workspace)

Repositori ini menggunakan arsitektur **Modular Monolith** berbasis `npm workspaces` dengan 8 package terisolasi:

```text
prompt-workspace/
├── apps/
│   └── web/                         # Next.js 15 (Turbopack, App Router, Tailwind CSS, shadcn/ui)
│       ├── src/app/api/             # Route handlers (/api/optimize, /api/history, /api/crawl, /api/spider)
│       ├── src/components/workspace/# Komponen UI (Crawler Modal, Spider Panel, Version Bar, Playground)
│       ├── src/lib/                 # Helper keamanan (session HMAC-SHA256, csrf, rate-limiter, feature-flags)
│       ├── scripts/                 # Suite pengujian integrasi & API (test-api.ts, test-e2e.ts)
│       └── tests/                   # Suite pengujian unit native (history-api.test.mjs)
│
├── packages/
│   ├── prompt-contracts/            # Single Source of Truth kontrak data Zod v2.0 (Crawler & Spider schemas)
│   ├── prompt-crawler/              # Engine Crawler (SSRF Guard, Fetcher, Redactor, Extractor)
│   ├── prompt-spider/               # Engine Spider (5-Branch Test Suite, Runner, Evaluator, Semaphore)
│   ├── prompt-engine/               # Core Engine (Analyzer, Optimizer, Evaluator, Closed-Loop Helper)
│   ├── provider-adapters/           # Multi-provider adapters (Groq, Gemini, OpenRouter, Ollama lokal)
│   ├── domain-rules/                # 5 Domain Rule Packs berversi (General, Coding, Debugging, Academic, Business)
│   └── database/                    # Prisma ORM, skema SQLite WAL v2.0, migrasi SQL, dan helper persistensi
│       ├── prisma/                  # schema.prisma, dev.db aktif, dan migration history
│       └── scripts/                 # Otomasi backup, restore, dan test persistence terisolasi
│
├── docs/                            # Dokumentasi arsitektur (ADR-001, ADR-002), Runbook SOP, Release Notes
├── scripts/                         # Otomasi audit kesiapan rilis (release-readiness-check.mjs) & tooling
├── test-fixtures/                   # Fixture baseline prompt terstandarisasi (PIW-BL-001 s/d 005)
├── CONTRIBUTING.md                  # Standar kontribusi, DoR, DoD, dan aturan PR
├── SECURITY.md                      # Kebijakan pelaporan kerentanan & SOP rotasi rahasia
├── .env.example                     # Templat konfigurasi environment multi-provider & v2.0 feature flags
└── package.json                     # Konfigurasi root monorepo workspaces
```

---

## ⚙️ 2. Prasyarat & Panduan Instalasi Lintas-OS (Windows & Linux)

### Prasyarat Sistem
- **Node.js**: Versi `>= 18.0.0` (Direkomendasikan Node.js LTS v20 atau v22).
- **npm**: Versi `>= 9.0.0`.
- **Google Chrome / Chromium / MS Edge**: Diperlukan untuk pengujian browser headless E2E.
- *(Opsional)* **Ollama**: Jika ingin menjalankan model LLM secara lokal/offline.

### Langkah Instalasi
1. **Clone Repositori**:
   ```bash
   git clone https://github.com/Kal215/prompt-workspace.git
   cd prompt-workspace
   ```

2. **Pasang Seluruh Dependensi Monorepo**:
   ```bash
   npm install
   ```

3. **Inisialisasi Database SQLite & Client**:
   ```bash
   npm run build --workspace=@prompt-workspace/database
   ```

4. **Konfigurasi Environment Variables**:
   Salin file `.env.example` menjadi `.env` di root workspace:
   ```bash
   cp .env.example .env      # Linux / macOS / Git Bash
   copy .env.example .env    # Windows Command Prompt
   ```

---

## 🔐 3. Konfigurasi Environment (`.env`)

| Variabel | Keterangan & Tujuan | Nilai Default / Contoh | Wajib / Opsional |
|:---|:---|:---|:---:|
| `GROQ_API_KEY_1` s/d `GROQ_API_KEY_6` | Kunci API Groq untuk pool rotasi round-robin | `gsk_...` | **Wajib** (Min. 1 kunci) |
| `GROQ_MODEL` | Model default Groq | `llama-3.3-70b-versatile` | Opsional |
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` | Kunci API Google Gemini (koma terpisah) | `AIzaSy...` | Opsional |
| `OPENROUTER_API_KEY` | Kunci API OpenRouter untuk katalog model global | `sk-or-v1-...` | Opsional |
| `OLLAMA_BASE_URL` | URL server Ollama lokal | `http://127.0.0.1:11434` | Opsional |
| `DATABASE_URL` | Path koneksi SQLite | `file:./packages/database/prisma/dev.db` | **Wajib** |
| `SESSION_SECRET` | Kunci rahasia HMAC-SHA256 (Minimal 32 karakter) | String acak 32+ char | **Wajib di Produksi** |
| `TRUST_PROXY` | Aktifkan jika berada di balik reverse proxy | `0` (atau `1`) | Opsional |
| `ALLOWED_ORIGINS` | Daftar origin yang diizinkan untuk CSRF | `https://domain-resmi.com` | Opsional |
| **`NEXT_PUBLIC_ENABLE_CRAWLER`** | Feature flag & kill-switch instan modul Crawler | `true` | Opsional (Default: `true`) |
| **`NEXT_PUBLIC_ENABLE_SPIDER`** | Feature flag & kill-switch instan modul Spider | `true` | Opsional (Default: `true`) |
| **`CRAWLER_MAX_BYTES`** | Batas maksimum muatan dokumen crawler (byte) | `524288` (512 KB) | Opsional |
| **`SPIDER_MAX_CASES`** | Jumlah maksimum cabang kasus uji Spider | `5` | Opsional |
| **`SPIDER_CONCURRENCY`** | Batas konkurensi Semaphore eksekusi cabang Spider | `2` | Opsional |

---

## 🚀 4. Daftar Perintah Kerja & Pengujian Monorepo (Scripts)

| Perintah | Deskripsi |
|:---|:---|
| **`npm run test:v2-engines`** | **Menjalankan seluruh 4 test suite engine v2.0 (Contracts, Crawler, Spider, Closed-Loop)** |
| `npm run test:contracts` | Menguji validasi skema Zod v2.0 pada `@prompt-workspace/prompt-contracts` |
| `npm run test:crawler` | Menguji SSRF Guard, Secret Redaction, dan Content Extraction pada Crawler |
| `npm run test:spider` | Menguji Semaphore konkurensi (<= 2), aturan `criticalGatePassed`, dan persistensi SQLite WAL |
| `npm run test:closed-loop`| Menguji alur sintesis tertutup dari Grounding hingga Spider Matrix |
| `npm run dev --workspace=web` | Menjalankan Next.js development server pada `http://localhost:3000` |
| `npm run build` | Mengompilasi seluruh 8 workspace TypeScript dan Next.js production build |
| `npm run typecheck` | Menjalankan typecheck TypeScript di seluruh 8 workspace monorepo |
| `npm run lint --workspace=web` | Menjalankan verifikasi static analysis / ESLint pada kode web |
| `npm run test --workspace=@prompt-workspace/database` | Menjalankan uji persistensi database & WAL mode pada database terisolasi |
| `npm run test:unit --workspace=web` | Menjalankan 39 pengujian unit Vitest (komponen UI, feature-flags, modal) |
| `npm run test:api --workspace=web` | Menjalankan 79 asersi pengujian API nyata (termasuk `/api/crawl` dan `/api/spider`) |
| `npm run db:backup` | Membuat backup terenkapsulasi dari database aktif ke folder `backups/` |
| `npm run db:restore` | Memulihkan database dari file backup (mendukung flag `--target`) |
| `node scripts/release-readiness-check.mjs` | Menjalankan skrip audit kesiapan rilis otomatis Checklist Kelulusan P0 v2.0 |

---

## 🛡️ 5. Tata Kelola & Pertahanan Keamanan PIEW v2.0

1. **SSRF Guard & Network Defense-in-Depth**:
   - Blokade loopback (`127.0.0.1`), subnet privat (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Carrier-Grade NAT (`100.64.0.0/10`), Link-Local / Cloud Metadata (`169.254.169.254`), dan multicast/broadcast.
   - Whitelist protokol ketat (`http:`, `https:`), payload cap 512 KB, dan batas waktu 10 detik.

2. **Secret Redaction Otomatis**:
   - Pemindaian regex real-time menyensor kunci API (OpenAI, Anthropic, Groq, AWS, GitHub) dan data sensitif sebelum diproses oleh LLM.

3. **Perlindungan Anti-IDOR & Hak Milik Data**:
   - Seluruh record `SavedPrompt`, `PromptVersion`, `SpiderRun`, dan `CrawlSession` terikat ke `userId`.
   - Record historis `legacy_default_user` (termasuk 2 record produksi asli) diproteksi secara permanen (*read-only* bagi sesi umum).

4. **Aturan Kejujuran Metrik (*Honesty & Integrity Rule*)**:
   - `criticalGatePassed`: Wajib bernilai `false` jika salah satu cabang keamanan atau edge-case kritis gagal (*FAIL*), mengalami error teknis (*ERROR*), atau menghasilkan evaluasi ambigu (*INDETERMINATE*).

5. **Kill-Switch & Zero-Downtime Rollback**:
   - Feature flags `NEXT_PUBLIC_ENABLE_CRAWLER=false` dan `NEXT_PUBLIC_ENABLE_SPIDER=false` memungkinkan isolasi insiden dalam hitungan detik tanpa memutus layanan optimasi v1.0.

---

## 📄 6. Lisensi & Tata Kelola
Proyek ini dikembangkan di bawah lisensi resmi PIEW. Untuk kontribusi dan pelaporan celah keamanan, silakan merujuk ke [CONTRIBUTING.md](CONTRIBUTING.md) dan [SECURITY.md](SECURITY.md).
