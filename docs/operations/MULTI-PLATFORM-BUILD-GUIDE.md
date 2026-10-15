# PANDUAN DISTRIBUSI MULTI-PLATFORM PIEW v2.0
## Website, Software Desktop Windows (`.exe`), dan Aplikasi Android (`.apk`)

Dokumen ini merupakan panduan operasional resmi untuk membangun (*build*), mengemas (*package*), dan mendistribusikan **Prompt Intelligence Engineering Workspace (PIEW)** ke tiga target platform utama secara aman sesuai prinsip tata kelola **Blueprint v1.0 Bagian 1, 4.1, dan 15.2 (Data Minimization & Zero-Secret Governance)**.

---

## 1. Arsitektur Multi-Platform & Prinsip Keamanan "Zero-Secret Client"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SERVER BACKEND TERPUSAT (VPS / CLOUD)                 │
│  - Next.js API Routes (/api/optimize, /api/crawl, /api/spider, /api/history) │
│  - Groq LLM Provider Adapter (Key Pool tersimpan di .env Server)            │
│  - SQLite Database WAL (dev.db / production.db)                             │
│  - Rate Limiter, CSRF Guard, SSRF Guard, Anti-IDOR Authorization            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                   Koneksi Terenkripsi HTTPS / WSS API
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   TARGET 1:      │         │   TARGET 2:      │         │   TARGET 3:      │
│   WEBSITE WEB    │         │  DESKTOP WINDOWS │         │  ANDROID NATIVE  │
│ Browser Desktop  │         │   Installer .exe │         │   Aplikasi .apk  │
│  & Mobile PWA    │         │  (Tauri v2 Core) │         │ (Capacitor v6)   │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

### Aturan Emas Keamanan Klien (Blueprint 15.2):
1. **Dilarang Menanam API Key di File Klien**: Kunci API Groq (`GROQ_API_KEYS`) dan database kredensial **TIDAK PERNAH** dimasukkan ke dalam biner installer Windows (`.exe`), bundel Android (`.apk`), atau kode sisi klien browser (`NEXT_PUBLIC_*`).
2. **Arsitektur Thin-Client / Secure Wrapper**: Aplikasi Desktop dan Android berfungsi sebagai *secure presentation layer* yang berkomunikasi langsung dengan backend API server terverifikasi.
3. **Perlindungan Data Pengguna**: Sesuai Blueprint 5.5, teks prompt asli pengguna tidak disimpan secara permanen di storage lokal perangkat tanpa enkripsi dan tidak dicatat (*zero raw prompt logging*) ke log biner klien.

---

## 2. Target 1: Deployment Website Produksi

### A. Prasyarat Lingkungan
- **Node.js**: v18.0.0 atau lebih baru (direkomendasikan v20 LTS / v22)
- **NPM**: v9.0.0 atau lebih baru
- **Sistem Operasi**: Linux Ubuntu 22.04/24.04 LTS (VPS) atau penyedia PaaS (Vercel, Railway)

### B. Konfigurasi Lingkungan (`.env`)
Pastikan file `.env` di root server memiliki konfigurasi lengkap:
```bash
# Salin template resmi
cp .env.example .env

# Konfigurasi variabel wajib di server:
DATABASE_URL="file:./packages/database/prisma/dev.db"
GROQ_API_KEYS="gsk_key1,gsk_key2"
NEXT_PUBLIC_ENABLE_CRAWLER="true"
NEXT_PUBLIC_ENABLE_SPIDER="true"
CRAWLER_MAX_TIMEOUT_MS="10000"
CRAWLER_MAX_PAYLOAD_BYTES="524288"
SPIDER_MAX_CONCURRENCY="2"
SPIDER_DEFAULT_TIMEOUT_MS="15000"
```

### C. Langkah Build & Menjalankan Server
```bash
# 1. Pastikan seluruh dependensi terpasang
npm install

# 2. Kompilasi prisma client dan monorepo
npx prisma generate --schema=packages/database/prisma/schema.prisma
npm run build

# 3. Jalankan aplikasi web di mode produksi (port 3000)
npm run start --workspace=web
```

### D. Menjalankan Layanan Otomatis (PM2 Daemon)
Untuk menjaga aplikasi tetap berjalan 24/7 di VPS Linux:
```bash
pm2 start "npm run start --workspace=web" --name "piew-web-production"
pm2 save
```

### E. Konfigurasi Nginx Reverse Proxy & SSL Let's Encrypt
```nginx
server {
    server_name piew.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. Target 2: Software Desktop Windows (`.exe` / `.msi`) via Tauri v2

Aplikasi desktop Windows dibangun menggunakan **Tauri v2**, menghasilkan installer mandiri (`.exe`) yang sangat ringan (<15 MB), cepat, dan hemat memori dibanding Electron.

### A. Prasyarat Pembangunan di Mesin Windows
1. **Node.js**: v18+ & npm.
2. **Rust Toolchain**: Pasang via `rustup` dari [rustup.rs](https://rustup.rs/):
   ```powershell
   rustup default stable-x86_64-pc-windows-msvc
   ```
3. **Microsoft C++ Build Tools**: Instal paket *Desktop development with C++* melalui Visual Studio Installer.
4. **WebView2 Runtime**: Bawaan di Windows 10/11.

### B. Konfigurasi Pembungkus (`tauri.conf.json`)
Template resmi telah disiapkan di `docs/operations/packaging/tauri.conf.json`:
- Mengatur ukuran jendela ideal (1280x840, min 960x640).
- Mengatur target distribusi installer NSIS (`.exe`) dan Windows Installer (`.msi`).
- Menetapkan Content Security Policy (CSP) ketat untuk mencegah serangan XSS.

### C. Langkah Membangun Installer `.exe`
Jalankan perintah berikut di PowerShell mesin Windows:

```powershell
# 1. Masuk ke root direktori proyek
cd prompt-workspace

# 2. Pasang Tauri CLI (jika belum terpasang global)
npm install --save-dev @tauri-apps/cli@^2.0.0

# 3. Salin konfigurasi packaging ke folder sumber Tauri
# (Jika baru pertama kali, inisialisasi dengan npx tauri init, lalu gantikan tauri.conf.json)
Copy-Item "docs/operations/packaging/tauri.conf.json" -Destination "src-tauri/tauri.conf.json"

# 4. Mode Pengujian Desktop (Live Development)
npx tauri dev

# 5. Kompilasi Installer Produksi (.exe)
npx tauri build
```

### D. Lokasi Output Berkas Windows
Setelah proses *build* selesai, berkas executable installer akan berada di:
- **Installer Mandiri (`.exe`)**:
  `src-tauri/target/release/bundle/nsis/PIEW_2.0.0_x64-setup.exe`
- **Windows Installer Package (`.msi`)**:
  `src-tauri/target/release/bundle/msi/PIEW_2.0.0_x64_en-US.msi`

Pengguna Windows cukup mengunduh dan menjalankan file `PIEW_2.0.0_x64-setup.exe` untuk memasang software di PC mereka.

---

## 4. Target 3: Aplikasi HP Android (`.apk`) via Capacitor v6

Aplikasi mobile Android dikemas menggunakan **Capacitor v6**, membungkus aplikasi web responsif menjadi file `.apk` native Android tanpa menurunkan performa UI.

### A. Prasyarat Pembangunan Android
1. **Java Development Kit (JDK)**: JDK 17 (disarankan Eclipse Temurin atau OpenJDK 17).
2. **Android Studio**: Versi terbaru (Ladybug atau Koala).
3. **Android SDK Platform**: API Level 34 (Android 14) atau API Level 33.
4. **Android SDK Build-Tools**: 34.0.0.

### B. Konfigurasi Pembungkus (`capacitor.config.json`)
Template resmi telah disiapkan di `docs/operations/packaging/capacitor.config.json`:
- **App ID**: `com.promptworkspace.piew`
- **App Name**: `PIEW - Prompt Intelligence Engineering Workspace`
- **Server URL**: Menghubungkan aplikasi Android ke server API produksi backend.
- **Keamanan Android**: `allowMixedContent: false`, `cleartext: false`, `webContentsDebuggingEnabled: false`.

### C. Langkah Membangun Berkas `.apk`
Jalankan perintah berikut di terminal:

```bash
# 1. Pasang dependensi inti Capacitor di workspace web
npm install @capacitor/core@^6.0.0 @capacitor/cli@^6.0.0 @capacitor/android@^6.0.0 --workspace=web

# 2. Salin template konfigurasi resmi ke workspace web
cp docs/operations/packaging/capacitor.config.json apps/web/capacitor.config.json

# 3. Build aset statis Next.js
npm run build --workspace=web

# 4. Tambahkan platform Android ke dalam proyek
npx cap add android

# 5. Sinkronkan kode dan aset web ke proyek Android
npx cap sync android

# 6. Kompilasi APK menggunakan Gradle Wrapper
cd android

# Untuk menghasilkan APK Rilis siap pakai:
./gradlew assembleRelease

# Atau untuk pengujian lokal langsung di HP (Debug APK):
./gradlew assembleDebug
```

### D. Lokasi Output Berkas Android
Berkas APK yang siap didistribusikan ke pengguna atau diuji langsung di smartphone Android berada di:
- **Debug APK (Pengujian Langsung)**:
  `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK (Distribusi Pengguna)**:
  `android/app/build/outputs/apk/release/app-release-unsigned.apk` (atau `app-release.apk` setelah proses code signing menggunakan `zipalign` & `apksigner`).

---

## 5. Checklist Verifikasi & Audit Keamanan Pasca-Build

Sebelum mendistribusikan berkas `.exe` atau `.apk` ke pengguna:

| Pemeriksaan Keamanan | Tolok Ukur Keberhasilan | Status |
|---|---|---|
| **Zero Secret Leakage** | Tidak ada string `gsk_`, kredensial DB, atau API Key di biner `.exe` / `.apk` | WAJIB PASS |
| **Enkripsi Komunikasi** | Seluruh panggilan API ke backend menggunakan protokol HTTPS/TLS 1.3 | WAJIB PASS |
| **CORS & Domain Whitelisting** | Backend hanya menerima origin resmi aplikasi dan domain terdaftar | WAJIB PASS |
| **Feature Flags / Kill-Switch** | Backend dapat menonaktifkan Crawler/Spider secara instan tanpa update klien | WAJIB PASS |
| **Integritas Database Server** | Database SQLite server terjaga di volume privat dengan backup terjadwal | WAJIB PASS |

Jalankan perintah verifikasi otomatis:
```bash
npm run test:multiplatform
```
Skrip ini akan memvalidasi kelengkapan berkas konfigurasi, sintaks skema, dan memastikan nol kredensial rahasia yang bocor ke artefak pembungkus klien.
