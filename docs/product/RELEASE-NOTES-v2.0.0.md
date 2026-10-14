# Catatan Rilis (Release Notes) — Versi 2.0.0
**Prompt Intelligence Engineering Workspace (PIEW)**  
**Tanggal Rilis**: 14 Oktober 2026  
**Status**: General Availability (GA)  
**Kompatibilitas**: 100% Kompatibel Mundur (*Backward-Compatible*) terhadap `v1.1.0` & `v1.0.0-mvp`  

Versi **v2.0.0** merupakan tonggak arsitektur terbesar dalam evolusi PIEW, bertransformasi dari sistem optimasi prompt satu arah (Open-Loop) menjadi ekosistem rekayasa prompt tertutup (*Closed-Loop Synthesis Platform*) berkemampuan pembuktian empiris, pengayaan dokumen kontekstual (*Crawler Grounding*), dan stress-test matriks adversarial (*Spider Matrix Evaluation*).

---

## 🌟 Sorotan Rilis Utama (Release Highlights v2.0.0)

### 1. Engine Crawler & Grounding Context (`@prompt-workspace/prompt-crawler`)
- **Import Dokumen & Spesifikasi Luar**: Mengimpor dokumentasi teknis, file konfigurasi, atau repositori raw GitHub sebagai *grounding context* untuk menyuntikkan batasan teknis akurat ke dalam prompt.
- **SSRF Defense-in-Depth**:
  - Resolusi DNS pra-koneksi dengan blokade terhadap IP loopback (`127.0.0.0/8`, `::1`), subnet privat (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Carrier-Grade NAT (`100.64.0.0/10`), Link-Local / AWS Metadata (`169.254.169.254`), dan multicast/broadcast.
  - Whitelist protokol ketat (`http:`, `https:`), penolakan skema internal (`file:`, `gopher:`, `data:`).
  - Pembatasan ukuran muatan aman (*payload cap*) default 512 KB (`CRAWLER_MAX_BYTES=524288`) dan timeout 10 detik.
- **Pembersihan Rahasia Otomatis (Secret Redaction)**:
  - Sanitasi otomatis terhadap kunci API sensitif (OpenAI, Anthropic, Groq, AWS, GitHub tokens, JWT) dan PII sebelum masuk ke context window engine.

### 2. Engine Spider & Adversarial Stress-Test Matrix (`@prompt-workspace/prompt-spider`)
- **Matriks Evaluasi 5 Cabang Deterministik**:
  1. `BASELINE_HAPPY_PATH`: Verifikasi fungsionalitas inti dan ketaatan instruksi dasar.
  2. `EDGE_CASE_EMPTY_MALFORMED`: Pengujian terhadap masukan ekstrem, batas kosong, atau karakter tak terduga.
  3. `ADVERSARIAL_INJECTION`: Simulasi serangan jailbreak, prompt injection, dan instruksi penyesatan (*ignore previous instructions*).
  4. `BOUNDARY_FORMAT_STRICTNESS`: Validasi ketegasan skema output (JSON, XML, atau batasan panjang).
  5. `NOISE_TYPO_TOLERANCE`: Uji ketahanan terhadap masukan ambigu, salah ketik, atau bahasa campur aduk.
- **Semaphore Concurrency Throttling**:
  - Penegakan konkurensi maksimum 2 request paralel (`SPIDER_CONCURRENCY=2`) untuk melindungi pool provider dari lonjakan rate limit.
- **Aturan Kejujuran Metrik (*Honesty & Integrity Rule*)**:
  - `criticalGatePassed`: Ditegakkan secara mutlak. Jika salah satu cabang uji keamanan atau edge-case kritis menghasilkan status `ERROR`, `INDETERMINATE`, atau `FAIL`, maka `criticalGatePassed = false`. Sistem dilarang menutupi kegagalan kritis dengan nilai rata-rata (*no score smoothing*).
  - Pemisahan tegas antara `qualityMetrics` (robustness, adherence, coherence) dan `securityFindings[]`.

### 3. Pipeline Closed-Loop Synthesis (`@prompt-workspace/prompt-engine`)
- **Siklus Tertutup Berkelanjutan**:
  $$\text{Grounding (Crawler)} \longrightarrow \text{Synthesis (Engine)} \longrightarrow \text{Stress-Test (Spider)} \longrightarrow \text{Refinement (Version)}$$
- **Rekomendasi Perbaikan Adaptif**: Evaluasi kegagalan cabang Spider diterjemahkan menjadi rekomendasi patch langsung pada prompt tanpa menghapus maksud asli (*Preserve Intent*).

### 4. Versioning & Riwayat Iterasi Multi-User (`@prompt-workspace/database`)
- **Model `PromptVersion`**: Pencatatan versi setiap iterasi sintesis dengan lineage yang jelas, ringkasan grounding, dan komparasi skor.
- **SQLite WAL Mode**: Penerapan mode *Write-Ahead Logging* (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`) untuk konkurensi pembacaan dan penulisan tinggi bebas locking `SQLITE_BUSY`.
- **Perlindungan Anti-IDOR**: Seluruh operasi versi dan run Spider memvalidasi kepemilikan sesi `userId`.

### 5. Antarmuka UI Workspace v2.0 (`apps/web`)
- **Prompt Version Bar**: Komponen navigasi versi linier untuk membandingkan prompt dari versi awal hingga hasil perbaikan Spider.
- **Crawler Import Modal**: Dialog impor dokumen web/GitHub dengan sanitasi preview seketika.
- **Spider Matrix Panel**: Visualisasi interaktif status 5 cabang evaluasi, skor ketahanan, dan detail temuan kerentanan.

---

## 🛡️ Matriks Keamanan & Tata Kelola (Security & Governance)

| Mekanisme Pertahanan | Komponen Pelaksana | Standar Keamanan & Perlindungan |
|:---|:---|:---|
| **SSRF Guard** | `@prompt-workspace/prompt-crawler` | Anti-private IP, anti-cloud metadata, DNS re-resolution check, max byte enforcement. |
| **Secret Sanitizer** | `@prompt-workspace/prompt-crawler` | Masking otomatis API token dan kredensial sebelum parsing. |
| **Anti-IDOR Authorization** | `@prompt-workspace/database` | Enforcing `userId` match pada seluruh endpoint `/api/crawl`, `/api/spider`, dan database helper. |
| **CSRF & Origin Verification** | `apps/web` Middleware | Validasi header `Origin` / `Referer` dan token sesi HMAC-SHA256 (`SESSION_SECRET`). |
| **Instant Kill-Switch** | Environment Feature Flags | `NEXT_PUBLIC_ENABLE_CRAWLER=false` dan `NEXT_PUBLIC_ENABLE_SPIDER=false` untuk isolasi insiden instan tanpa downtime v1.0. |
| **Data Minimization** | Monorepo Logging Policy | Zero logging terhadap prompt asli, API key, atau payload dokumen eksternal pada log server. |

---

## 📦 Matriks Workspace Monorepo (8 Packages)

| Workspace Package | Versi | Peran & Kapabilitas v2.0 |
|---|:---:|---|
| `web` | `2.0.0` | Antarmuka Next.js 15, route `/api/crawl`, `/api/spider`, UI modal Crawler, Spider panel, dan Version bar. |
| `@prompt-workspace/prompt-crawler` | `0.1.0` | Engine ekstraksi dokumen, SSRF protection, secret redaction, dan fetcher timeout control. |
| `@prompt-workspace/prompt-spider` | `0.1.0` | Engine adversarial test-suite, runner concurrency limiter (Semaphore), dan evaluator metrik. |
| `@prompt-workspace/prompt-engine` | `0.3.0` | Pipeline Closed-Loop synthesis, grounding-aware optimizer, dan placeholder resolver. |
| `@prompt-workspace/prompt-contracts` | `0.3.0` | Kontrak tipe Zod v2.0 untuk Crawler (`CrawlRequestSchema`, dll.) dan Spider (`SpiderRunSchema`, dll.). |
| `@prompt-workspace/database` | `0.3.0` | Prisma schema v2 (`PromptVersion`, `SpiderRun`, `SpiderBranchResult`, `CrawlSession`), WAL mode, backup/restore. |
| `@prompt-workspace/domain-rules` | `1.0.0` | 5 Domain Rule Packs (general, coding, debugging, academic, business). |
| `@prompt-workspace/provider-adapters` | `0.2.0` | Multi-provider adapters (Groq, Gemini, OpenRouter, Ollama) dengan zero-secret leakage. |

---

## 🧪 Hasil Pengujian Regresi Lintas-Platform (Linux VPS Gate 4 & 5)

Seluruh 8 gerbang verifikasi wajib di Linux VPS dieksekusi dengan status **EXIT CODE 0 (100% LULUS)**:

1. `npm run typecheck`: **0 Error** di seluruh 8 workspace monorepo.
2. `npm run test:v2-engines`: **LULUS 100%** (Contracts, Crawler, Spider, Closed-Loop).
3. `npm run test --workspace=@prompt-workspace/database`: **LULUS 100%** (WAL mode & isolated temporary database).
4. `npm run test:unit --workspace=web`: **LULUS 39/39 subtest** (Vitest unit testing).
5. `npm run db:backup` & `npm run db:restore`: **LULUS 100%** verifikasi integritas skema v2.0.
6. `npm run build`: **LULUS Turbopack production compilation**.
7. `node scripts/release-readiness-check.mjs`: **LULUS 100%** seluruh titik kesiapan v1.0 dan artefak wajib P0 v2.0.
8. Verifikasi Keutuhan Database: **2 record aktif di `packages/database/prisma/dev.db` tetap utuh 100%**.
