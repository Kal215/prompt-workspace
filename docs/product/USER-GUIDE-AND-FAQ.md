# Panduan Pengguna & Tanya Jawab Umum (User Guide & FAQ)
**Prompt Intelligence Engineering Workspace (PIEW) — Versi 1.1.0**

Dokumen ini adalah panduan operasional resmi bagi pengguna akhir (prompt engineers, peneliti, pengembang software, dan analis bisnis) serta pengembang sistem dalam memanfaatkan seluruh kapabilitas platform PIEW v1.1.0 secara efektif, aman, dan berstandar industri.

---

## 📖 1. Alur Kerja Utama (Core Workflow)

Aplikasi PIEW dirancang dengan filosofi **"Analyze Before Optimize"** dan **"Preserve Intent"** (Blueprint v1.0 Bagian 3 & 4). Alur kerja dasar terdiri dari 4 langkah berurutan:

```text
[1. Input Prompt & Konfigurasi] 
             │
             ▼
[2. Analisis Diagnostik (8 Celah)] ──► [Intent Guard: Verifikasi Maksud Asli]
             │
             ▼
[3. Rekonstruksi & Diff Viewer] ──► [Evaluasi Skor Rubrik Independen]
             │
             ▼
[4. Playground Eksekusi Model] ──► [Simpan Riwayat / Salin Prompt Final]
```

---

## 🛠️ 2. Langkah Penggunaan Aplikasi

### 2.1 Memasukkan Prompt & Memilih Mode Domain (Fitur C1)
1. Buka antarmuka workspace pada browser (`http://localhost:3000` atau URL deployment produksi).
2. Ketik atau tempelkan prompt mentah Anda pada kotak input **Prompt Asli (Original Prompt)**.
3. Masukkan **Konteks Tambahan** atau **Batasan (Constraints)** pada kolom yang disediakan jika relevan.
4. Pilih **Mode Domain (Domain Rule Pack)** pada dropdown selector:
   - **🌐 General (Default)**: Mode umum dengan scaffolding fleksibel untuk aneka kebutuhan percakapan, ringkasan, atau penulisan kreatif.
   - **💻 Software Engineering (Coding)**: Menegakkan standar clean code, penanganan edge cases, validasi tipe, dan pembatasan halusinasi library pihak ketiga.
   - **🐞 Debugging & Troubleshooting**: Mengharuskan pendekatan diagnosis berbasis akar masalah (*Root Cause Analysis*), isolasi hipotesis, dan langkah reproduksi sistematis.
   - **🎓 Academic & Scientific Writing**: Menegakkan nada formal, metodologi ilmiah, batasan sitasi (larangan mengarang sumber/paper), dan argumen berbasis bukti.
   - **📈 Business & Strategic Analysis**: Mengharuskan struktur eksekutif (MECE/SWOT), rekomendasi berbasis metrik terukur, analisis trade-off, dan mitigasi risiko operasional.

### 2.2 Memilih Penyedia AI & Model Tujuan (Fitur C2)
1. Pada bilah konfigurasi provider, pilih **Penyedia AI (AI Provider)**:
   - **Groq (Default & Rekomendasi)**: Eksekusi berkecepatan ultra-tinggi (*low latency*) dengan rotasi 6 API key otomatis.
   - **Google Gemini**: Menggunakan model penalaran Gemini (misal `gemini-2.5-flash` atau `gemini-2.5-pro`).
   - **OpenRouter**: Akses katalog multi-model global (misal `meta-llama/llama-3.3-70b-instruct`, DeepSeek, Anthropic, dll.).
   - **Ollama (Lokal / Offline)**: Eksekusi 100% lokal di mesin sendiri tanpa pengiriman data keluar (default port `11434`, model `llama3.2`).
2. Badge status **Configured / Tersedia** akan menampilkan warna hijau jika kunci API atau endpoint lokal aktif. Sistem menerapkan prinsip **Zero-Secret Leakage**: kunci API Anda tidak pernah ditampilkan atau dibocorkan ke UI browser.
3. Anda dapat menentukan **Target Model** secara spesifik atau membiarkannya kosong untuk menggunakan model default resmi masing-masing provider.

### 2.3 Memulai Proses Optimasi
- Klik tombol **"Optimalkan Prompt"** (atau tekan tombol pintas `Ctrl + Enter` / `Cmd + Enter`).
- Sistem akan menjalankan pipeline tiga tahap secara otomatis:
  1. *Prompt Analyzer*: Mendeteksi kelemahan struktural.
  2. *Prompt Optimizer*: Merekonstruksi prompt dengan injeksi scaffolding domain.
  3. *Quality Evaluator*: Menilai prompt hasil optimasi menggunakan LLM-as-a-Judge independen.

---

## 🔍 3. Membaca & Memahami Hasil Optimasi

### 3.1 Panel Analisis Diagnostik (Taksonomi 8 Kategori)
Sistem membedah kelemahan prompt mentah berdasarkan taksonomi resmi:
1. `ROLE`: Ketiadaan peran/persona ahli yang spesifik.
2. `CONTEXT`: Kekurangan latar belakang situasi atau domain masalah.
3. `INSTRUCTION`: Instruksi tugas ambigu atau terlalu luas.
4. `CONSTRAINTS`: Batasan teknis, format, atau batasan negatif tidak dinyatakan.
5. `OUTPUT_FORMAT`: Struktur keluaran tidak didefinisikan (misal JSON, Markdown, tabel).
6. `EXAMPLES`: Ketiadaan contoh input/output (*few-shot examples*).
7. `EVALUATION_CRITERIA`: Ketiadaan rubrik sukses atau standar kualitas keluaran.
8. `REASONING_STEPS`: Ketiadaan instruksi penalaran bertahap (*chain-of-thought*).

Setiap celah diberi lencana tingkat keparahan:
- 🔴 **CRITICAL**: Wajib diperbaiki; berpotensi tinggi memicu halusinasi atau kegagalan tugas total.
- 🟡 **WARNING**: Sangat dianjurkan diperbaiki untuk meningkatkan kualitas konsistensi output.
- 🔵 **SUGGESTION**: Rekomendasi penyempurnaan profesional.

### 3.2 Kartu Intent Guard (Preserve Intent)
Kartu ini membuktikan bahwa platform **tidak mengubah esensi tujuan pengguna** (Blueprint Bagian 5.5). Periksa 4 indikator integritas:
- **Core Goal**: Ringkasan tujuan inti pengguna yang berhasil dipertahankan.
- **Identified Domain**: Klasifikasi domain yang terdeteksi dari prompt Anda.
- **Preserved Constraints**: Daftar batasan asli pengguna yang tetap dijaga tanpa dikurangi.
- **Added Scaffolding**: Daftar teknik struktural baru yang ditambahkan tanpa mendistorsi maksud.

### 3.3 Diff Viewer (Original vs Optimized)
- Tab visual yang memperlihatkan perbandingan berdampingan (*Side-by-Side*) atau berurutan (*Unified*).
- Bagian hijau menandakan penambahan scaffolding struktural, panduan format, atau variabel placeholder `[MASUKKAN_...]`.

### 3.4 Skor Rubrik Evaluasi (*Evidence Over Claims*)
- Skor kualitas 0–100 yang dinilai oleh auditor independen meliputi aspek kejelasan (*clarity*), spesifisitas (*specificity*), kelengkapan batasan (*constraint completeness*), dan kepatuhan domain (*domain adherence*).
- **Batasan Statis**: Skor ini adalah estimasi struktural awal. Kualitas performa sesungguhnya harus diverifikasi melalui eksekusi nyata pada Target Model Playground.

---

## 🧪 4. Menggunakan Target Model Execution Playground (Fitur C3)

Fitur C3 memungkinkan Anda menguji prompt hasil optimasi secara langsung pada model tujuan sebelum digunakan di lingkungan produksi nyata.

### 4.1 Mengisi Variabel Placeholder
Prompt hasil optimasi sering kali menyertakan penampung variabel berformat `[HURUF_KAPITAL]` (misal: `[MASUKKAN_BAHASA]`, `[TARGET_AUDIENS]`) atau `{{nama_variabel}}`.
1. Sistem secara otomatis mendeteksi seluruh placeholder dan menampilkannya sebagai form isian dinamis.
2. Isi nilai yang sesuai untuk setiap variabel.
3. Jika terdapat placeholder yang belum diisi, sistem akan menampilkan peringatan transparan `unresolvedPlaceholders` sebelum eksekusi.

### 4.2 Menambahkan Kasus Uji (Test Case Input)
- Pada kolom **Input Kasus Uji (Test Input)**, Anda dapat memasukkan contoh data konkret (misalnya potongan kode buggy, kutipan artikel akademis, atau laporan keuangan mentah).
- Sistem akan menggabungkan data ini secara aman di bawah blok khusus `--- KASUS UJI / TEST CASE INPUT ---`.

### 4.3 Mengatur Parameter Eksekusi
- **Temperature (0.0 s/d 2.0, Default: 0.3)**:
  - Gunakan `0.1 – 0.3` untuk tugas deterministik (coding, ekstraksi data, debugging, analisis fakta).
  - Gunakan `0.7 – 1.0` untuk tugas kreatif atau brainstorming ide baru.
- **Max Output Tokens (64 s/d 2048, Default: 1024)**: Batas panjang respons untuk mengontrol biaya token dan mencegah pengulangan tak berujung.

### 4.4 Menjalankan & Memahami Nondeterminism
- Klik **"Jalankan di Target Model"**.
- Periksa respons nyata dari model, durasi latensi (ms), dan konsumsi token (prompt/completion/total).
- **Pemberitahuan Nondeterminism**: Model bahasa generatif bersifat probabilistik. Eksekusi prompt dengan prompt dan parameter yang sama pada waktu berbeda dapat menghasilkan variasi kata. Evaluasi konsistensi hasil dengan menjalankan 2–3 kali jika diperlukan.

---

## 💾 5. Mengelola Hasil & Riwayat Sesi (History)

### 5.1 Tindakan pada Hasil
- **Salin Prompt (Copy)**: Menyalin teks prompt hasil optimasi atau prompt hasil resolusi playground ke clipboard.
- **Edit Manual**: Anda dapat menyempurnakan prompt optimasi secara langsung di editor teks sebelum menjalankannya di playground.
- **Simpan ke Riwayat (Save)**: Menyimpan sesi optimasi ke basis data lokal terisolasi (`dev.db`).

### 5.2 Manajemen Riwayat Sesi (History Panel)
- Panel Riwayat menampilkan daftar prompt yang disimpan, lengkap dengan waktu penyimpanan, domain pack, provider, dan skor kualitas.
- **Buka Sesi**: Mengklik item riwayat akan memuat kembali prompt asli, prompt teroptimasi, dan metadata sesi ke antarmuka utama.
- **Hapus Sesi**: Klik tombol hapus (ikon tempat sampah) untuk menghapus record prompt secara permanen dari basis data Anda.

---

## 🔒 6. Panduan Privasi, Keamanan & Etika Data

Sesuai komitmen **Data Minimization & Confidentiality** (Blueprint v1.0 Bagian 15.2):

1. **Larangan Keras Memasukkan Rahasia / Kredensial**:
   - **JANGAN PERNAH** memasukkan kunci API, token OAuth, password, sertifikat privat, data pribadi sensitif (NIK, nomor kartu kredit, rekam medis), atau informasi rahasia perusahaan ke dalam kolom prompt atau test input.
   - Gunakan selalu variabel placeholder sintetis (misal `[MASUKKAN_API_KEY_DUMMY]` atau `[TOKEN_PENGGANTI]`).
2. **Penyensoran Log Otomatis (*SafeLogger*)**:
   - Server backend PIEW menerapkan sensor regex otomatis untuk menyembunyikan pola API key dan token otorisasi dari log konsol.
   - Isi teks mentah prompt Anda tidak dicatat ke log server operasional secara permanen.
3. **Isolasi Pengguna Multi-Tenant**:
   - Setiap pengguna memiliki sesi bertanda tangan kriptografis (`piw_session` HMAC-SHA256). Anda hanya dapat membaca dan menghapus riwayat prompt milik sesi Anda sendiri.
4. **Pelaporan Isu / Intent Drift**:
   - Jika Anda menemukan kasus di mana Prompt Optimizer mengubah esensi tujuan asli (*Intent Drift*) atau melanggar batasan yang Anda berikan, laporkan temuan tersebut via issue repositori GitHub dengan menyertakan teks prompt mentah (yang telah disensor) dan ID versi domain pack yang digunakan.

---

## ❓ 7. Tanya Jawab Umum (FAQ)

### Q1: Apakah prompt hasil optimasi dijamin 100% bebas halusinasi?
> **Tidak.** Rekayasa prompt tingkat lanjut secara drastis menekan kemungkinan halusinasi melalui instruksi pembatasan ketat (*negative constraints*), penegakan format, dan peran ahli. Namun, LLM target pada hakikatnya tetap model probabilistik. Selalu lakukan validasi manual pada keluaran kritis.

### Q2: Mengapa penyedia Ollama saya berstatus "Tidak Terkonfigurasi"?
> Status Ollama mengecek ketersediaan server Ollama di komputer lokal Anda pada port `11434`. Pastikan Anda telah menginstal Ollama dan menjalankan perintah `ollama serve` di terminal Anda. Anda juga perlu mengunduh model yang dituju (misal: `ollama run llama3.2`).

### Q3: Apakah kunci API saya tersimpan di server PIEW?
> **Tidak.** Kunci API hanya dibaca dari environment lokal mesin tempat server dijalankan (`.env`). API capabilities endpoint hanya mengekspos status boolean `configured: true/false` dan tidak pernah mengirimkan nilai string kunci API ke browser klien.

### Q4: Apa perbedaan antara Mode General dan Domain Packs spesifik?
> Mode General menerapkan scaffolding umum yang cocok untuk semua percakapan. Domain Packs (Coding, Debugging, Academic Writing, Business Strategy) menginjeksikan aturan taksonomi spesifik, istilah teknis terstandarisasi, serta guardrails keselamatan domain (seperti larangan mengarang sitasi ilmiah pada mode Academic).

### Q5: Bagaimana cara mengekspor riwayat prompt saya?
> Anda dapat menyalin teks prompt secara langsung atau mencadangkan file database SQLite Anda menggunakan perintah `npm run db:backup` di terminal server. File cadangan akan tersimpan rapi di direktori `packages/database/backups/`.
