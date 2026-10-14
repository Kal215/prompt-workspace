# RUNBOOK: Standar Operasional & Penanganan Insiden (Operations & Incident Response)
**Prompt Intelligence Engineering Workspace (PIEW) — Versi 1.1.0**

Dokumen ini adalah panduan standar operasional resmi (SOP) bagi operator sistem, site reliability engineers (SRE), dan pengembang dalam memelihara stabilitas, menangani insiden teknis, dan memulihkan layanan PIEW v1.1.0.

---

## 🚨 1. Penanganan Insiden Multi-Provider Outage

Dengan rilis v1.1.0, sistem mendukung 4 penyedia model AI (Groq, Google Gemini, OpenRouter, dan Ollama Lokal). Kegagalan pada salah satu penyedia tidak boleh melumpuhkan seluruh platform.

### 1.1 Skenario A: Kegagalan Provider Groq (Rate Limit / 503)
- **Gejala**: Log backend mencatat `ProviderRateLimitError (HTTP 429)` atau `ProviderUnavailableError (HTTP 503)`.
- **Mekanisme Otomatis**:
  - `GroqAdapterPool` secara otomatis menandai kunci bermasalah dengan cooldown 60 detik dan merotasi ke kunci berikutnya dari total 6 kunci yang dikonfigurasi.
  - Jika seluruh kunci mengalami limit, adapter mencoba beralih ke model fallback (`llama-3.1-8b-instant`).
- **Tindakan Operator**:
  1. Periksa penggunaan kuota di Groq Console.
  2. Tambahkan atau perbarui kunci di `.env`:
     ```bash
     GROQ_API_KEY_1="gsk_kunci_baru..."
     ```
  3. Beri tahu pengguna untuk beralih sementara ke Google Gemini atau OpenRouter via selector UI jika kuota Groq habis total.

### 1.2 Skenario B: Kegagalan Provider Google Gemini (Auth / Quota Error)
- **Gejala**: Error `UNAUTHORIZED (HTTP 401)` atau `RATE_LIMITED (HTTP 429)` pada adapter Gemini.
- **Tindakan Operator**:
  1. Periksa validitas `GEMINI_API_KEY` di Google AI Studio console.
  2. Pastikan billing aktif jika menggunakan model Pro.
  3. Perbarui kunci di `.env` (atau pool `GEMINI_API_KEYS=key1,key2`).
  4. Operator dapat mengarahkan trafik optimasi kembali ke Groq sebagai provider default.

### 1.3 Skenario C: Kegagalan Provider OpenRouter (Gateway Outage / Saldo Habis)
- **Gejala**: HTTP 402 (Payment Required / Insufficient Credits) atau HTTP 502/504 Bad Gateway dari openrouter.ai.
- **Tindakan Operator**:
  1. Cek saldo kredit di OpenRouter Dashboard.
  2. Verifikasi status operasional OpenRouter di `status.openrouter.ai`.
  3. Jika terjadi gateway timeout pada model target tertentu, sarankan pengguna memilih model alternatif yang tersedia.

### 1.4 Skenario D: Kegagalan Ollama Lokal (Connection Refused)
- **Gejala**: Pesan error ramah `PROVIDER_UNAVAILABLE`: *"Server Ollama lokal tidak dapat dihubungi di http://127.0.0.1:11434"*.
- **Tindakan Pengguna / Operator**:
  1. Buka terminal lokal mesin dan jalankan:
     ```bash
     ollama serve
     ```
  2. Pastikan model lokal telah diunduh:
     ```bash
     ollama pull llama3.2
     ```
  3. Muat ulang antarmuka web; badge indikator Ollama akan otomatis berubah menjadi "Tersedia".

---

## 🧪 2. Penanganan Masalah Target Model Execution Playground

### 2.1 Timeout pada Eksekusi Model
- **Karakteristik**: Request eksekusi playground memakan waktu lebih dari 60 detik dan mengembalikan `ProviderTimeoutError`.
- **Penyebab Umum**: Model berukuran besar mengalami antrian panjang di provider atau nilai `maxOutputTokens` disetel terlalu tinggi.
- **Mitigasi**:
  1. Turunkan nilai `maxOutputTokens` (misal dari 2048 ke 512).
  2. Pilih model target yang lebih cepat (misal `gemini-2.5-flash` atau `llama-3.3-70b-versatile`).

### 2.2 Unresolved Placeholders Warning
- **Karakteristik**: Respons eksekusi playground menyertakan array `unresolvedPlaceholders` non-kosong.
- **Solusi**: Form UI secara otomatis menampilkan variabel yang belum terisi. Ingatkan pengguna untuk melengkapi nilai variabel sebelum mengeksekusi model guna mendapatkan hasil yang akurat.

---

## 💾 3. Prosedur Backup & Restore Database SQLite (`dev.db`)

Basis data SQLite menyimpan riwayat optimasi prompt pengguna secara lokal dan terisolasi.

### 3.1 Prosedur Pencadangan (Backup)
Jalankan perintah berikut di root monorepo:
```bash
npm run db:backup
```
- File cadangan disimpan otomatis dengan format timestamp: `packages/database/backups/dev-backup-YYYYMMDD-HHMMSS.db`.
- Script melakukan validasi jumlah baris dan integritas SQLite sebelum menyelesaikan proses.
- File cadangan diabaikan oleh Git via `.gitignore` sehingga tidak akan bocor ke remote repository.

### 3.2 Prosedur Pemulihan (Restore)
#### A. Uji Non-Destruktif (Dry-Run ke File Sementara)
Untuk memverifikasi keabsahan snapshot tanpa menimpa database aktif:
```bash
npm run db:restore -- --target /tmp/test-restore-verify.db
rm -f /tmp/test-restore-verify.db
```
#### B. Restore Penuh ke Database Aktif (`dev.db`)
Jika database aktif rusak atau tidak sengaja terhapus:
```bash
# Otomatis memilih backup terbaru:
npm run db:restore

# Atau memilih file spesifik:
npm run db:restore -- --file packages/database/backups/dev-backup-20261014-103959.db
```

---

## 🛡️ 4. Konfigurasi Pengerasan Keamanan Produksi (Production Hardening)

Sebelum mendaftarkan domain produksi atau membuka akses internet, pastikan parameter berikut tersetel di environment server:

| Variabel | Nilai Wajib | Keterangan & Tujuan |
|---|:---|---|
| `NODE_ENV` | `production` | Mengaktifkan optimasi Turbopack/Next.js dan validasi ketat. |
| `SESSION_SECRET` | String acak $\ge 32$ karakter | Digunakan untuk tanda tangan HMAC-SHA256 cookie sesi. Server gagal start (*fail-fast*) jika kurang dari 32 karakter. |
| `ALLOWED_ORIGINS` | `https://domain-resmi.com` | Membatasi origin untuk mencegah serangan CSRF lintas-domain. |
| `TRUST_PROXY` | `1` (atau `true`) | Aktifkan hanya jika di balik reverse proxy tepercaya (Nginx/Cloudflare) agar IP rate-limiter akurat. |
| `DATABASE_URL` | `file:./packages/database/prisma/dev.db` | Pastikan permission file database adalah `chmod 600`. |

---

## 📝 5. Template Laporan Insiden (Incident Report Post-Mortem)
Sesuai Blueprint v1.0 Bagian 21.5, jika terjadi gangguan produksi, operator wajib mendokumentasikan insiden menggunakan format berikut:

```markdown
# Laporan Insiden Produksi (Post-Mortem)

## 1. Ringkasan Eksekutif
- **ID Insiden**: INC-YYYYMMDD-01
- **Tanggal & Waktu**: YYYY-MM-DD HH:MM WIB
- **Tingkat Keparahan**: SEV-1 (Kritis) / SEV-2 (Tinggi) / SEV-3 (Sedang)
- **Layanan Terdampak**: API / Provider Adapter / Web UI / Database
- **Durasi Downtime**: XX menit
- **Lead Penanganan**: Nama Operator / Engineer

## 2. Dampak Pengguna
- Jumlah request yang gagal (HTTP 5xx): XX
- Dampak fungsional: Pengguna tidak dapat melakukan optimasi prompt / eksekusi playground

## 3. Garis Waktu Insiden (Timeline)
- **HH:MM**: Pemicu insiden terjadi (misal kuota provider habis).
- **HH:MM**: Sistem monitoring / alert mendeteksi anomali.
- **HH:MM**: Operator mengidentifikasi akar masalah.
- **HH:MM**: Tindakan mitigasi diterapkan (failover / restore).
- **HH:MM**: Layanan pulih penuh dan terverifikasi.

## 4. Akar Masalah (Root Cause Analysis - RCA)
Penjelasan mendalam mengapa insiden dapat terjadi (faktor teknis, kegagalan penyedia pihak ketiga, atau konfigurasi).

## 5. Tindakan Pencegahan & Rencana Aksi (Action Items)
1. [Action Item 1]: Penambahan kuota / rotasi kunci baru.
2. [Action Item 2]: Peningkatan ambang batas monitoring rate limit.
```
