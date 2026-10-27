# PDR-003: Product Decision Memo — Fitur C3: Target Model Execution Playground (`packages/prompt-engine`)

**Tanggal**: 14 Oktober 2026  
**Status**: Diterima & Diimplementasikan (Accepted & Implemented)  
**Terkait**: Blueprint v1.0 Bagian 5.6 ("Evaluasi hasil eksekusi: prompt dijalankan pada model tujuan, lalu output dibandingkan... memerlukan desain eksperimen yang hati-hati"), Bagian 11 Rencana Kerja #2 (Task #29), dan Gate 3 (Evaluasi Kualitas)  
**Penulis**: Muhammad Riskal Fadhilla  
**Target Rilis**: v1.3.0-alpha (Penutup Tahap 5 — Fitur Lanjutan)

---

## 1. Konteks & Alasan Pemilihan Fitur C3
Setelah penyelesaian Fitur C1 (Domain Packs) dan Fitur C2 (Multi-Provider Adapter), pengguna dapat mengoptimasi prompt sesuai domain dan memilih provider eksekusi. Namun, muncul kebutuhan penting pada alur rekayasa prompt:
1. **Verifikasi Output Nyata (*Execution Reality*)**: Prompt yang tampak rapi di atas kertas (*syntactic structure*) belum tentu menghasilkan keluaran yang akurat jika tidak pernah diuji langsung pada model target.
2. **Kebutuhan Pengisian Placeholder Dinamis**: Domain packs menghasilkan scaffolding terarah dengan placeholder (seperti `[MASUKKAN_BAHASA]` atau `[TARGET_AUDIENS]`). Pengguna memerlukan mekanisme pengisian variabel yang interaktif sebelum mengirimkannya ke LLM target.
3. **Pengujian dengan Kasus Uji Nyata (*Test Case Input/Output*)**: Sesuai Blueprint Bagian 11.2, eksekusi prompt memerlukan dukungan input data nyata (`testInput`) agar pengguna dapat mengevaluasi bagaimana prompt teroptimasi memproses data konkret.

---

## 2. Desain Kontrak & Skema Validasi (`packages/prompt-contracts`)

Kontrak Zod baru didefinisikan secara modular dan tervalidasi ketat:

### A. Parameter & Permintaan Eksekusi (`PromptExecutionRequestSchema`)
- `prompt`: Teks prompt teroptimasi (1 - 12.000 karakter).
- `originalPrompt`: Prompt asli sebelum optimasi (opsional, untuk referensi/komparasi).
- `placeholderValues`: Record pemetaan variabel `Record<string, string>` (default: `{}`).
- `testInput`: Data uji / kasus uji tambahan (maksimal 4.000 karakter, opsional).
- `providerId`: Provider LLM target (`'groq'` | `'gemini'` | `'openrouter'` | `'ollama'`, default: `'groq'`).
- `targetModel`: Model spesifik yang diinginkan (opsional, fallback ke default provider).
- `parameters`:
  - `temperature`: Nilai 0.0 - 2.0 (default: `0.3` untuk menekan nondeterminism).
  - `maxOutputTokens`: Rentang 64 - 2048 (default: `1024` token sebagai guardrail biaya dan batas komputasi).

### B. Hasil Eksekusi (`PromptExecutionResultSchema`)
- `executionId`: Identifier unik sesi eksekusi (`exec-<timestamp>-<hash>`).
- `resolvedPrompt`: Teks prompt final setelah semua placeholder diganti dan `testInput` digabungkan secara terstruktur.
- `unresolvedPlaceholders`: Daftar token placeholder yang belum terisi (peringatan transparan).
- `output`: Teks respons aktual dari model tujuan.
- `providerId` & `model`: Identitas provider dan model aktual yang mengeksekusi.
- `parameters`: Konfigurasi suhu (`temperature`) dan batas token (`maxOutputTokens`).
- `latencyMs`: Waktu tunggu inferensi dalam milidetik.
- `usage`: Rincian token (`promptTokens`, `completionTokens`, `totalTokens`).
- `nondeterminismNotice`: Pemberitahuan transparansi sifat nondeterministik model.
- `createdAt`: Timestamp ISO 8601.

---

## 3. Utilitas Placeholder Extractor & Resolver (`packages/prompt-engine`)

Modul `packages/prompt-engine/src/playground.ts` menyediakan 2 fungsi inti:

1. **`extractPromptPlaceholders(promptText: string): string[]`**
   - Mendeteksi placeholder kurung siku kapital: `[MASUKKAN_BAHASA]`, `[TARGET_AUDIENS]`, `[GAYA_SITASI: APA/IEEE]`, `[Input/Output]`.
   - Mendeteksi placeholder format mustache: `{{nama_variabel}}`, `{{ variabel }}`.
   - **Anti-False Positive Heuristic**:
     - Mengabaikan indeks array kode numerik (`[0]`, `[1]`, `[99]`).
     - Mengabaikan pengindeksan variabel huruf kecil (`[index]`, `[idx]`, `[i]`, `[item]`).
     - Mengabaikan sintaks tautan Markdown `[Label](URL)` menggunakan *negative lookahead* `(?!\()`.
   - Mengembalikan daftar unik (*deduplicated*) placeholder berdasarkan urutan kemunculan.

2. **`resolvePromptPlaceholders(promptText: string, values: Record<string, string>)`**
   - Mendukung pencocokan fleksibel baik dengan kurung siku (`values["[KEY]"]`) maupun tanpa kurung siku (`values["KEY"]`).
   - Mendukung format mustache dengan spasi maupun tanpa spasi (`values["variabel"]` atau `values["{{ variabel }}"]`).
   - Mengabaikan nilai kosong atau hanya spasi (*whitespace*), dan mencatatnya ke daftar `unresolvedPlaceholders`.
   - Mengganti seluruh kemunculan token yang valid dalam `resolvedPrompt`.

---

## 4. Keamanan, Kontrol Biaya & Batas Komputasi

Sesuai Blueprint Bagian 11.2, 15.2, dan 18.1:
1. **Isolasi Instruksi Sistem Keamanan**:
   Model target dijalankan dengan *system prompt* yang menegaskan peran sebagai asisten pelaksana tugas, menolak eksploitasi kode berbahaya, dan melarang pembocoran kredensial atau instruksi rahasia internal.
2. **Penggabungan Kasus Uji Terstruktur**:
   Jika `testInput` diberikan, teks tersebut dilampirkan secara terpisah di bagian akhir prompt dengan batas penanda tegas:
   ```text
   --- KASUS UJI / TEST CASE INPUT ---
   <testInput>
   ```
   Hal ini memisahkan instruksi prompt dari data masukan pengguna dan memitigasi risiko *prompt injection*.
3. **Batas Biaya & Token**:
   Maksimum output dibatasi maksimal 2.048 token (default 1.024 token) untuk mencegah loop inferensi tak berhingga dan pembengkakan kuota.
4. **Data Minimization (SafeLogger)**:
   Logger operasional hanya mencatat metadata eksekusi (ID eksekusi, provider, model, latency, token count, jumlah unresolved). Isi teks prompt dan keluaran mentah tidak pernah dicatat ke konsol server.

---

## 5. Pemberitahuan Nondeterminism (Blueprint Bagian 5.6 & 23)
LLM pada dasarnya bersifat probabilistik. Dua eksekusi berturut-turut pada model yang sama dengan parameter yang sama dapat menghasilkan susunan kata yang berbeda. Setiap respons eksekusi menyertakan pemberitahuan transparan:
> *"Hasil eksekusi LLM ini bersifat probabilistik/nondeterministik. Respons nyata dari model dapat bervariasi bergantung pada penyedia (provider), arsitektur model, dan parameter suhu (temperature) yang digunakan."*

---

## 6. Rencana Tindak Lanjut & Integrasi Antarmuka Web (Task #30)
Setelah PR #23 di-merge ke branch `main`:
1. **Komponen Playground**: Pengembang antarmuka web dapat membuat tab atau drawer "Test / Run Playground" di antarmuka web.
2. **Deteksi Otomatis Variabel**: Menggunakan `extractPromptPlaceholders(optimizedPrompt)` untuk me-render input form dinamis bagi masing-masing placeholder yang terdeteksi.
3. **Drawer Input Uji**: Area input opsional untuk `testInput` (data contoh kasus uji).
4. **Panel Eksekusi & Hasil**: Memanggil endpoint backend baru (misal `/api/playground/execute`) untuk mengeksekusi model dan menampilkan respons, latency, token usage, serta badge provider/model.
