# Prompt Intelligence Engineering Workspace (PIEW)
**Versi: v1.1.0 (General Availability)**

Prompt Intelligence Engineering Workspace (PIEW) adalah platform rekayasa prompt tingkat lanjut (*advanced prompt engineering*) yang mengimplementasikan metodologi **Preserve Intent**, **Analyze Before Optimize**, dan **Evidence Over Claims**. 

Platform ini mendiagnosis kelemahan prompt mentah pengguna secara terstruktur berdasarkan taksonomi 8 kategori celah, menginjeksi aturan domain terstandarisasi (5 Domain Packs), merekonstruksi prompt dengan teknik scaffolding profesional, mendukung multi-penyedia model AI (Groq, Gemini, OpenRouter, Ollama lokal), serta menyediakan **Target Model Execution Playground** untuk menguji prompt secara nyata sebelum digunakan di lingkungan produksi.

---

## 📚 Dokumentasi Cepat (Quick Links)

- 📖 [Panduan Pengguna Lengkap & FAQ (User Guide & FAQ)](docs/product/USER-GUIDE-AND-FAQ.md)
- 📋 [Checklist Kesiapan Rilis v1.1.0 (Release Checklist)](docs/operations/RELEASE-CHECKLIST-v1.1.0.md)
- 🚨 [Panduan Operasional & Penanganan Insiden (Runbook SOP)](docs/operations/RUNBOOK.md)
- 📝 [Catatan Rilis v1.1.0 (Release Notes)](docs/product/RELEASE-NOTES-v1.1.0.md)
- 🏛️ [Keputusan Arsitektur Sistem (ADR-001: Modular Monolith)](docs/architecture/ADR-001-modular-monolith-and-security.md)
- 📑 Decision Memos: [PDR-001 (Domain Packs)](docs/product/PDR-001-domain-packs-c1.md) | [PDR-002 (Multi-Provider)](docs/product/PDR-002-multi-provider-adapters-c2.md) | [PDR-003 (Target Model Playground)](docs/product/PDR-003-target-model-playground-c3.md)

---

## 🏗️ 1. Arsitektur Modular Monolith & Struktur Monorepo (6 Packages)

Repositori ini menggunakan arsitektur **Modular Monolith** berbasis `npm workspaces`. Seluruh pustaka logika bisnis inti diisolasi dari antarmuka pengguna (UI) agar memiliki independensi penuh, mudah diuji, dan dapat dipakai ulang lintas runtime.

```text
prompt-workspace/
├── apps/
│   └── web/                         # Next.js 16 (Turbopack, App Router, Tailwind CSS, shadcn/ui)
│       ├── src/app/api/             # Route handlers (/api/optimize, /api/history, /api/providers)
│       ├── src/components/workspace/# Komponen UI (Domain Selector, Provider Selector, Playground, Diff)
│       ├── src/lib/                 # Helper keamanan (session HMAC-SHA256, csrf, rate-limiter)
│       ├── scripts/                 # Suite pengujian integrasi & browser E2E (test-api.ts, test-e2e.ts)
│       └── tests/                   # Suite pengujian unit native (history-api.test.mjs)
│
├── packages/
│   ├── prompt-contracts/            # Single Source of Truth kontrak data & skema Zod (C1, C2, C3)
│   ├── prompt-engine/               # Core Engine (Analyzer, Optimizer, Evaluator, Playground, SafeLogger)
│   ├── provider-adapters/           # Multi-provider adapters (Groq, Gemini, OpenRouter, Ollama lokal)
│   ├── domain-rules/                # 5 Domain Rule Packs berversi (General, Coding, Debugging, Academic, Business)
│   └── database/                    # Prisma ORM, skema SQLite, migrasi SQL, dan helper persistensi
│       ├── prisma/                  # schema.prisma, dev.db aktif, dan migration history
│       └── scripts/                 # Otomasi backup, restore, dan test persistence terisolasi
│
├── docs/                            # Dokumentasi arsitektur, SOP operasional, PDR, dan release notes
├── scripts/                         # Otomasi audit kesiapan rilis (release-readiness-check.mjs)
├── test-fixtures/                   # Fixture baseline prompt terstandarisasi (PIW-BL-001 s/d 005)
├── .env.example                     # Templat konfigurasi environment multi-provider
└── package.json                     # Konfigurasi root monorepo workspaces
```

---

## 🌟 2. Fitur Utama Platform (Fitur C1, C2, C3)

### 2.1 Fitur C1: 5 Domain Rule Packs Berversi (`@prompt-workspace/domain-rules`)
- **General**: Scaffolding fleksibel untuk aneka kebutuhan percakapan dan penulisan umum.
- **Coding**: Standar clean code, penanganan edge cases, validasi tipe, dan pembatasan halusinasi library.
- **Debugging**: Metodologi diagnosis akar masalah (*Root Cause Analysis*), isolasi hipotesis, dan langkah reproduksi.
- **Academic Writing**: Nada formal, metodologi ilmiah, dan larangan mengarang sitasi/paper (*strict citation guard*).
- **Business Strategy**: Kerangka kerja MECE/SWOT, rekomendasi berbasis metrik terukur, dan analisis risiko operasional.

### 2.2 Fitur C2: Multi-Provider Adapters & Zero-Secret Registry (`@prompt-workspace/provider-adapters`)
- **Groq (Default)**: Rotasi 6 API key otomatis (*multi-key pool*) dengan failover model dinamis untuk latensi ultra-rendah.
- **Google Gemini**: Integrasi native REST API Gemini (`gemini-2.5-flash`), mode JSON, dan multi-key pool.
- **OpenRouter**: Akses katalog model global standar OpenAI (`meta-llama/llama-3.3-70b-instruct`, dll.).
- **Ollama Lokal**: Eksekusi offline 100% lokal di mesin sendiri (`http://127.0.0.1:11434`, model `llama3.2`).
- **Zero-Secret Leakage**: Kunci API tidak pernah dibocorkan ke browser; endpoint `/api/providers` hanya mengekspos status boolean `configured: true/false`.

### 2.3 Fitur C3: Target Model Execution Playground (`@prompt-workspace/prompt-engine`)
- **Smart Placeholder Resolver**: Deteksi otomatis variabel `[MASUKKAN_...]` dan `{{...}}`, kebal terhadap false-positive indeks kode `[0]`, `[1]`, `[index]`, serta pelaporan transparan `unresolvedPlaceholders`.
- **Test Case Input Injection**: Lampirkan data kasus uji konkret di bawah blok isolasi khusus.
- **Nondeterminism Mitigation**: Pengaturan temperature rendah (default `0.3`), batas output (default `1024` token), dan penjelasan probabilistik model generatif.

---

## ⚙️ 3. Prasyarat & Panduan Instalasi Lintas-OS (Windows & Linux)

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

## 🔐 4. Konfigurasi Environment (`.env`)

| Variabel | Keterangan | Wajib / Opsional |
|:---|:---|:---:|
| `GROQ_API_KEY_1` s/d `GROQ_API_KEY_6` | Kunci API Groq untuk round-robin rotation pool | **Wajib** (Min. 1 kunci) |
| `GROQ_MODEL` | Model default Groq (`llama-3.3-70b-versatile`) | Opsional |
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` | Kunci API Google Gemini (mendukung koma terpisah) | Opsional |
| `OPENROUTER_API_KEY` | Kunci API OpenRouter untuk model global | Opsional |
| `OLLAMA_BASE_URL` | URL server Ollama lokal (`http://127.0.0.1:11434`) | Opsional |
| `DATABASE_URL` | Path koneksi SQLite (`file:./packages/database/prisma/dev.db`) | **Wajib** |
| `SESSION_SECRET` | Kunci rahasia HMAC-SHA256 (Minimal 32 karakter acak) | **Wajib di Produksi** |
| `TRUST_PROXY` | Set ke `1` atau `true` jika berada di balik reverse proxy | Opsional (Default: `0`) |
| `ALLOWED_ORIGINS` | Daftar origin yang diizinkan untuk CSRF (koma terpisah) | Opsional |

---

## 🚀 5. Daftar Perintah Kerja (Scripts)

| Perintah | Deskripsi |
|:---|:---|
| `npm run dev --workspace=web` | Menjalankan Next.js development server pada `http://localhost:3000` |
| `npm run build` | Mengompilasi seluruh 6 workspace TypeScript dan Next.js production build |
| `npm run typecheck` | Menjalankan typecheck TypeScript di seluruh 6 workspace monorepo |
| `npm run lint --workspace=web` | Menjalankan verifikasi static analysis / ESLint pada kode web |
| `npm run test --workspace=@prompt-workspace/prompt-engine` | Menjalankan 18 pengujian unit Playground Engine & Placeholder Resolver |
| `npm run test --workspace=@prompt-workspace/provider-adapters` | Menjalankan 23 pengujian kontrak provider adapters & error normalization |
| `npm run test --workspace=@prompt-workspace/domain-rules` | Menjalankan 155 asersi pengujian 5 domain rule packs berversi |
| `npm run test --workspace=@prompt-workspace/database` | Menjalankan uji persistensi database & otorisasi multi-user pada temp DB |
| `npm run test:unit --workspace=web` | Menjalankan 22 pengujian unit route handler via native `node:test` |
| `npm run test:api --workspace=web` | Menjalankan 50 asersi pengujian API nyata pada database SQLite terisolasi |
| `npm run test:e2e --workspace=web` | Menjalankan browser E2E headless nyata (Chrome/Edge) dengan mock deterministik |
| `npm run db:backup` | Membuat backup terenkapsulasi dari database aktif ke folder `backups/` |
| `npm run db:restore` | Memulihkan database dari file backup (mendukung flag `--target`) |
| `node scripts/release-readiness-check.mjs` | Menjalankan skrip audit kesiapan rilis otomatis publik v1.1.0 |

---

## 🛡️ 6. Fitur Keamanan yang Telah Aktif

1. **Otorisasi & Data Ownership Per-Record**:
   - Mencegah kerentanan **IDOR (Insecure Direct Object Reference)**.
   - Setiap record `SavedPrompt` diikat ke `userId`. Pengguna hanya dapat membaca dan menghapus prompt milik mereka sendiri.
   - Record historis (`legacy_default_user`) diproteksi menjadi *read-only* bagi pengguna umum.

2. **Signed HttpOnly Session Identity (`piw_session`)**:
   - Zero-friction UX untuk pengguna: browser otomatis menerima signed identity pada kunjungan pertama tanpa login manual.
   - Cookie ditandatangani menggunakan HMAC-SHA256 di sisi server. Cookie tanpa tanda tangan sah otomatis ditolak dengan `401 Unauthorized`.

3. **Perlindungan CSRF Berlapis (Fail-Closed)**:
   - Request mutasi (`POST`, `DELETE`) tanpa header `Origin` atau `Referer` langsung ditolak dengan `403 Forbidden`.
   - Validasi ketat membandingkan origin dengan host aplikasi yang sah.

4. **Rate Limiting Modular (Sliding Window)**:
   - Terpasang pada `/api/optimize` dan `/api/history` untuk mencegah flooding database dan pengurasan kuota LLM.
   - Mengembalikan status **HTTP 429 Too Many Requests**, header `Retry-After: <detik>`, serta payload error bersih tanpa kebocoran memori.

5. **Penanganan Konkurensi & Idempotensi (Prisma P2002)**:
   - Request paralel dengan ID dan payload identik ditangani secara idempotent (**HTTP 200/201**).
   - Request bertabrakan dengan ID sama tetapi payload berbeda ditolak dengan **HTTP 409 Conflict**.

6. **Zero-Leakage Safe Logging & Secret Redaction**:
   - Modul `SafeLogger` melakukan sanitasi otomatis. Kunci API Groq, OpenAI, Google Gemini, OpenRouter, dan token Bearer disensor otomatis menjadi `[REDACTED_API_KEY]`.
   - Isi prompt asli pengguna tidak dicatat ke terminal atau log server operasional permanen (Blueprint Bagian 3: Data Minimization).

---

## 📄 7. Lisensi
Hak Cipta © 2026 Prompt Intelligence Engineering Workspace. Seluruh hak cipta dilindungi undang-undang.
