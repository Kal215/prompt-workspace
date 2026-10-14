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
