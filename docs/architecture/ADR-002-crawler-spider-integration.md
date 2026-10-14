# ADR-002: Arsitektur Integrasi Prompt Crawler, Prompt Spider & Closed-Loop Synthesis
**Prompt Intelligence Engineering Workspace (PIEW) — Versi 2.0.0-draft-2**

- **Status**: Diterima (Gate 0 Frozen)
- **Tanggal Pembekuan**: 14 Oktober 2026
- **Target Rilis**: PIEW v2.0.0
- **Penulis**: AI Architecture Team & Platform Engineers

---

## 1. Konteks & Latar Belakang

Pada rilis PIEW v1.1.0 (GA), platform telah berhasil mengimplementasikan kapabilitas dasar:
1. Analisis & optimasi prompt berbasis 8 taksonomi dan 5 Domain Packs berversi (Fitur C1).
2. Multi-Provider LLM Adapters (Groq, Gemini, OpenRouter, Ollama) dengan rotasi multi-kunci dan zero-secret capability registry (Fitur C2).
3. Target Model Execution Playground & Smart Placeholder Resolver (Fitur C3).
4. Persistensi riwayat sesi, otorisasi IDOR-proof, ekspor laporan verifikasi (MD/JSON), dan telemetri privasi (Tahap 6 & 7).

Meskipun demikian, siklus hidup rekayasa prompt pada v1.1.0 masih bersifat satu arah (*open-loop*): pengguna menginput prompt secara manual, sistem merekomendasikan optimasi, dan pengguna mengujinya satu per satu di Playground.

Untuk mentransformasikan PIEW menjadi lingkungan rekayasa prompt tingkat industri, PIEW v2.0 memperkenalkan 3 pilar baru:
1. **Prompt Crawler**: Mengimpor koleksi prompt dari repositori kode eksternal dan registry terpercaya secara terstruktur dan aman.
2. **Prompt Spider & Benchmark Runner**: Menjalankan rangkaian kasus uji (*test suites*) secara otomatis dan paralel terhadap berbagai model tujuan, mengukur stabilitas semantik, variabilitas nondeterminisme, dan performa keluaran.
3. **Closed-Loop Synthesis**: Mengintegrasikan hasil pengujian Spider langsung kembali ke engine Optimizer untuk menghasilkan versi prompt berikutnya (*multi-turn refinement*) hingga memenuhi ambang batas kualitas (skor rubric dan pass rate).

---

## 2. Prinsip Arsitektur PIEW v2.0

1. **Zero-Regression Terhadap v1.0**: Seluruh skema, tabel, helper, dan API v1.0 WAJIB berfungsi normal tanpa perubahan perilaku (*100% backward-compatible*).
2. **Data Minimization & Safe Logging**: Prompt pengguna dan kunci API eksternal tidak boleh dicatat dalam plaintext ke log server atau terminal.
3. **Bounded & Deterministic Execution**: Eksekusi pengujian Spider harus dibatasi (*bounded limits*) untuk mencegah pengurasan kuota LLM, kelebihan memori, dan tabrakan konkurensi SQLite.
4. **SSRF & Network Quarantine**: Modul Crawler hanya boleh mengakses domain yang telah terdaftar dalam allowlist ketat.
5. **Human-in-Control**: Setiap hasil sintesis versi baru memerlukan persetujuan eksplisit pengguna sebelum menjadi versi aktif.

---

## 3. Komponen Utama Arsitektur v2.0

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PIEW v2.0 Core Architecture                     │
└────────────────────────────────────────────────────────────────────────┘

    [External Source] (GitHub/Raw)
            │
            ▼ (Allowlist & SSRF Guard)
   ┌─────────────────┐
   │ Prompt Crawler  │ ──► [Ingest & Parser] ──► SavedPrompt (v1.0 Compatible)
   └─────────────────┘                                 │
                                                       ▼
   ┌─────────────────┐                        ┌─────────────────┐
   │ Closed-Loop     │ ◄───────────────────── │  Prompt Engine  │
   │ Synthesis       │   (Iterative Feedback) │  (Analyzer &    │
   └────────┬────────┘                        │   Optimizer)    │
            │                                 └────────┬────────┘
            ▼ (New Version)                            │ (Execute)
   ┌─────────────────┐                                 ▼
   │  PromptVersion  │                        ┌─────────────────┐
   │  History Store  │ ─────────────────────► │  Prompt Spider  │
   └─────────────────┘     (Test Cases)       │  (Runner & QA)  │
                                              └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ SpiderRun &     │
                                              │ TestResults     │
                                              └─────────────────┘
```

### 3.1. Prompt Crawler Engine (`packages/prompt-crawler` / module)
- Mengambil prompt dari URL sumber publik.
- Mem-parse format Markdown (system prompt, user prompt, metadata frontmatter, placeholders).
- Mencegah serangan Server-Side Request Forgery (SSRF) dengan validasi protokol (hanya HTTPS) dan DNS resolve check (menolak loopback/private IPv4/IPv6).

### 3.2. Prompt Spider & Benchmark Runner (`packages/prompt-spider` / module)
- Menerima `promptVersionId`, array `testCases` (input, expected behavior/output), dan target provider/model.
- Menjalankan uji kasus secara terkendali menggunakan antarmuka `LLMProviderAdapter`.
- Mengukur latency, token usage, dan rubric pass rate menggunakan LLM-as-a-Judge (`evaluateOptimization`).

### 3.3. Closed-Loop Synthesis Engine
- Menganalisis kegagalan kasus uji Spider (`SpiderTestResult` dengan status `FAILED`).
- Menyuapkan temuan kegagalan sebagai batasan baru (`constraints`) ke dalam `optimizePrompt()`.
- Menghasilkan record `PromptVersion` baru dengan nomor versi increment (+1).

---

## 4. Spesifikasi Skema Database Prisma v2.0 (Bab 8.2)

Skema database diselaraskan 100% dengan model `SavedPrompt` aktual v1.0. Semua ekstensi v2.0 bersifat **additive-only** dengan relasi opsional, sehingga 2 record aktif (`legacy_default_user`) dan data historis lainnya di `packages/database/prisma/dev.db` tetap utuh dan valid.

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -----------------------------------------------------------------------------
// MODEL EKSISTING v1.0 (100% PERSISTEN & PRESERVED)
// -----------------------------------------------------------------------------
model SavedPrompt {
  id              String   @id @default(uuid())
  userId          String   @default("legacy_default_user")
  originalPrompt  String   // Nama kolom kanonis aktual (BUKAN rawPrompt)
  optimizedPrompt String   // Nama kolom kanonis aktual
  intentSummary   String?  // Ringkasan maksud kanonis aktual
  score           Int      // Skor kesehatan kanonis aktual (BUKAN overallScore)
  createdAt       DateTime @default(now())

  // Relasi Baru v2.0 (Additive-Only)
  versions        PromptVersion[]
  crawlerSource   CrawlerSource?

  @@index([userId])
}

// -----------------------------------------------------------------------------
// MODEL BARU v2.0: VERSIONING PROMPT (CLOSED-LOOP ITERATION)
// -----------------------------------------------------------------------------
model PromptVersion {
  id              String       @id @default(uuid())
  savedPromptId   String
  savedPrompt     SavedPrompt  @relation(fields: [savedPromptId], references: [id], onDelete: Cascade)
  versionNumber   Int          // 1, 2, 3, dst.
  promptText      String       // Teks prompt spesifik versi ini
  score           Int          // Skor evaluasi versi ini (0 - 100)
  changesSummary  String?      // Ringkasan perbaikan dari versi sebelumnya
  parentVersionId String?      // Referensi ke versi sebelumnya jika hasil iterasi
  createdAt       DateTime     @default(now())

  spiderRuns      SpiderRun[]

  @@unique([savedPromptId, versionNumber])
  @@index([savedPromptId])
}

// -----------------------------------------------------------------------------
// MODEL BARU v2.0: PROMPT SPIDER BENCHMARK RUN
// -----------------------------------------------------------------------------
model SpiderRun {
  id               String            @id @default(uuid())
  promptVersionId  String
  promptVersion    PromptVersion     @relation(fields: [promptVersionId], references: [id], onDelete: Cascade)
  targetProvider   String            // groq, gemini, openrouter, ollama
  targetModel      String            // e.g. llama-3.3-70b-versatile
  status           String            // PENDING, RUNNING, COMPLETED, FAILED
  totalCases       Int               // Jumlah kasus uji yang dieksekusi
  passedCases      Int               // Kasus uji yang memenuhi rubrik
  averageScore     Float             // Rata-rata skor kasus uji (0 - 100)
  averageLatencyMs Int               // Rata-rata latensi per eksekusi
  errorMessage     String?           // Pesan kegagalan jika status FAILED
  createdAt        DateTime          @default(now())

  testResults      SpiderTestResult[]

  @@index([promptVersionId])
}

// -----------------------------------------------------------------------------
// MODEL BARU v2.0: HASIL INDIVIDUAL KASUS UJI SPIDER
// -----------------------------------------------------------------------------
model SpiderTestResult {
  id             String    @id @default(uuid())
  spiderRunId    String
  spiderRun      SpiderRun @relation(fields: [spiderRunId], references: [id], onDelete: Cascade)
  caseIndex      Int       // Urutan kasus uji (0 - 4 pada P0)
  testInput      String    // Data masukan kasus uji
  expectedOutput String?   // Ekspektasi perilaku/keluaran
  actualOutput   String    // Respons nyata dari model tujuan
  score          Int       // Skor evaluasi kasus ini (0 - 100)
  latencyMs      Int       // Waktu respons pemanggilan LLM
  status         String    // PASSED, FAILED
  findings       String?   // JSON stringified kelemahan/evaluasi
  createdAt      DateTime  @default(now())

  @@index([spiderRunId])
}

// -----------------------------------------------------------------------------
// MODEL BARU v2.0: METADATA PROMPT CRAWLER
// -----------------------------------------------------------------------------
model CrawlerSource {
  id            String      @id @default(uuid())
  savedPromptId String?     @unique
  savedPrompt   SavedPrompt? @relation(fields: [savedPromptId], references: [id], onDelete: Cascade)
  sourceUrl     String      // URL asal pengunduhan prompt
  domain        String      // Domain sumber (e.g. raw.githubusercontent.com)
  etag          String?     // HTTP ETag untuk deduplikasi
  contentHash   String      // SHA-256 hash dari konten asli
  crawledAt     DateTime    @default(now())
}
```

---

## 5. Keputusan Resmi & Parameter Bounded (Lampiran B)

Untuk menjamin reliabilitas monorepo di lingkungan VPS maupun Windows lokal pengembang, parameter batas P0 ditetapkan sebagai berikut:

### 5.1. Allowlist P0 Crawler
Crawler HANYA diizinkan mengunduh dari domain berikut:
- `raw.githubusercontent.com`
- `github.com` (khusus URL raw content)

Semua permintaan ke domain di luar allowlist atau alamat IP langsung (misal `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, `localhost`) WAJIB ditolak dengan error `CrawlerSecurityError: Domain not in allowlist`.
- **Maksimum Ukuran Konten**: 256 KB per file prompt.
- **Timeout Unduhan**: Maksimal 10 detik.

### 5.2. Eksekusi Spider P0 (Bounded Runner)
- **Maksimum Kasus Uji**: Maksimal **5 kasus uji** per `SpiderRun`.
- **Concurrency Semaphore**: Concurrency = **2** paralel execution per SpiderRun untuk mencegah rate limit (HTTP 429) pada provider gratisan dan menjaga kestabilan latensi.
- **Synchronous Bounded Execution**: Eksekusi pengujian dilakukan secara bounded dengan transaksi batch SQLite terisolasi.
- **Konfigurasi SQLite WAL**:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
  ```

### 5.3. Kebijakan Retensi SQLite
Untuk mencegah file SQLite `dev.db` membengkak tanpa batas:
- Maksimal **20 `PromptVersion`** per record `SavedPrompt`.
- Maksimal **10 `SpiderRun`** per `PromptVersion`.
- Pembersihan record lama dilakukan secara FIFO (*First-In, First-Out*) dengan `onDelete: Cascade` pada relasi anak.

---

## 6. Rencana Pembangunan Bertahap (Gate 0 s/d Gate 6)

1. **Gate 0 (Pondasi)**: Audit kompatibilitas kode v1.0 dan pembekuan ADR-002 (Dokumen ini).
2. **Gate 1 (Kontrak & Database)**: Penambahan skema Zod di `packages/prompt-contracts` dan migrasi Prisma additive di `packages/database`.
3. **Gate 2 (Crawler Engine)**: Pembangunan modul `prompt-crawler` dengan SSRF guard dan parser Markdown.
4. **Gate 3 (Spider Runner)**: Pembangunan modul `prompt-spider` dengan concurrency semaphore dan evaluasi kasus uji.
5. **Gate 4 (Closed-Loop Engine)**: Pembangunan orkestrator sintesis iteratif (Spider -> Optimizer -> Versioning).
6. **Gate 5 (Web UI & Visual Benchmark)**: Integrasi Next.js untuk Crawler import, Spider test suite table, dan diff antar-versi prompt.
7. **Gate 6 (Release v2.0 & Hardening)**: Full regression suite, zero-secret scan, documentation, dan tag v2.0.0.

---

## 7. Status Tinjauan & Kesepakatan
Dokumen ini disetujui sebagai **Single Source of Truth** untuk seluruh pengerjaan PIEW v2.0. Seluruh agen pengembang (Agent VPS dan Agent PC) terikat pada batasan teknis di atas.