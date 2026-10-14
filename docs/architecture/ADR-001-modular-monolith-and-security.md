# ADR-001: Modular Monolith Monorepo & Fondasi Keamanan Multi-Layer

## Status
**Diterima (Accepted)** — Tanggal: 14 Oktober 2026

## Konteks & Latar Belakang
Prompt Intelligence Engineering Workspace (PIEW) dirancang untuk memproses dan mengoptimalkan prompt pengguna dengan keandalan tinggi, kecepatan instan, dan jaminan keamanan data. Dalam proses pengembangannya, tim menghadapi tantangan teknis mendasar:
1. **Keterikatan Kode (Coupling)**: Menempatkan logika prompt analysis/optimization langsung di dalam komponen UI atau Next.js route handler akan menyulitkan pengujian otomatis independen, benchmark regresi, dan pembagian tugas antar-agen (Agent VPS dan Agent PC).
2. **Keterbatasan Kuota Provider LLM**: Panggilan optimasi model berdaya komputasi tinggi (seperti Llama 3.3 70B di Groq) rawan terkena rate limit (HTTP 429) jika hanya mengandalkan satu kunci API tunggal.
3. **Portabilitas & Integritas Data**: Aplikasi harus dapat berjalan lancar di lingkungan Windows (pengembang lokal) dan Linux (VPS produksi). Pengujian otomatis database tidak boleh merusak database lokal aktif (`dev.db`).
4. **Ancaman Keamanan Web**: Aplikasi membutuhkan perlindungan terhadap Insecure Direct Object Reference (IDOR), pemalsuan permintaan lintas situs (CSRF), eksploitasi brute-force/DoS, tabrakan data akibat race condition, serta kebocoran data sensitif (API key & prompt pengguna).

---

## Keputusan Arsitektur

### 1. Modular Monolith Berbasis `npm workspaces`
Kami memutuskan untuk menggunakan pola **Modular Monolith** dalam satu repositori terpadu:
- `apps/web`: Antarmuka Next.js 16 (Turbopack, Tailwind CSS, shadcn/ui) yang berfungsi sebagai presentation layer murni.
- `packages/prompt-contracts`: Single Source of Truth untuk schema Zod, tipe TypeScript, dan taksonomi celah prompt.
- `packages/prompt-engine`: Core pipeline rekayasa prompt (Analyzer, Optimizer, Evaluator, SafeLogger) yang bersifat agnostik terhadap UI dan framework web.
- `packages/provider-adapters`: Abstraksi LLM adapter dengan kemampuan pool rotasi multi-key dan dynamic model fallback.
- `packages/database`: Layer enkapsulasi database menggunakan Prisma ORM dan SQLite, lengkap dengan migrasi SQL terkelola.

*Rasional*: Memberikan modularitas setara microservices tanpa kompleksitas orkestrasi jaringan, latensi RPC, atau deployment terpisah.

---

### 2. Groq Multi-Key Rotation Pool & Dynamic Fallback
Kami mengimplementasikan `GroqAdapterPool` di `packages/provider-adapters`:
- Mendukung konfigurasi pool hingga 6 kunci API (`GROQ_API_KEY_1` s/d `GROQ_API_KEY_6`).
- Mekanisme rotasi round-robin otomatis pada setiap request.
- Penanganan error HTTP 429 yang cerdas: kunci yang terkena rate limit akan ditandai dengan cooldown terisolasi, sementara request otomatis dialihkan ke kunci sehat berikutnya dalam pool.
- Model fallback terencana (`llama-3.3-70b-versatile` -> `llama-3.1-8b-instant` -> `mixtral-8x7b-32768`).

*Rasional*: Menjamin stabilitas tinggi dan zero downtime selama proses optimasi batch dan pengujian otomatis intensif.

---

### 3. SQLite + Prisma dengan Dynamic Proxy Isolation
Kami merancang layer persistensi di `packages/database`:
- Helper `resolveDatabaseFileUrl()` menangani perbedaan format path file SQLite antara Windows (`file:C:/...`), relative path, dan Linux absolute path.
- Objek `prisma` diekspor sebagai ES6 `Proxy` yang menginisialisasi koneksi `PrismaClient` secara dinamis saat runtime berdasarkan `process.env.DATABASE_URL`.
- Pengujian otomatis (`test-db.ts`, `test-api.ts`, `test-e2e.ts`) mengalokasikan database sementara di direktori temporary OS (`os.tmpdir()`), sehingga file database utama (`dev.db`) terisolasi 100% dan terlindungi dari manipulasi data tes.

*Rasional*: Menghilangkan overhead konfigurasi database server eksternal untuk fase MVP, sambil mempertahankan portabilitas penuh dan keamanan data lokal.

---

### 4. Fondasi Keamanan Multi-Layer (Multi-Layer Security Foundation)
Kami menerapkan 6 pilar keamanan pada tingkat API dan aplikasi:
1. **Signed Session Identity (`piw_session`)**:
   - Cookie HttpOnly yang ditandatangani menggunakan HMAC-SHA256 (`<userId>.<timestamp>.<signature>`) dengan rahasia `SESSION_SECRET` (wajib minimal 32 karakter pada production).
   - Menyediakan identitas pengguna otomatis tanpa beban form registrasi di fase MVP.
2. **Otorisasi Data Ownership Per-Record**:
   - Kolom `userId` ditambahkan pada model `SavedPrompt`.
   - Pemeriksaan hak akses dilakukan secara ketat pada server (`/api/history`): pengguna hanya berhak mengakses dan menghapus record miliknya. Data legacy (`legacy_default_user`) diproteksi menjadi *read-only*.
3. **Proteksi CSRF Fail-Closed**:
   - Menolak semua mutasi (`POST`, `DELETE`) yang tidak memiliki header `Origin` atau `Referer` yang valid dengan status `403 Forbidden`.
   - Memvalidasi kesesuaian host terhadap whitelist domain yang diizinkan dan mewajibkan `Content-Type: application/json`.
4. **Rate Limiting Modular (Sliding Window)**:
   - Menggunakan interface `RateLimiter` dengan implementasi sliding-window in-memory per-IP.
   - Dilengkapi guard `TRUST_PROXY` untuk mencegah manipulasi header `X-Forwarded-For` pada single-instance server.
5. **Mitigasi Race Condition & Idempotensi (Prisma P2002)**:
   - Penanganan benturan constraint unik: request konkuren dengan payload identik direspons dengan `200/201 OK` (idempotent), sedangkan request berbeda ID ditolak dengan `409 Conflict`.
6. **Zero-Leakage Logging**:
   - Redaksi otomatis pada prompt pengguna, kunci API, dan stack trace internal untuk kepatuhan perlindungan data pribadi (*Data Minimization*).

---

## Konsekuensi

### Konsekuensi Positif
- **Isolasi Domain**: Perubahan pada antarmuka web tidak akan merusak kestabilan core prompt engine.
- **Keandalan Tinggi**: Pipeline optimasi prompt tahan terhadap fluktuasi rate limit provider AI.
- **Portabilitas**: Seluruh test suite dan perintah build berjalan konsisten di Windows dan Linux tanpa adaptasi manual.
- **Postur Keamanan Kuat**: Aplikasi terlindungi dari kerentanan web modern (IDOR, CSRF, Abuse, Data Pollution).

### Trade-Offs & Mitigasi
- **In-Memory Rate Limiter**: Rate limiter saat ini bersifat in-memory pada satu instance Node.js. Jika aplikasi di-scale ke multi-instance/serverless di masa depan, rate limiter perlu dialihkan ke Redis/Upstash (sudah disiapkan melalui antarmuka `RateLimiter`).
- **Prisma Dist Dependency**: Perubahan skema Prisma memerlukan eksekusi `npx prisma generate` dan `npm run build` pada package database agar deklarasi TypeScript sinkron di seluruh monorepo.
