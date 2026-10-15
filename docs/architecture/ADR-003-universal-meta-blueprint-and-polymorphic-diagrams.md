# ADR-003: Universal Meta-Blueprint Architecture & Polymorphic Diagram Generator (Tahap A)
**Prompt Intelligence Engineering Workspace (PIEW) — Versi 2.3.0-draft**

- **Status**: Proposed / Draf Pedoman Kanonis
- **Tanggal Penyusunan**: 16 Oktober 2026
- **Target Rilis**: PIEW v2.3.0
- **Penulis**: AI Architecture Team & Platform Engineers
- **Acuan Utama**: Diskusi Visi Produk Bersama Stakeholder (Tahap A vs Tahap B)

---

## 1. Konteks & Latar Belakang Masalah

Pada rilis PIEW v1.0 hingga v2.2, sistem optimasi prompt telah berhasil membangun fondasi kuat:
1. Analisis 8 taksonomi dan domain packs terkurasi (v1.0 - v1.1).
2. Crawler dokumen resmi, benchmark Spider paralel, dan loop perbaikan mandiri (v2.0).
3. Cache deterministik SHA-256 (0ms), presisi 3 style presets, dan MCP Server universal (v2.2).

Meskipun demikian, terdapat satu **keterbatasan filosofis utama**:
Sebagian besar engine prompt di industri (termasuk generator prompt konvensional) hanya menggunakan **"satu kacamata tunggal"**:
- Sering kali terjebak dalam kacamata software development saja (misalnya memaksakan istilah database, REST API, dan Prisma pada semua prompt).
- Jika seorang anak SMA bertanya tentang tugas Biologi, ia tidak butuh skema database SQL.
- Sebaliknya, jika seorang ilmuwan atau mahasiswa skripsi meminta metodologi riset, prompt 1-2 paragraf umum terlalu dangkal dan tidak berguna secara akademis.
- Jika seorang pengusaha UMKM atau manajer kantor meminta strategi peluncuran produk, mereka membutuhkan alur proses bisnis (SOP), pembagian peran (RACI), mitigasi risiko finansial, dan timeline (Gantt chart), bukan kode sumber software.

### Visi Besar Solusi
Membangun **Universal Meta-Blueprint Engine** di dalam `packages/prompt-engine` dan `packages/domain-rules`.
Sistem ini mampu mengubah **1 kalimat permintaan mentah dari bidang apa pun dan kalangan apa pun** menjadi **Cetak Biru Eksekusi Kelas Dunia (Executive Master Blueprint 10-Bagian)** yang dilengkapi:
1. Tim dewan pakar multi-disiplin (*Role & Responsibilities*).
2. Parameter konteks dengan pemisahan fakta vs asumsi (*Smart Assumptions*).
3. Diagram visual berbasis kode deklaratif (**Mermaid.js**) yang relevan dengan domainnya.
4. Rangkaian tahapan eksekusi dari hulu ke hilir (*Phase 0* hingga *Phase Final Handover*) beserta artefak dokumen nyata di setiap fase.
5. Standar dan batasan negatif domain (*Negative Constraints / Guardrails*).
6. Protokol eksekusi AI Agent terstruktur (*Inspect -> Plan -> Implement -> Verify -> Report*).
7. Pelacakan kerja terukur (*DONE vs VERIFIED*).
8. Kriteria keberhasilan obyektif (*Definition of Done*).

---

## 2. Prinsip Disiplin Dua Tahap (Strict Two-Stage Sequence)

Untuk mencegah kekacauan arsitektur dan kegagalan eksekusi, pengembangan dibagi secara kaku menjadi 2 tahap serial:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SEKUENSI DISIPLIN PENGEMBANGAN                       │
└────────────────────────────────────────────────────────────────────────┘

    [ TAHAP A: INTI CETAK BIRU & GENERATOR DIAGRAM (FOKUS SEKARANG) ]
    ├── Universal 10-Stage Master Structure
    ├── 4-Tier Audience & Complexity Calibration
    ├── Polymorphic Mermaid Diagram Generator (ERD, DFD, PRISMA, SOP, Mindmap)
    └── Cross-Artifact Consistency Guard (Anti-Halusinasi Entitas)
                                │
                                ▼ [GATE VERIFIKASI 5 BENCHMARK EMAS]
    [ Apakah Tahap A 100% Sempurna, Akurat & Terverifikasi? ]
        │
        ├── TIDAK ➔ Perbaiki generator & validator di Tahap A
        │
        └── YA ───┐
                  ▼
    [ TAHAP B: ORKESTRASI TEKTOKAN OTONOM VIA MCP (TAHAP BERIKUTNYA) ]
    ├── Agen Eksekutor (Codex / Hermes / Cursor / Claude)
    ├── Pengambilan Tugas Bertahap via MCP Tools
    ├── Verifikasi & Audit Hasil Fase oleh PIEW
    └── Autonomous Advancement Loop hingga 100% Definition of Done
```

> **HUKUM KELAYAKAN ARSITEKTUR:**  
> Tahap B **TIDAK BOLEH** dikerjakan atau diintegrasikan sebelum seluruh generator dan pengujian acuan di Tahap A dinyatakan **SEMPURNA (100% Lulus Verifikasi)**.

---

## 3. Poros 1: Universal 10-Stage Master Structure

Setiap Master Blueprint yang dihasilkan oleh PIEW WAJIB memenuhi kerangka induk 10 bagian berikut, dengan isi yang bermutasi secara polimorfik mengikuti domain yang diminta:

### Bagian 1: Role & Responsibilities (Dewan Pakar Multi-Disiplin)
Mendefinisikan konsorsium profesional papan atas yang bertindak sebagai pemikir dan pelaksana.
- *IT:* Senior UI/UX Designer, Design System Engineer, Frontend Developer, Backend Architect, Security Engineer, QA Specialist, DevOps Engineer.
- *Riset / Sains:* Principal Investigator, Research Methodologist, Biostatistician/Data Analyst, Domain Specialist, Peer Reviewer, Research Ethics Officer.
- *Mahasiswa / Akademik:* Dosen Pembimbing Utama, Metodolog Penelitian, Analis Data Akademik, Reviewer Literatur, Editor Ilmiah.
- *Bisnis / Kantoran:* Chief Strategy Officer, Operations & SOP Specialist, Market Researcher, Financial & Margin Analyst, Risk Officer, Project Manager.
- *Pelajar / SMA:* Guru Pembimbing Sains, Desainer Instruksional / Pedagogi, Mentor Praktikum, Kurator Analogi Konsep.

### Bagian 2: Context & Parameters (Variabel Kunci & Asumsi Cerdas)
Menyediakan daftar parameter proyek dengan placeholder terstandar `[NAMA VARIABEL]` dan menerapkan prinsip **No Deceptive Certainty (Blueprint 14.2)**:
- Secara eksplisit memisahkan:
  1. *Fakta yang sudah pasti* (diberikan pengguna).
  2. *Asumsi cerdas yang masuk akal* (didokumentasikan secara transparan).
  3. *Keputusan yang masih membutuhkan konfirmasi lebih lanjut*.

### Bagian 3: Primary Objective & Quality Characteristics
Menetapkan 8–10 tolok ukur kualitas utama yang tidak boleh ditawar:
- *IT:* Soft surfaces, raised/inset elements, tactile response, accessible contrast, production usability.
- *Riset:* Rigor metodologi, validitas internal & eksternal, keterulangan eksperimen (reproducibility), kepatuhan etika riset.
- *Bisnis:* Kelayakan operasional, kejelasan batas omzet vs laba, kejelasan akuntabilitas (RACI), kepatuhan regulasi, efisiensi modal.
- *Pelajar:* Kejelasan konsep, penggunaan analogi visual tanpa oversimplifikasi berbahaya, keselamatan praktikum, daya ingat jangka panjang.

### Bagian 4: Core Framework / System Specification
Fondasi teknis atau konseptual inti:
- *IT:* Design Tokens (Color Palette, Shadow Levels 0–3, Typography Scale, Radius, Spacing Grid) & Technical Stack.
- *Riset:* Kerangka Teori Utama (Theoretical Foundations), Variabel Penelitian (Independen, Dependen, Moderator, Kontrol), dan Instrumen Pengukuran.
- *Bisnis:* Kerangka Operasional (Operating Model), Prinsip Efisiensi Biaya/HPP, Tata Kelola Pengambilan Keputusan.
- *Pelajar:* Model Mental (Mental Models), Fakta Kunci Sains, Hukum/Prinsip Alam yang Berlaku.

### Bagian 5: Mandatory Visual & Structural Artifacts (Generator Diagram Mermaid.js)
Wajib memuat **minimal 1–2 diagram berbasis kode Mermaid.js** yang dapat langsung dirender dan dieksekusi:
- *IT:*
  - `erDiagram` (Skema Relasi Database)
  - `flowchart TD` (Alur Transaksi & Sistem)
  - `flowchart LR` (Data Flow Diagram / DFD Level 1)
  - Format Spesifikasi Wireframe Komponen
- *Riset / Sains:*
  - `flowchart TD` (Diagram Alir Metodologi PRISMA / Protokol Eksperimen Laboratorium)
  - `graph LR` (Kerangka Konsep Hubungan Variabel)
  - Matriks Sintesis Literatur (Tabel perbandingan gap studi sebelumnya)
- *Bisnis / Kantoran:*
  - `flowchart TD` (SOP Alur Proses Bisnis & Titik Keputusan Approval)
  - `gantt` (Jadwal Peluncuran & Milestone Proyek)
  - Tabel Matriks Tanggung Jawab RACI
- *Pelajar / Edukasi:*
  - `mindmap` atau `graph TD` (Peta Konsep Hubungan Materi)
  - `flowchart LR` (Alur Proses Siklus Alami / Reaksi Kimia / Biologis)
  - Tabel Komparasi Konsep

### Bagian 6: End-to-End Execution Phases (Phase 0 s/d Phase N)
Rangkaian kerja terstruktur dari hulu ke hilir dengan **Deliverables Nyata** di setiap fase:
- *Phase 0:* Discovery, Inisiasi & Analisis Kebutuhan ➔ Output: Dokumen Brief & Asumsi.
- *Phase 1:* Perancangan Arsitektur / Kerangka Teori ➔ Output: Spesifikasi Sistem / Protokol Riset.
- *Phase 2:* Desain Komponen / Desain Instrumen ➔ Output: Design System / Kuesioner / SOP Draf.
- *Phase 3 s/d N-2:* Eksekusi Pembangunan / Pengambilan Data / Uji Pasar.
- *Phase N-1:* Pengujian Kualitas, Verifikasi & Audit Kepatuhan.
- *Phase N:* Final Handover, Panduan Pemeliharaan & Dokumentasi Lengkap.

### Bagian 7: Domain Standards & Guardrails ("Jangan Lakukan" / Anti-Patterns)
Daftar larangan eksplisit untuk melindungi integritas hasil:
- *Larangan Umum:* Dilarang berasumsi tanpa label, dilarang menyembunyikan keterbatasan.
- *IT:* Dilarang menggunakan mock data di production, dilarang menaruh seluruh kode dalam 1 file raksasa, dilarang mengabaikan WCAG.
- *Riset:* Dilarang mengarang sitasi atau jurnal fiktif (hallucinated references), dilarang p-hacking atau cherry-picking data.
- *Bisnis:* Dilarang mencampuradukkan omzet (kotor) dengan laba bersih, dilarang membuat SOP tanpa penanggung jawab yang jelas.
- *Pelajar:* Dilarang menggunakan jargon rumit tanpa definisi, dilarang memberikan instruksi praktikum berbahaya tanpa alat pelindung.

### Bagian 8: Execution Protocol for AI Coding / Task Agents
Protokol 5-Langkah standar bagi eksekutor (manusia maupun agen):
1. **Inspect:** Audit konteks, repositori, dependensi, atau data awal yang ada sebelum mengubah apa pun.
2. **Plan:** Buat breakdown rencana kerja kecil dengan kriteria penerimaan yang jelas.
3. **Implement:** Kerjakan secara bertahap dan terisolasi.
4. **Verify:** Uji hasil implementasi menggunakan alat/pemeriksaan yang sah.
5. **Report:** Laporkan apa yang selesai, apa yang terbukti berhasil, dan apa hambatan yang tersisa.

### Bagian 9: Work Management & Tracking
Standar pelacakan tugas menggunakan sistem tiket/task terstruktur:
- Parameter: Task ID, Deskripsi, Prioritas, Ketergantungan (Dependencies), Bukti Verifikasi.
- Status: `TODO` ➔ `IN_PROGRESS` ➔ `BLOCKED` ➔ `DONE` ➔ `VERIFIED`.
- Pembedaan tegas: `DONE` berarti telah dibuat; `VERIFIED` berarti telah dibuktikan lulus uji.

### Bagian 10: Definition of Done & Immediate Next Step (START NOW)
- **Definition of Done:** Kriteria tuntas obyektif (semua artefak dibuat, semua diagram valid, tidak ada error kritis tersisa).
- **START NOW:** Urutan langkah konkret yang harus langsung dilakukan pada detik pertama eksekusi dimulai.

---

## 4. Poros 2: Audience & Complexity Calibration

Sistem menyediakan kalibrasi audiens (otomatis terdeteksi dari prompt atau dipilih melalui `audienceLevel`):

| Tingkat Audiens (`audienceLevel`) | Target Pengguna | Register Bahasa & Gaya Komunikasi | Kedalaman Teknis & Toleransi Teori | Tipe Artefak Utama |
| :--- | :--- | :--- | :--- | :--- |
| `student` | Siswa SMP, SMA, Pemula Otodidak | Bahasa ramah, mudah dipahami, kaya analogi dunia nyata, instruksi terpandu | Konseptual, edukatif, menekankan logika dasar dan keselamatan | Mindmap visual, alur proses sederhana, panduan langkah aman, kuis pemahaman |
| `academic` | Mahasiswa D3/S1/S2, Dosen, Guru | Formal akademis, taat kaidah metodologi ilmiah, objektif | Berorientasi teori, validitas konstruk, instrumen uji, sitasi | Kerangka pemikiran, alur PRISMA, kisi-kisi kuesioner, checklist anti-plagiasi |
| `professional` | Manajer, Staf Kantor, Pelaku Bisnis, UMKM | Taktis, lugas, berorientasi eksekusi dan dampak finansial | Berorientasi proses bisnis, ROI, kepatuhan, pemisahan omzet vs laba | SOP Flowchart, Matriks RACI, Gantt Chart, Dashboard KPI |
| `specialist` | Software Architect, Peneliti Senior, Data Scientist | Sangat presisi, tanpa basa-basi, standar industri tingkat tinggi | Production-ready, peer-review ready, arsitektur mendalam, zero tolerance bug | Mermaid ERD, DFD Level 1, Design Tokens, Protokol Riset Ketat |

---

## 5. Cross-Artifact Consistency Guard (Penjaga Konsistensi Silang)

Salah satu kelemahan terbesar prompt AI adalah **diskoneksi antar-bagian** (misal: di diagram ERD ada tabel `OrderAudit`, tapi di daftar fitur dan API tabel tersebut tidak pernah dibahas).

PIEW menyuntikkan aturan validasi deterministik:
1. **Entitas Diagram ➔ Entitas Dokumen:** Setiap entitas yang dideklarasikan pada diagram Mermaid (tabel database, variabel riset, tahapan SOP, atau cabang mindmap) **WAJIB memiliki penjelasan yang selaras di Bagian 4 dan Bagian 6**.
2. **Anti-Entitas Hantu:** Dilarang menyebutkan entitas penting di langkah eksekusi jika tidak tercermin pada pemetaan diagram arsitektur.
3. **Verifikasi Sintaks Mermaid:** Seluruh kode diagram Mermaid yang dihasilkan diuji validitas sintaksnya sebelum dinyatakan layak rilis.

---

## 6. Matriks 5 Skenario Uji Acuan Emas (Golden Benchmark Scenarios)

Untuk membuktikan kelayakan dan akurasi Tahap A sebelum membuka Tahap B, sistem wajib diuji terhadap 5 kasus uji lintas-bidang:

### Skenario 1: IT / Software Engineering
- **Prompt Mentah:** *"Saya ingin membuat website toko kue menggunakan tema neumorphism dari awal hingga akhir."*
- **Level Audiens:** `specialist`
- **Output Diagram Wajib:** `erDiagram` (Entitas Produk, Kategori, Pesanan, Pelanggan, AuditLog) & `flowchart TD` (Alur checkout & validasi stok).
- **Spesifikasi Khusus:** Design System Neumorphism (Soft surfaces, Level 0–3 shadows, Inset fields, WCAG 2.2 AA).

### Skenario 2: Riset Ilmiah / Peneliti
- **Prompt Mentah:** *"Rancang penelitian tentang dampak akumulasi mikroplastik pada ekosistem mangrove dan biota laut."*
- **Level Audiens:** `specialist`
- **Output Diagram Wajib:** `flowchart TD` (Protokol Sampling Lapangan & Spektroskopi FTIR) & `graph LR` (Kerangka Hubungan Variabel Independen-Dependen).
- **Spesifikasi Khusus:** Protokol replikasi eksperimen, kontrol kontaminasi, standar etika biosafety.

### Skenario 3: Akademik / Skripsi Mahasiswa
- **Prompt Mentah:** *"Bantu saya menyusun kerangka skripsi tentang faktor yang mempengaruhi adopsi teknologi AI pada pelaku UMKM kuliner."*
- **Level Audiens:** `academic`
- **Output Diagram Wajib:** `graph TD` (Kerangka Pemikiran UTAUT / TAM) & `flowchart TD` (Alur Metodologi Kuantitatif dari Populasi hingga Uji Regresi).
- **Spesifikasi Khusus:** Kisi-kisi instrumen kuesioner Skala Likert, uji validitas/reliabilitas, struktur Bab 1–5.

### Skenario 4: Bisnis / Perusahaan / UMKM
- **Prompt Mentah:** *"Buatkan rencana strategis dan SOP peluncuran produk kopi susu kemasan botol siap minum dari nol hingga operasional."*
- **Level Audiens:** `professional`
- **Output Diagram Wajib:** `flowchart TD` (SOP Alur Produksi & Quality Control) & `gantt` (Timeline Peluncuran Minggu 1–12).
- **Spesifikasi Khusus:** Pemisahan HPP vs Margin, SOP Hygiene, Matriks RACI tim operasional.

### Skenario 5: Pelajar / Edukasi Sains (SMP/SMA)
- **Prompt Mentah:** *"Jelaskan cara kerja fotosintesis tumbuhan dan buatkan panduan praktikum Ingenhousz yang aman di lab sekolah."*
- **Level Audiens:** `student`
- **Output Diagram Wajib:** `flowchart LR` (Alur Reaksi Terang & Siklus Calvin dengan Bahasa Sederhana) & `graph TD` (Mindmap Faktor yang Mempengaruhi Laju Fotosintesis).
- **Spesifikasi Khusus:** Analogi pabrik tenaga surya, lembar kerja siswa, aturan keselamatan alat kaca dan air panas.

---

## 7. Batasan & Tata Kelola Eksekusi Agen VPS

Dalam mengimplementasikan arsitektur ini, seluruh agen VPS terikat secara permanen pada batasan berikut:
1. **Zero Touch pada `apps/web/`:** Agen VPS dilarang keras mengubah, menambah, atau memodifikasi file di dalam direktori `apps/web/`. Seluruh modifikasi antarmuka web adalah domain eksklusif Agen PC Lokal.
2. **Perlindungan Data `dev.db`:** 2 record aktif `legacy_default_user` pada `packages/database/prisma/dev.db` wajib dijaga keutuhannya 100%.
3. **Kompatibilitas Penuh (Zero Regression):** Seluruh rangkaian uji otomatis eksisting (`test:contracts`, `test:crawler`, `test:spider`, `test:master-synthesis`, `test:engine-v2-2`, `test:open-source`, dan `release-readiness-check`) wajib tetap lulus 100% (Exit Code 0).
4. **Keamanan Informasi:** Tidak boleh ada API key atau data rahasia yang tercatat pada log proses atau file hasil uji.

---

## 8. Kesimpulan & Langkah Berikutnya

Dokumen **ADR-003** ini adalah pedoman kanonis resmi tunggal (*Single Source of Truth*) untuk perancangan **Tahap A (Universal Meta-Blueprint Engine)**. 

Setelah dokumen ini disetujui dan dibekukan, langkah teknis selanjutnya adalah:
1. Menambahkan kontrak tipe data Zod pada `packages/prompt-contracts` (`UniversalBlueprintSpec`, `AudienceLevelEnum`, `DiagramSpecification`).
2. Mengembangkan generator polimorfik dan validator konsistensi pada `packages/prompt-engine`.
3. Membangun test suite benchmark untuk memverifikasi kelima skenario emas di atas hingga mencapai skor kelulusan 100%.
4. Mengajukan Pull Request untuk di-merge ke branch `main`.
