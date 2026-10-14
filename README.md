# Prompt Intelligence Engineering Workspace (PIEW)
**Versi: v1.0.0-mvp**

Prompt Intelligence Engineering Workspace (PIEW) adalah platform rekayasa prompt tingkat lanjut (advanced prompt engineering) yang mengimplementasikan metodologi **Preserve Intent**, **Analyze Before Optimize**, dan **Evidence Over Claims**. 

Aplikasi ini mendiagnosis kelemahan prompt mentah pengguna secara terstruktur berdasarkan taksonomi 8 kategori celah, merekonstruksi prompt menjadi versi berstandar industri dengan teknik scaffolding profesional, dan mengevaluasi kualitas hasil secara objektif menggunakan auditor independen (*LLM-as-a-Judge*).

---

## 🏗️ 1. Arsitektur Modular Monolith & Struktur Monorepo

Repositori ini menggunakan arsitektur **Modular Monolith** berbasis `npm workspaces`. Seluruh pustaka logika bisnis inti diisolasi dari antarmuka pengguna (UI) agar memiliki independensi penuh, mudah diuji, dan dapat dipakai ulang lintas runtime.

```text
prompt-workspace/
├── apps/
│   └── web/                         # Next.js 16 (Turbopack, App Router, Tailwind CSS, shadcn/ui)
│       ├── src/app/api/             # Route handlers (/api/optimize, /api/history)
│       ├── src/components/workspace/# Komponen interaktif (Diff Viewer, Intent Guard, Findings Panel)
│       ├── src/lib/                 # Helper keamanan (session, csrf, rate-limiter)
│       ├── scripts/                 # Suite pengujian integrasi & browser E2E (test-api.ts, test-e2e.ts)
│       └── tests/                   # Suite pengujian unit native (history-api.test.mjs)
│
├── packages/
│   ├── prompt-contracts/            # Single Source of Truth untuk kontrak data & skema Zod
│   ├── prompt-engine/               # Core Pipeline (Analyzer, Optimizer, Evaluator, SafeLogger)
│   ├── provider-adapters/           # Multi-provider LLM adapters (Groq Multi-Key Pool & OpenAI)
│   └── database/                    # Prisma ORM, skema SQLite, migrasi SQL, dan helper persistensi
│       ├── prisma/                  # schema.prisma, dev.db aktif, dan migration history
│       └── scripts/                 # Otomasi backup, restore, dan test persistence terisolasi
│
├── docs/                            # Dokumentasi arsitektur (ADR), runbook, dan release notes
├── test-fixtures/                   # Fixture baseline prompt terstandarisasi (PIW-BL-001 s/d 005)
├── .env.example                     # Templat konfigurasi environment lintas-platform
└── package.json                     # Konfigurasi root monorepo workspaces
```

---

## ⚙️ 2. Prasyarat & Panduan Instalasi Lintas-OS (Windows & Linux)

### Prasyarat Sistem
- **Node.js**: Versi `>= 18.0.0` (Direkomendasikan Node.js LTS v20 atau v22).
- **npm**: Versi `>= 9.0.0`.
- **Google Chrome / Chromium / MS Edge**: Diperlukan untuk menjalankan pengujian browser headless E2E.

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

Aplikasi menggunakan pool rotasi 6 kunci API Groq untuk memastikan ketersediaan tinggi dan kontinuitas proses optimasi tanpa terhenti oleh limit kuota:

| Variabel | Keterangan | Wajib / Opsional |
|:---|:---|:---:|
| `GROQ_API_KEY_1` s/d `GROQ_API_KEY_6` | Kunci API Groq untuk round-robin rotation pool | **Wajib** (Min. 1 kunci) |
| `GROQ_MODEL` | Model default Groq (`llama-3.3-70b-versatile`) | Opsional |
| `OPENAI_API_KEY` | Kunci baseline alternatif OpenAI | Opsional |
| `DATABASE_URL` | Path koneksi SQLite (`file:./packages/database/prisma/dev.db`) | **Wajib** |
| `SESSION_SECRET` | Kunci rahasia HMAC-SHA256 (Minimal 32 karakter acak) | **Wajib di Produksi** |
| `TRUST_PROXY` | Set ke `1` atau `true` jika berada di balik reverse proxy | Opsional (Default: `0`) |
| `ALLOWED_ORIGINS` | Daftar origin yang diizinkan untuk CSRF (koma terpisah) | Opsional |

---

## 🚀 4. Daftar Perintah Kerja (Scripts)

| Perintah | Deskripsi |
|:---|:---|
| `npm run dev --workspace=web` | Menjalankan Next.js development server pada `http://localhost:3000` |
| `npm run build` | Mengompilasi seluruh package TypeScript dan Next.js production build |
| `npm run typecheck` | Menjalankan typecheck TypeScript di seluruh 5 workspace monorepo |
| `npm run lint --workspace=web` | Menjalankan verifikasi static analysis / ESLint pada kode web |
| `npm run test --workspace=@prompt-workspace/database` | Menjalankan uji persistensi database & otorisasi pada temporary DB |
| `npm run test:unit --workspace=web` | Menjalankan 22 pengujian unit route handler via native `node:test` |
| `npm run test:api --workspace=web` | Menjalankan 44 asersi pengujian API nyata pada database SQLite terisolasi |
| `npm run test:e2e --workspace=web` | Menjalankan browser E2E headless nyata (Chrome/Edge) dengan mock deterministik |
| `npm run test:harness` | Menjalankan evaluasi pipeline QA audit terhadap 5 baseline fixture |
| `npm run db:backup` | Membuat backup terenkapsulasi dari database aktif ke folder `backups/` |
| `npm run db:restore` | Memulihkan database dari file backup (mendukung flag `--target`) |

---

## 🛡️ 5. Fitur Keamanan yang Telah Aktif

1. **Otorisasi & Data Ownership Per-Record**:
   - Mencegah kerentanan **IDOR (Insecure Direct Object Reference)**.
   - Setiap record `SavedPrompt` diikat ke `userId`. Pengguna hanya dapat membaca dan menghapus prompt milik mereka sendiri.
   - Record historis (`legacy_default_user`) diproteksi menjadi *read-only* bagi pengguna umum.

2. **Signed HttpOnly Session Identity (`piw_session`)**:
   - Zero-friction UX untuk pengguna MVP: browser otomatis menerima signed identity pada kunjungan pertama tanpa login manual.
   - Cookie ditandatangani menggunakan HMAC-SHA256 di sisi server. Cookie manipulasi / tanpa tanda tangan sah otomatis ditolak dengan `401 Unauthorized`.

3. **Perlindungan CSRF Berlapis (Fail-Closed)**:
   - Request mutasi (`POST`, `DELETE`) tanpa header `Origin` atau `Referer` langsung ditolak dengan `403 Forbidden`.
   - Validasi ketat membandingkan origin dengan host aplikasi yang sah.

4. **Rate Limiting Modular (Sliding Window)**:
   - Terpasang pada `/api/optimize` dan `/api/history` untuk mencegah flooding database dan pengurasan kuota LLM.
   - Mengembalikan status **HTTP 429 Too Many Requests**, header `Retry-After: <detik>`, serta payload error bersih tanpa kebocoran memori.

5. **Penanganan Konkurensi & Idempotensi (Prisma P2002)**:
   - Request paralel dengan ID dan payload identik ditangani secara idempotent (**HTTP 200/201**).
   - Request bertabrakan dengan ID sama tetapi payload berbeda ditolak dengan **HTTP 409 Conflict**.

6. **Zero-Leakage Safe Logging**:
   - Modul `SafeLogger` melakukan sanitasi otomatis. Isi prompt asli pengguna, API key, token, dan stack trace internal server **dilarang keras** dicetak ke terminal atau log publik.

---

## 📄 6. Lisensi
Hak Cipta © 2026 Prompt Intelligence Engineering Workspace. Seluruh hak cipta dilindungi undang-undang.
