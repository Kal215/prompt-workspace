# Kebijakan Keamanan & Tata Kelola Rahasia (Security Policy)
**Prompt Intelligence Engineering Workspace (PIEW)**

Keamanan sistem dan privasi data pengguna adalah prioritas mutlak dalam perancangan PIEW. Dokumen ini mendefinisikan kebijakan pengungkapan kerentanan secara bertanggung jawab (*Responsible Disclosure*), klasifikasi data, pencegahan kebocoran kredensial, serta prosedur darurat rotasi rahasia (*Secret Rotation SOP*) sesuai dengan **Blueprint v1.0 Bagian 15.1 & 15.2**.

---

## 🔒 1. Pelaporan Kerentanan Keamanan (Responsible Disclosure)

Jika Anda menemukan celah keamanan (*vulnerability*) atau potensi kebocoran data pada repositori ini:

1. **JANGAN membuat issue publik di GitHub**.
2. Kirimkan laporan rinci secara rahasia melalui:
   - Email: `security@prompt-workspace.internal` (atau kontak Project Maintainer langsung).
   - Buat **GitHub Private Security Advisory** melalui tab *Security* > *Advisories* pada repositori ini.
3. Laporan yang baik memuat:
   - Deskripsi kerentanan dan potensi dampaknya.
   - Langkah reproduksi konkret (*Proof of Concept / PoC*).
   - Saran perbaikan (jika ada).
4. Tim inti akan merespons dalam waktu **1x24 jam** dan memberikan status mitigasi sebelum pengungkapan publik dilakukan.

---

## 🏷️ 2. Klasifikasi Data & Pembatasan Akses (Blueprint Bagian 15.1)

| Klasifikasi | Cakupan Data | Perlakuan & Aturan Penyimpanan |
|:---|:---|:---|
| **Level 1: Public / Bebas** | Dokumentasi publik, metadata domain packs, daftar nama model LLM publik. | Boleh dikomit ke repositori publik dan di-cache secara bebas di browser. |
| **Level 2: Internal Session** | Cookie sesi bertanda tangan `piw_session`, riwayat prompt pengguna tersimpan di `SavedPrompt`, data kasus uji `testInput`. | Wajib dienkripsi/ditandatangani dengan HMAC-SHA256. Akses diisolasi per-`userId`. Dilarang dibagikan lintas sesi. |
| **Level 3: Confidential / Secrets** | Kunci API Groq, Gemini, OpenRouter, string rahasia `SESSION_SECRET`, file database `dev.db`. | **DILARANG KERAS ter-commit ke Git**. Dikelola eksklusif melalui environment variable server dan disensor otomatis oleh `SafeLogger`. |

---

## 🛡️ 3. Larangan Mutlak Kebocoran Kredensial (Zero-Secret Governance)

1. **Pencegahan di Git**:
   - File `.env`, `.env.local`, dan seluruh file database SQLite (`*.db`) wajib terdaftar di `.gitignore`.
   - Modul `scripts/release-readiness-check.mjs` memvalidasi secara otomatis bahwa tidak ada secret nyata yang lolos ke staging Git.
2. **Data Minimization pada Logging**:
   - Seluruh modul internal wajib menggunakan `SafeLogger`.
   - Pola kunci API (`gsk_...`, `AIzaSy...`, `sk-or-...`, `sk-...`, dan token `Bearer`) otomatis disensor menjadi `[REDACTED_API_KEY]`.
   - Isi teks prompt mentah pengguna dan respons mentah LLM **tidak boleh** dicatat ke log server permanen.

---

## 🚨 4. Prosedur Darurat Rotasi Kunci & Rahasia (Secret Rotation SOP)

Jika terjadi insiden kebocoran kunci API atau kunci terkompromikan:

### Skenario A: Kunci API Provider Bocor (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`)
1. **Revokasi Segera**:
   - Buka console penyedia (Groq Console, Google AI Studio, atau OpenRouter Dashboard).
   - Hapus atau nonaktifkan kunci yang bocor secara instan.
2. **Penerbitan Kunci Baru**:
   - Buat kunci API baru di masing-masing platform console.
3. **Pembaruan Konfigurasi Server**:
   - Perbarui nilai di file `.env` server:
     ```bash
     GROQ_API_KEY_1="gsk_kunci_baru..."
     GEMINI_API_KEY="AIzaSy_kunci_baru..."
     ```
4. **Verifikasi Kesiapan**:
   - Jalankan audit:
     ```bash
     npm run test --workspace=@prompt-workspace/provider-adapters
     ```

### Skenario B: Kunci Sesi Bocor (`SESSION_SECRET`)
1. **Generasi Secret Baru**:
   Buat string acak 64-karakter menggunakan OpenSSL:
   ```bash
   openssl rand -hex 32
   ```
2. **Pembaruan Environment**:
   Ganti nilai `SESSION_SECRET` di `.env` server produksi.
3. **Dampak Operasional**:
   - Seluruh cookie sesi pengguna yang ada akan otomatis menjadi tidak valid (karena tanda tangan HMAC tidak cocok lagi).
   - Pengguna akan otomatis diterbitkan sesi baru pada request berikutnya tanpa kehilangan data tersimpan di basis data.

---

## 📋 5. Versi & Kebijakan Pemeliharaan Keamanan

| Versi PIEW | Status Dukungan | Pembaruan Keamanan |
|:---|:---:|:---|
| **v1.1.x** (Saat ini) | **Aktif** | Menerima patch keamanan reguler & hotfix langsung. |
| **v1.0.x** (Legacy) | Terbatas | Patch keamanan kritis hanya jika diminta. |
