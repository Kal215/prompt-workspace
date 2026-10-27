# Release Checklist & Kesiapan Peluncuran v1.1.0 (Stage 6)
**Prompt Intelligence Engineering Workspace (PIEW)**  
**Versi Target**: `v1.1.0`  
**Tanggal Evaluasi**: 14 Oktober 2026  
**Status Kelulusan**: ✅ **READY FOR PUBLIC RELEASE (DISPASI PENUH G0 - G6)**  

Dokumen ini adalah bukti kepatuhan formal terhadap Blueprint v1.0 Bagian 12, Bagian 17.3 (*Stage Gates G0 - G6*), dan Bagian 22 (*Checklist Peluncuran Sebelum & Sesudah Rilis*).

---

## 🏛️ 1. Matriks Kelulusan Gerbang Tahap (Stage Gates G0 – G6)

| Gerbang | Nama Gerbang | Kriteria Kelulusan Utama | Bukti & Artefak Validasi | Status |
|:---:|:---|:---|:---|:---:|
| **G0** | **Spesifikasi & Kontrak** | Kontrak data Zod tervalidasi, taksonomi 8 celah, dan arsitektur monorepo beku. | `packages/prompt-contracts/src/index.ts`, `ADR-001`, `PR #1`, `PR #3` | ✅ PASS |
| **G1** | **Multi-Key Pool & Baseline** | Rotasi 6 API key Groq, failover model dinamis, 5 baseline fixture prompt. | `packages/provider-adapters/src/groq-adapter.ts`, `test-fixtures/baseline-prompts.json` | ✅ PASS |
| **G2** | **Engine Pipeline & Telemetri** | Pipeline Analyzer, Optimizer, SafeLogger redaksi kredensial, telemetri latency/token. | `packages/prompt-engine/src/`, `PR #5`, `PR #7`, PDR-001 | ✅ PASS |
| **G3** | **LLM-as-a-Judge & Database** | Evaluator QA auditor independen, Prisma SQLite, isolasi data multi-user, backup/restore. | `packages/database/`, `test-db.ts`, `backup-db.ts`, `dev.db` (2 record aktif) | ✅ PASS |
| **G4** | **Security Hardening & Web MVP** | CSRF guard, sliding-window rate limiter, session HMAC-SHA256, UI diff, E2E browser. | `apps/web/src/lib/`, `test-api.ts`, `test-e2e.ts`, `RELEASE-NOTES-v1.0.0-mvp.md` | ✅ PASS |
| **G5** | **Ekspansi Fitur Lanjutan (C1, C2, C3)** | 5 Domain Packs berversi (C1), Multi-Provider Adapter (C2), Target Model Playground (C3). | `@prompt-workspace/domain-rules`, `@prompt-workspace/provider-adapters`, `playground.ts` | ✅ PASS |
| **G6** | **Kesiapan Rilis Publik & Operasional** | Dokumentasi pengguna lengkap, FAQ, runbook insiden multi-provider, skrip audit otomatis. | `USER-GUIDE-AND-FAQ.md`, `RELEASE-CHECKLIST-v1.1.0.md`, `release-readiness-check.mjs` | ✅ PASS |

---

## 📋 2. Checklist Verifikasi Pra-Peluncuran (Pre-Release Checklist)

### 2.1 Verifikasi Kontrak & Kualitas Kode
- [x] **Monorepo Typecheck**: `npm run typecheck` mengembalikan **0 error** di seluruh 6 workspace (`web`, `database`, `domain-rules`, `prompt-contracts`, `prompt-engine`, `provider-adapters`).
- [x] **Linting & Code Quality**: Linter Next.js dan ESLint lulus tanpa pelanggaran aturan kritis.
- [x] **Domain Rules Unit Test**: 155/155 asersi lulus (General, Coding, Debugging, Academic Writing, Business Strategy).
- [x] **Provider Adapters Contract Test**: 23/23 skenario lulus menguji kontrak 4 provider (Groq, Gemini, OpenRouter, Ollama) dan error normalization (HTTP 401, 403, 429, 500, 503, timeout, JSON rusak).
- [x] **Playground & Placeholder Engine Test**: 18/18 skenario lulus menguji ekstraksi placeholder kurung siku dan mustache, resolusi variabel, isolasi testInput, dan mock runner.
- [x] **Database Isolation & Persistence Test**: Pengujian CRUD dan pembatasan isolasi multi-user berhasil pada database sementara.
- [x] **Web Unit Test Runner**: 22/22 subtest lulus menggunakan runner native `node:test`.
- [x] **Web API Regression Test**: 50/50 asersi sukses menguji CSRF, Rate Limiting, P2002 race handling, Capabilities, dan History isolation.
- [x] **E2E Browser Test**: Pengujian headless browser Chromium/Puppeteer berjalan deterministik dan lulus 100%.
- [x] **Monorepo Production Build**: Kompilasi Next.js 16 (Turbopack) dan seluruh library TypeScript sukses tanpa peringatan fatal.

### 2.2 Verifikasi Keamanan, Privasi & Secret Governance
- [x] **Zero-Secret Leakage di Git**:
  - File `.env` terdaftar pada `.gitignore` dan **TIDAK PERNAH** di-track oleh Git.
  - Direktori `packages/database/backups/` dan file `*.db` terdaftar di `.gitignore`.
  - Tidak ada string kunci API telanjang (`gsk_...`, `sk-...`, `AIzaSy...`, `sk-or-...`) yang ter-commit ke dalam repositori.
- [x] **SafeLogger Redaction**: Pola kunci API Groq, OpenAI, Google Gemini, OpenRouter, serta token Bearer disensor otomatis menjadi `[REDACTED_API_KEY]`. Isi prompt mentah pengguna tidak dicatat ke log server permanen.
- [x] **Proteksi Web Backend**:
  - Validasi CSRF fail-closed pada seluruh request mutasi (POST, DELETE).
  - Sliding-window rate limiter per-IP aktif pada endpoint `/api/optimize` dan `/api/history`.
  - Sesi cookie ditandatangani secara kriptografis menggunakan HMAC-SHA256 dengan fail-fast di production jika `SESSION_SECRET < 32` karakter.
- [x] **Perlindungan Data Aktif Database (`dev.db`)**:
  - Dua record aktif asli (`397d6e10-afc1-4cb7-943f-1117e66641ce` dan `82224252-4cde-47ed-a489-ad76bbc659cf`) tetap terlindungi, ter-backfill dengan `userId = 'legacy_default_user'`, dan tidak pernah di-reset.
  - Prosedur backup (`npm run db:backup`) dan restore (`npm run db:restore`) teruji non-destruktif.

---

## 🚀 3. Prosedur Peluncuran & Smoke Test Pasca-Rilis (Post-Release)

### 3.1 Langkah Deployment Produksi
1. Pastikan commit HEAD branch `main` berada pada status verifikasi bersih.
2. Setup environment produksi dengan variabel wajib:
   ```bash
   NODE_ENV="production"
   SESSION_SECRET="<string-acak-panjang-minimal-32-karakter>"
   GROQ_API_KEY_1="gsk_..."
   DATABASE_URL="file:./packages/database/prisma/dev.db"
   ALLOWED_ORIGINS="https://domain-produksi-resmi.com"
   ```
3. Bangun artefak produksi:
   ```bash
   npm run build
   ```
4. Jalankan script audit kesiapan rilis otomatis:
   ```bash
   node scripts/release-readiness-check.mjs
   ```

### 3.2 Langkah Smoke Test Fungsional di Produksi
Setelah server berjalan, operator melakukan verifikasi langsung (smoke test):
1. **Pemeriksaan Health & Capabilities**:
   - Akses `GET /api/providers`.
   - Pastikan response mengembalikan status `200 OK` dengan metadata 4 provider tanpa kebocoran secret.
2. **Uji Optimasi End-to-End**:
   - Kirimkan satu prompt uji sederhana dengan memilih domain *Coding* dan provider *Groq*.
   - Verifikasi kartu Intent Guard tampil, taksonomi temuan muncul, dan prompt teroptimasi tersaji dengan diff.
3. **Uji Target Model Playground**:
   - Buka tab Playground pada prompt teroptimasi, isi nilai variabel placeholder dummy, dan jalankan eksekusi model.
   - Verifikasi respons nyata diterima dan catatan nondeterminism muncul.
4. **Uji Simpan & Riwayat**:
   - Simpan hasil prompt ke riwayat, muat ulang daftar riwayat, dan pastikan item tersimpan dengan benar.

---

## ⚠️ 4. Kriteria Rollback & Prosedur Tanggap Darurat

Jika salah satu kondisi pemicu (*rollback triggers*) berikut terpenuhi dalam 60 menit pertama pasca-peluncuran, operator wajib menginisiasi prosedur pemulihan:

| Trigger Pembalikan (Rollback Trigger) | Ambang Batas Kegagalan | Tindakan |
|:---|:---|:---|
| **API Error Spike** | Tingkat error 5xx pada `/api/optimize` > 5% selama 5 menit berturut-turut | Beralih ke cadangan backup / rollback release commit |
| **All-Provider Outage** | Seluruh kunci API Groq, Gemini, dan OpenRouter mengalami 429/503 | Aktifkan fallback darurat atau arahkan pengguna ke Ollama lokal |
| **Database Corruption** | SQLite dev.db mengembalikan error `database disk image is malformed` | Jalankan `npm run db:restore` dari backup snapshot terdekat |
| **Intent Inversion Bug** | Lebih dari 3 laporan di mana Optimizer membalikkan maksud esensial user | Revert commit ke tag rilis sebelumnya |

---

## 👥 5. Tanda Tangan & Persetujuan Kesiapan Rilis

- **Lead Engineer**: Muhammad Riskal Fadhilla ✅ **APPROVED**
- **Quality & Security Reviewer**: Automated SDLC Gate Auditor ✅ **APPROVED**
- **Product Owner**: Project Leader ✅ **ACCEPTED FOR RELEASE**
- **Keputusan**: **RELEASE READY FOR PRODUCTION (v1.1.0)**
