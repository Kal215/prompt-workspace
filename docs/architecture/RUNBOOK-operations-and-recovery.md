# RUNBOOK: Panduan Operasional & Pemulihan Sistem (Operations & Recovery)

Dokumen ini adalah panduan standar operasional (SOP) bagi operator sistem dan pengembang dalam memelihara, memulihkan, serta merilis Prompt Intelligence Engineering Workspace (PIEW) v1.0.0-mvp.

---

## 1. Penanganan Kegagalan Provider LLM (Groq Rate Limit & Failover)

### Karakteristik Masalah
- **Error HTTP 429 (Too Many Requests)**: Terjadi ketika batas TPM (*Tokens Per Minute*) atau RPM (*Requests Per Minute*) pada salah satu API key Groq tercapai.
- **Error HTTP 503 / 500 (Groq Provider Downtime)**: Gangguan sementara pada backend Groq.

### Mekanisme Otomatis Aplikasi
1. `GroqAdapterPool` otomatis mendeteksi status 429 dan menandai kunci yang bersangkutan dengan periode *cooldown* (default: 60 detik).
2. Request yang sama langsung dialihkan (*failover*) ke kunci sehat berikutnya di dalam pool secara transparan tanpa memutus alur pengguna.
3. Jika seluruh kunci mengalami limit, adapter mencoba beralih ke model cadangan (`llama-3.1-8b-instant`).

### Tindakan Operator Jika Terjadi Kegagalan Total
1. **Periksa Status Kuota Kunci**:
   Buka dashboard console Groq untuk memeriksa penggunaan kuota masing-masing akun.
2. **Tambah / Ganti Kunci di `.env`**:
   Buka file `.env` di root repositori dan perbarui salah satu kunci:
   ```bash
   GROQ_API_KEY_1="gsk_kunci_baru_disini..."
   ```
3. **Restart Service Web / Aplikasi**:
   Muat ulang server web agar environment baru aktif:
   ```bash
   # Di lingkungan pengembangan:
   npm run dev --workspace=web
   ```

---

## 2. Prosedur Backup & Restore Database SQLite (`dev.db`)

Untuk menjamin integritas data dan mencegah hilangnya riwayat optimasi pengguna, repositori dilengkapi script backup dan restore otomatis.

### A. Prosedur Backup Harian / Pre-Maintenance
Jalankan perintah berikut di root repositori:
```bash
npm run db:backup
```
- **Lokasi Hasil**: `packages/database/backups/dev-backup-YYYYMMDD-HHMMSS.db`
- **Output**: Menampilkan path absolut file backup dan jumlah record `SavedPrompt` terverifikasi.
- **Keamanan**: Seluruh file `.db` di folder `backups/` otomatis diabaikan oleh `.gitignore` dan tidak akan ter-commit ke repositori Git.

### B. Prosedur Restore Database (Pemulihan Data)
#### 1. Uji Restore Non-Destruktif (Dry-Run ke File Sementara)
Untuk memverifikasi keabsahan file backup tanpa menyentuh database aktif:
```bash
npm run db:restore -- --target /tmp/test-restore-verify.db
```
Setelah verifikasi selesai, hapus file sementara tersebut:
```bash
rm -f /tmp/test-restore-verify.db
```

#### 2. Restore Penuh ke Database Aktif (`dev.db`)
Jika database aktif mengalami kerusakan atau data terhapus secara tidak sengaja:
```bash
# Menggunakan backup terbaru secara otomatis:
npm run db:restore

# Atau memilih file backup spesifik:
npm run db:restore -- --file packages/database/backups/dev-backup-20261014-103959.db
```
*Catatan*: Script restore memverifikasi header format SQLite 3 dan keabsahan skema tabel `SavedPrompt` sebelum menimpa file target.

---

## 3. Checklist Verifikasi Regresi Sebelum Rilis (Pre-Release Gate)

Sebelum melakukan deployment rilis baru atau menggabungkan PR ke branch `main`, seluruh 7 gerbang verifikasi wajib dijalankan secara berurutan:

```bash
# 1. Typecheck Monorepo (Wajib 0 error di seluruh workspace)
npm run typecheck

# 2. Linting Web Workspace (Wajib bersih 0 error & 0 warning)
npm run lint --workspace=web

# 3. Unit & Persistence Test Database (Wajib lulus pada temporary DB)
npm run test --workspace=@prompt-workspace/database

# 4. Unit Test API Route Handler (Wajib 22 subtest lulus via node:test)
npm run test:unit --workspace=web

# 5. Regression Test API Komprehensif (Wajib 44 asersi sukses)
npm run test:api --workspace=web

# 6. Browser E2E Headless Test (Wajib 13 asersi deterministik lulus)
npm run test:e2e --workspace=web

# 7. Production Build Monorepo (Wajib Turbopack clean compile)
npm run build
```

---

## 4. Syarat Wajib Deployment ke Internet Publik (Production Hardening)

Sebelum membuka port aplikasi ke jaringan publik atau mendaftarkan domain produksi, operator **WAJIB** memastikan konfigurasi berikut:

| Konfigurasi | Nilai yang Diwajibkan | Rasional Keamanan |
|:---|:---|:---|
| `NODE_ENV` | `production` | Mengaktifkan optimasi performa Next.js dan memicu validasi ketat keamanan saat bootstrap. |
| `SESSION_SECRET` | String acak `>= 32` karakter | Mencegah pemalsuan (*forgery*) session cookie `piw_session`. Server akan gagal start (*fail-fast*) jika secret tidak memenuhi syarat di production. |
| `TRUST_PROXY` | `1` (atau `true`) | **Hanya jika** aplikasi berada di balik Reverse Proxy tepercaya (Cloudflare, Nginx, Azure Application Gateway). Mencegah bypass rate limiter via spoofing header `X-Forwarded-For`. |
| `ALLOWED_ORIGINS` | `https://domain-resmi.com` | Membatasi origin yang diizinkan melakukan request mutasi POST/DELETE guna mencegah serangan CSRF lintas-domain. |
| `DATABASE_URL` | Path aman dengan izin file ketat | Pastikan direktori database SQLite memiliki permission `chmod 700` dan file `chmod 600` agar tidak dapat dibaca oleh user OS non-privilege. |

### Contoh Pembuatan `SESSION_SECRET` yang Kuat
Gunakan perintah OpenSSL pada terminal server:
```bash
openssl rand -hex 32
```
Salin nilai heksadesimal 64-karakter yang dihasilkan ke dalam konfigurasi environment server produksi.

---

## 5. SOP Gate 5: Operasi PIEW v2.0 (Crawler, Spider, WAL & Kill-Switch)

### 5.1 Kill-Switch & Feature Flag Rollback Instan (Zero-Downtime Incident Response)
Jika terjadi insiden keamanan, lonjakan trafik eksternal, atau anomali pada modul v2.0 (Crawler / Spider), operator dapat menonaktifkan fitur tersebut secara instan tanpa mengganggu fungsi optimasi prompt v1.0 yang sedang berjalan:

1. **Mematikan Modul Crawler Secara Instan**:
   Setel variabel environment di server:
   ```bash
   NEXT_PUBLIC_ENABLE_CRAWLER=false
   ```
   - **Efek Seketika**: Tombol "Import Dokumen (Crawler)" pada UI disembunyikan. Endpoint `/api/crawl` langsung menolak request dengan status `HTTP 403 Forbidden` (`{"error": "Fitur Crawler dinonaktifkan oleh administrator."}`).
   - **Dampak v1.0**: 0% dampak. Fitur input prompt manual dan optimasi domain-rules tetap berfungsi 100%.

2. **Mematikan Modul Spider Matrix Secara Instan**:
   Setel variabel environment di server:
   ```bash
   NEXT_PUBLIC_ENABLE_SPIDER=false
   ```
   - **Efek Seketika**: Panel matriks stress-test Spider pada UI dinonaktifkan/disembunyikan. Endpoint `/api/spider` langsung mengembalikan `HTTP 403 Forbidden` (`{"error": "Fitur Spider Matrix dinonaktifkan oleh administrator."}`).
   - **Dampak v1.0**: 0% dampak. Playground eksekusi model tunggal (`/api/execute`) dan riwayat v1.0 tetap aktif tanpa gangguan.

3. **Rollback Bersamaan (v2.0 Kill-All)**:
   ```bash
   NEXT_PUBLIC_ENABLE_CRAWLER=false
   NEXT_PUBLIC_ENABLE_SPIDER=false
   ```
   Sistem beroperasi dalam mode murni PIEW v1.1.0 stabil.

### 5.2 Pemeliharaan SQLite WAL Mode & Integritas Tabel v2.0
Mulai v2.0, database SQLite beroperasi dalam mode **Write-Ahead Logging (WAL)** (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`) untuk mendukung konkurensi tinggi antara eksekusi multi-cabang Spider dan request web tanpa risiko `SQLITE_BUSY`.

1. **Verifikasi Backup Skema v2.0**:
   Jalankan script pencadangan resmi:
   ```bash
   npm run db:backup
   ```
   Script otomatis mencakup seluruh tabel v1.0 dan entitas v2.0:
   - `SavedPrompt` (tabel primer v1.0 dengan 2 record asli terlindungi)
   - `PromptVersion` (riwayat versi hasil closed-loop synthesis)
   - `SpiderRun` & `SpiderBranchResult` (hasil evaluasi stress-test adversarial)
   - `CrawlSession` & `CrawlItem` (sumber dokumen grounding terverifikasi)

2. **Verifikasi Prosedur Restore Skema v2.0 (Non-Destruktif)**:
   Lakukan validasi ke file sementara untuk memastikan keutuhan seluruh entitas v2.0:
   ```bash
   npm run db:restore -- --target /tmp/test-v2-restore.db
   sqlite3 /tmp/test-v2-restore.db "SELECT count(*) FROM SavedPrompt; SELECT count(*) FROM PromptVersion; SELECT count(*) FROM SpiderRun;"
   rm -f /tmp/test-v2-restore.db
   ```
3. **Pembersihan File WAL & SHM**:
   Sebelum melakukan migrasi atau pemindahan database, pastikan checkpoint WAL dilakukan secara aman:
   ```bash
   sqlite3 packages/database/prisma/dev.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

