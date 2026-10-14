# Catatan Rilis: PIEW v1.0.0-mvp (Prompt Intelligence Engineering Workspace)
**Tanggal Rilis**: 14 Oktober 2026  
**Status Baseline**: Beku (Frozen Baseline v1.0.0)

---

## 🎯 1. Ikhtisar Rilis
Prompt Intelligence Engineering Workspace (PIEW) v1.0.0-mvp menandai rilis stabil pertama dari sistem diagnostik dan rekayasa prompt berbasis kecerdasan buatan. Rilis ini menggabungkan antarmuka modern yang responsif dengan pipeline rekayasa prompt 3-tahap (Analyzer, Optimizer, Evaluator), perlindungan kepemilikan data pengguna (Data Ownership), dan otomasi pemeliharaan database SQLite.

---

## 🔍 2. Taksonomi 8 Kategori Celah Analisis (Analyzer)
Komponen `Analyzer` mengevaluasi prompt mentah pengguna dan memetakan kelemahan instruksi ke dalam taksonomi terstandarisasi:

1. **Ambiguity**: Penggunaan kata ambigu tanpa tolok ukur terukur (misal: "bagus", "cepat", "lengkap").
2. **Context**: Ketiadaan latar belakang domain, peran sistem, atau konteks penggunaan.
3. **Goal/Objective**: Tujuan akhir yang kabur atau memiliki multitafsir.
4. **Constraints**: Ketiadaan batasan teknis (panjang teks, lisensi, batasan waktu, resource).
5. **Output Format**: Format keluaran yang tidak terdefinisi secara terstruktur (JSON, Markdown, tabel).
6. **Edge Cases & Assumptions**: Asumsi tak terucap atau kegagalan mengantisipasi skenario kegagalan.
7. **Tone & Style**: Ketidakjelasan register bahasa, audiens sasaran, dan gaya komunikasi.
8. **Security & Injection Risks**: Potensi kerentanan terhadap prompt injection atau kebocoran data.

---

## ⚡ 3. Aturan *Intent Preservation* (Optimizer)
Komponen `Optimizer` merekonstruksi prompt berdasarkan hasil temuan analisis dengan kepatuhan mutlak pada aturan **Preserve Intent** (Blueprint Bagian 5.5):
- **Zero Fabrication**: Tidak mengarang variabel, URL, selector, nama tabel, atau fakta yang tidak diberikan pengguna.
- **Structural Scaffolding**: Menyusun ulang prompt ke dalam format profesional: Peran (Role), Konteks (Context), Tugas Inti (Core Task), Batasan (Constraints), dan Format Keluaran (Output Format).
- **Explicit Placeholders**: Menyediakan placeholder eksplisit (misal: `[MASUKKAN_URL_TARGET]`) untuk informasi penting yang belum disediakan pengguna, alih-alih membuat asumsi liar.
- **User Control**: Menampilkan perbandingan visual *side-by-side diff* sehingga pengguna memiliki kontrol penuh untuk menerima, mengedit, atau menolak usulan optimasi.

---

## ⚖️ 4. Tiga Pilar Evaluator (*LLM-as-a-Judge* Gate 3)
Komponen `Evaluator` bertindak sebagai auditor independen yang menilai prompt hasil optimasi terhadap prompt asli:

1. **Pilar 1 — Intent Preservation Score (Bobot 40%)**:
   Mengukur apakah maksud dan tujuan asli pengguna tetap terjaga 100% tanpa distorsi domain atau penambahan asumsi sepihak.
2. **Pilar 2 — Clarity & Structural Quality Score (Bobot 35%)**:
   Mengukur kejelasan tata bahasa, kelengkapan parameter teknis, dan modularitas format scaffolding.
3. **Pilar 3 — Absence of Deceptive Certainty / Anti-Halusinasi (Bobot 25%)**:
   Memastikan prompt yang dihasilkan tidak mengandung klaim kepastian palsu (misal: mengklaim kode pasti berhasil tanpa pengujian nyata).

---

## 📊 5. Hasil Pengujian Baseline Fixture (PIW-BL-001 s/d PIW-BL-005)
Evaluasi komprehensif dijalankan menggunakan dataset uji terstandarisasi di `test-fixtures/baseline-prompts.json`:

| Fixture ID | Domain | Prompt Mentah | Skor Awal | Skor Evaluasi Hasil | Status Verifikasi |
|:---|:---|:---|:---:|:---:|:---:|
| **PIW-BL-001** | Software Development | *"Buatkan saya kode Python untuk web scraping."* | **25 / 100** | **95 / 100** | **PASSED** ✅ |
| **PIW-BL-002** | Penulisan Akademik | *"Tulis esai tentang AI yang bagus dan lengkap."* | **32 / 100** | **98 / 100** | **PASSED** ✅ |
| **PIW-BL-003** | Bisnis & Riset Pasar | *"Bantu saya riset pasar dan kasih kesimpulan apakah bisnis ini akan sukses."* | **32 / 100** | **98 / 100** | **PASSED** ✅ |
| **PIW-BL-004** | Debugging Software | *"Kode saya error. Tolong perbaiki sampai jalan."* | **22 / 100** | **96 / 100** | **PASSED** ✅ |
| **PIW-BL-005** | Perencanaan Produk | *"Buatkan roadmap aplikasi AI dari awal sampai jadi produk besar yang canggih."* | **35 / 100** | **96 / 100** | **PASSED** ✅ |

*Rata-rata peningkatan kualitas prompt dari baseline*: **+67.6 poin** (Peningkatan signifikan pada kejelasan instruksi dan penegakan batasan).

---

## ⚠️ 6. Batasan Sistem yang Dinyatakan Secara Jujur (Honest Limitations)
Sesuai prinsip etika kecerdasan buatan pada Blueprint PIEW:
1. **Evaluasi Berbasis Rubrik & Judge LLM**: Skor evaluasi yang dihasilkan merupakan penilaian analitis berbasis rubrik heuristik dan LLM Auditor. Sistem **tidak mengklaim** telah mengeksekusi prompt secara nyata pada lingkungan eksekusi *downstream* pihak ketiga (misal: menjalankan kode Python di runtime riil atau mempublikasikan esai ke jurnal).
2. **Ketergantungan Model Eksternal**: Efektivitas analisis sangat dipengaruhi oleh stabilitas respons provider LLM (Groq Llama 3.3). Meskipun dilengkapi pool rotasi multi-kunci, latensi jaringan publik tetap dapat memengaruhi kecepatan pemrosesan.
3. **Session Berbasis Perangkat**: Autentikasi sesi MVP menggunakan cookie bertanda tangan HMAC-SHA256 yang tersimpan pada browser pengguna. Riwayat prompt saat ini terisolasi per perangkat/browser dan belum tersinkronisasi lintas perangkat sebelum fitur akun multi-device diaktifkan pada roadmap berikutnya.
