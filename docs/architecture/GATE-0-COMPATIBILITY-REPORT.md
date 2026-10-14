# Laporan Audit Kompatibilitas Gate 0: Kesiapan Fondasi PIEW v2.0
**Prompt Intelligence Engineering Workspace (PIEW)**  
**Tanggal**: 14 Oktober 2026  
**Status**: Selesai (Passed / Ready for Gate 1)  
**Tujuan**: Memetakan fakta implementasi v1.0 aktual terhadap spesifikasi rancangan v2.0 untuk menjamin 0% regresi dan backward compatibility 100%.

---

## 1. Ringkasan Eksekutif

Audit komprehensif terhadap repositori `Kal215/prompt-workspace` pada HEAD commit `2f609c57018196c101fde6684c4fea1da20627af` (pasca-rilis v1.1.0) menunjukkan bahwa fondasi monorepo berada dalam kondisi sehat dan stabil.

Semua pengujian v1.0 (57 API assertions, 26 web unit tests, 18 playground tests, 23 provider adapter tests, 155 domain rule assertions, dan typecheck di 6 workspace) berjalan dengan exit code 0.

Dua record aktif pengguna di `packages/database/prisma/dev.db` (`397d6e10-afc1-4cb7-943f-1117e66641ce` dan `82224252-4cde-47ed-a489-ad76bbc659cf` milik `legacy_default_user` dengan skor 95) terverifikasi utuh dan terlindungi.

---

## 2. Tabel Pemetaan & Perbandingan: Kondisi Aktual v1.0 vs Rancangan v2.0

### 2.1. Skema Database `packages/database/prisma/schema.prisma`

| Entitas / Atribut | Kondisi Aktual v1.0 | Rancangan Awal Draft v2.0 | Penyesuaian Wajib v2.0 (Gate 1) | Alasan Teknis |
|:---|:---|:---|:---|:---|
| **Model Utama** | `SavedPrompt` | `SavedPrompt` | **Pertahankan `SavedPrompt`** | Model inti aktif |
| **Kolom Prompt Asli** | `originalPrompt` (String) | *sering disalahpahami sebagai `rawPrompt`* | **WAJIB `originalPrompt`** | Mencegah kerusakan relasi API v1.0 |
| **Kolom Prompt Optimasi** | `optimizedPrompt` (String) | `optimizedPrompt` | **Pertahankan `optimizedPrompt`** | Konsisten dengan kontrak output |
| **Kolom Ringkasan Intent** | `intentSummary` (String?) | `intentSummary` | **Pertahankan `intentSummary`** | Opsional string |
| **Kolom Nilai Evaluasi** | `score` (Int) | *sering disalahpahami sebagai `overallScore`* | **WAJIB `score`** | Mencegah error tipe dan query Prisma |
| **Kolom Identitas Pengguna** | `userId` (String, default "legacy_default_user") | `userId` | **Pertahankan `userId`** | Fondasi otorisasi IDOR |
| **Kolom Waktu Dibuat** | `createdAt` (DateTime @default(now())) | `createdAt` | **Pertahankan `createdAt`** | Di SQLite tersimpan sebagai timestamp |
| **Relasi Tambahan v2.0** | Tidak ada | `versions`, `crawlerSource` | **Tambahkan secara Additive (Opsional)** | `versions PromptVersion[]`, `crawlerSource CrawlerSource?` |

---

### 2.2. Ekspor Fungsi Helper `@prompt-workspace/database` (`packages/database/src/index.ts`)

| Simbol / Fungsi | Tipe / Signature Aktual v1.0 | Status di v2.0 | Catatan Integrasi |
|:---|:---|:---|:---|
| `getDatabaseUrl()` | `(): string` | **Tetap Aktif** | Mendukung Windows drive path, absolute Linux path, dan relative file URL |
| `setDatabaseUrl(url)` | `(url: string): void` | **Tetap Aktif** | Digunakan pada pengujian database isolasi |
| `prisma` | `Proxy<PrismaClient>` | **Tetap Aktif** | Dynamic proxy yang otomatis me-reinit client saat DATABASE_URL berubah |
| `savePrompt(data)` | `(data: SavePromptInput): Promise<SavedPrompt>` | **Tetap Aktif** | Menerima `originalPrompt`, `optimizedPrompt`, `score`, `intentSummary`, `userId` |
| `getHistory(limit, userId)` | `(limit?: number, userId?: string): Promise<SavedPrompt[]>` | **Tetap Aktif** | Filter isolasi per user + legacy_default_user |
| `getPromptById(id)` | `(id: string): Promise<SavedPrompt \| null>` | **Tetap Aktif** | Digunakan di `/api/history` |
| `deletePrompt(id, userId)` | `(id: string, userId?: string): Promise<SavedPrompt>` | **Tetap Aktif** | Memblokir penghapusan record lintas pengguna dan read-only legacy |
| **Fungsi Baru v2.0** | *Belum ada* | **Dibuat di Gate 1** | `savePromptVersion()`, `getPromptVersions()`, `saveSpiderRun()`, `saveCrawlerSource()` |

---

### 2.3. Ekspor Kontrak Zod `@prompt-workspace/prompt-contracts` (`packages/prompt-contracts/src/index.ts`)

| Kategori Kontrak | Daftar Skema & Tipe Aktual v1.0 | Rencana Tambahan v2.0 (Gate 1) |
|:---|:---|:---|
| **Providers** | `ProviderIdEnum`, `ProviderIdSchema`, `ProviderCapabilitySchema`, `ProviderId`, `ProviderCapability` | Tambahkan kapabilitas crawler/spider jika dibutuhkan |
| **Optimization Request** | `PromptOptimizationRequestSchema`, `PromptOptimizationRequest` | Pertahankan; tidak boleh ada breaking changes |
| **Findings & Analysis** | `FindingCategoryEnum`, `FindingCategorySchema`, `FindingSeveritySchema`, `FindingSchema`, `AppliedDomainRuleSchema`, `PromptAnalysisSchema`, `PromptMetadataSchema` | Taksonomi 8 kategori tetap menjadi baseline temuan |
| **Evaluation & Result** | `OptimizationEvaluationSchema`, `PromptOptimizationResultSchema`, `OptimizationEvaluation`, `PromptOptimizationResult` | Output pipeline kanonis v1.0 |
| **Playground Execution (C3)** | `PromptPlaceholderValuesSchema`, `PromptExecutionParametersSchema`, `PromptExecutionRequestSchema`, `PromptExecutionResultSchema` | Akan digunakan oleh Prompt Spider sebagai dasar runner kasus uji |
| **Kontrak Baru v2.0** | *Belum ada* | `CrawlerIngestRequestSchema`, `CrawlerResultSchema`, `SpiderTestCaseSchema`, `SpiderRunRequestSchema`, `SpiderRunResultSchema`, `PromptVersionSchema` |

---

### 2.4. LLM Provider Adapters & Prompt Engine (`packages/provider-adapters` & `packages/prompt-engine`)

| Komponen | Implementasi Aktual v1.0 | Integrasi di v2.0 |
|:---|:---|:---|
| **`GroqAdapter`** | Constructor `new GroqAdapter(apiKey?, defaultModel?, keyPool?)`. Memiliki rotasi round-robin multi-key (`GROQ_API_KEYS`, `GROQ_API_KEY_1..6`), error cooldown 429, dan dynamic model fallback (`llama-3.3-70b-versatile` -> `openai/gpt-oss-120b` -> `llama-3.1-8b-instant`). | Prompt Spider akan menggunakan adapter yang sama untuk menjalankan kasus uji secara efisien tanpa terkena limit. |
| **`runOptimizationPipeline`** | `(request: PromptOptimizationRequest, adapter?, options?): Promise<PromptOptimizationResult>` | Closed-Loop Synthesis akan membungkus fungsi ini untuk melakukan iterasi perbaikan berdasarkan feedback Spider. |
| **`analyzePrompt`** | `(prompt: string, context?: string \| null, adapter?, domainPackInput?): Promise<AnalyzePromptResult>` | Dipakai untuk audit prompt yang baru di-crawl. |
| **`optimizePrompt`** | `(originalPrompt: string, analysisFindings: Finding[], constraints?: string[], adapter?, domainPackInput?): Promise<OptimizePromptResult>` | Menerima batasan kegagalan Spider sebagai tambahan `constraints`. |
| **`evaluateOptimization`** | `(originalPrompt: string, optimizedPrompt: string, expectedBehavior: string, adapter?, domainPackInput?): Promise<EvaluateOptimizationResult>` | Digunakan oleh Spider Runner sebagai validator kelulusan kasus uji (*LLM-as-a-Judge*). |
| **`SafeLogger`** | Class dengan method `info`, `warn`, `error`, `debug`, serta utilitas `redactApiKey`, `redactPrompt`, `sanitizeForLog`. | Wajib digunakan oleh Crawler dan Spider agar tidak membocorkan prompt atau token API. |

---

### 2.5. Modul Keamanan Web (`apps/web/src/lib/`)

| File | Fungsi Eksak yang Diekspor | Catatan Kompatibilitas v2.0 |
|:---|:---|:---|
| **`session.ts`** | `SESSION_COOKIE_NAME`, `signSession`, `verifySessionToken`, `extractSessionToken`, `formatSessionCookie`, `getOrCreateSession`, `getAuthenticatedSession`, `resolveSession` | Endpoint API baru v2.0 (`/api/crawler`, `/api/spider`) WAJIB menggunakan `getOrCreateSession` atau `resolveSession` untuk mengikat data ke `userId`. |
| **`csrf.ts`** | `checkCsrf`, `csrfForbiddenResponse` | Semua mutasi HTTP `POST`, `PUT`, `DELETE` pada endpoint baru WAJIB melewati `checkCsrf(request)`. |
| **`rate-limiter.ts`** | `InMemorySlidingWindowLimiter`, `getHistoryRateLimiter`, `getOptimizeRateLimiter`, `getExecuteRateLimiter`, `extractClientIP` | Tambahkan instance baru `getCrawlerRateLimiter` (misal 10 req/menit) dan `getSpiderRateLimiter` (misal 5 run/menit) di Gate 1/Gate 5. |

---

### 2.6. Workspaces Monorepo & Root `package.json`

- **Daftar Workspace Saat Ini**:
  1. `apps/web` (Next.js 16 App Router)
  2. `packages/database` (Prisma + SQLite)
  3. `packages/domain-rules` (5 Domain Packs)
  4. `packages/prompt-contracts` (Zod Schemas & Types)
  5. `packages/prompt-engine` (Core Analysis & Optimization Engine)
  6. `packages/provider-adapters` (Multi-Provider LLM Adapters)
- **Rencana v2.0**:
  - Modul Crawler dan Spider dapat dibangun di dalam `packages/prompt-engine` atau sebagai workspace terpisah (`packages/prompt-crawler`, `packages/prompt-spider`) tergantung granularitas ketergantungan. Pilihan yang paling minim overhead dan aman adalah menambahkan submodul di dalam `packages/prompt-engine` atau membuat package mandiri dengan build pipeline yang konsisten.

---

## 3. Checklist Aturan Kepatuhan Mutlak untuk Gate 1 (Zero-Regression Protocol)

Agar eksekusi Gate 1 (Kontrak Zod & Migrasi Prisma) tidak merusak pengujian v1.0:

1. **JANGAN PERNAH Mengganti Nama Kolom Eksisting**:
   - Kolom `originalPrompt` TIDAK BOLEH diganti menjadi `rawPrompt`.
   - Kolom `score` TIDAK BOLEH diganti menjadi `overallScore`.
   - Kolom `userId`, `optimizedPrompt`, `intentSummary`, `createdAt` harus tetap ada dengan tipe data yang sama.
2. **Pola Migrasi Additive-Only**:
   - Seluruh tabel baru (`PromptVersion`, `SpiderRun`, `SpiderTestResult`, `CrawlerSource`) dibuat dengan relasi `foreign key` mengarah ke `SavedPrompt(id)`.
   - Relasi pada `SavedPrompt` didefinisikan sebagai opsional (`versions PromptVersion[]`, `crawlerSource CrawlerSource?`).
   - SQLite `dev.db` TIDAK BOLEH di-reset; migrasi dilakukan via `prisma migrate deploy` atau migrasi teruji tanpa kehilangan data 2 record aktif.
3. **Kepatuhan Parameter P0 (Lampiran B)**:
   - Allowlist Crawler: Hanya `raw.githubusercontent.com` dan `github.com`.
   - Bounded Spider: Maksimal 5 kasus uji per run, concurrency = 2.
   - Retensi DB: Maksimal 20 `PromptVersion` dan 10 `SpiderRun`.
4. **Verifikasi Suite Lengkap Sebelum Commit**:
   - Sebelum setiap commit, pastikan `node scripts/release-readiness-check.mjs` dan `npm run test:api --workspace=web` tetap 100% PASS (57/57 asersi).

---

## 4. Kesimpulan & Rekomendasi Gate 1
Audit Gate 0 selesai dengan status **LULUS (APPROVED)**. Dokumen arsitektur `docs/architecture/ADR-002-crawler-spider-integration.md` telah diselaraskan dengan fakta kode aktual. Tim siap melanjutkan ke **Gate 1: Perancangan Kontrak Zod v2.0 & Migrasi Database Additive**.