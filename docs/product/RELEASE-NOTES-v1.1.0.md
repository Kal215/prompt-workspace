# Catatan Rilis (Release Notes) — Versi 1.1.0
**Prompt Intelligence Engineering Workspace (PIEW)**  
**Tanggal Rilis**: 14 Oktober 2026  
**Status**: General Availability (GA)  
**Kompatibilitas**: 100% Kompatibel Mundur (*Backward-Compatible*) terhadap `v1.0.0-mvp`  

Versi **v1.1.0** menandai lompatan besar dari fondasi MVP (v1.0.0) menuju platform rekayasa prompt tingkat lanjut berkemampuan multi-domain, multi-penyedia model AI, dan pengujian interaktif target model (*Execution Playground*).

---

## 🌟 Sorotan Rilis (Release Highlights)

### 1. Fitur C1: 5 Domain Rule Packs Berversi (`@prompt-workspace/domain-rules`)
- **Prinsip Dasar**: *"Domain-aware, not domain-locked"* (Blueprint v1.0 Bagian 4.2 & PDR-001).
- Menyediakan 5 modul aturan domain terstandarisasi yang diinjeksikan secara terstruktur ke pipeline analisis dan optimasi:
  1. `general` (v1.0.0): Scaffolding fleksibel untuk kebutuhan umum dan percakapan.
  2. `coding` (v1.0.0): Standar clean code, pencegahan halusinasi library, penanganan edge-case, dan penegakan type-safety.
  3. `debugging` (v1.0.0): Metodologi Root Cause Analysis, isolasi hipotesis, dan langkah reproduksi sistematis.
  4. `academic_writing` (v1.0.0): Struktur metodologi ilmiah, penegakan integritas data, dan larangan mengarang sitasi/paper.
  5. `business_strategy` (v1.0.0): Kerangka analitis terstruktur (MECE/SWOT), rekomendasi berbasis metrik finansial, dan mitigasi risiko.
- Registry otomatis dengan fungsi `getDomainPack`, `listDomainPacks`, dan resolusi cerdas alias kata kunci.

### 2. Fitur C2: Arsitektur Multi-Provider Adapters & Zero-Secret Registry (`@prompt-workspace/provider-adapters`)
- **Standarisasi Kontrak**: Antarmuka terpadu `LLMProviderAdapter` tanpa bloat SDK pihak ketiga yang besar (menggunakan native `fetch` dengan timeout abort controller).
- **Dukungan 4 Provider**:
  1. **Groq**: Tetap mempertahankan multi-key pool (6 kunci API) dengan rotasi otomatis dan dynamic model fallback.
  2. **Google Gemini**: Integrasi native REST API Gemini (`v1beta/models`), model default `gemini-2.5-flash`, mode JSON, dan dukungan multi-key pool.
  3. **OpenRouter**: Akses katalog model global berstandar OpenAI endpoint, model default `meta-llama/llama-3.3-70b-instruct`.
  4. **Ollama Lokal**: Eksekusi offline di localhost port 11434, model default `llama3.2`, dengan panduan ramah saat server offline.
- **Normalisasi Error Seragam**: Pemetaan deterministik untuk seluruh penyedia ke `UNAUTHORIZED`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `TIMEOUT`, dan `MALFORMED_OUTPUT`.
- **Zero-Secret Leakage**: Fungsi `listProviderCapabilities()` dan endpoint `/api/providers` hanya mengekspos status boolean `configured: true/false`, tanpa membocorkan string kunci API ke antarmuka pengguna.

### 3. Fitur C3: Target Model Execution Playground & Smart Resolver (`@prompt-workspace/prompt-engine`)
- **Tutup Kesenjangan Evaluasi**: Mewujudkan prinsip Blueprint Bagian 5.6 (*Evaluasi hasil eksekusi model tujuan*).
- **Smart Placeholder Resolver**:
  - Deteksi otomatis placeholder kurung siku `[MASUKKAN_...]` dan mustache `{{...}}`.
  - Pencegahan kesalahan deteksi (*anti-false-positive*) terhadap indeks kode `[0]`, `[1]`, `[index]` dan Markdown link.
  - Form isian variabel dinamis dan transparansi `unresolvedPlaceholders`.
- **Test Case Input Injection**: Kemampuan melampirkan data uji konkret secara terstruktur pada blok isolasi.
- **Nondeterminism Mitigation**: Pengaturan `temperature` rendah (default `0.3`), pembatasan `maxOutputTokens` (default `1024`), isolasi System Prompt Keamanan, dan pemberitahuan sifat probabilistik LLM pada output.

---

## 📦 Matriks Versi Modul Monorepo (Version Matrix)

| Package Workspace | Versi Rilis | Catatan Perubahan Utama |
|---|:---:|---|
| `web` (Next.js App) | `1.1.0` | UI Domain Selector, Provider/Model Selector, Execution Playground panel, dan perbaikan isolasi data. |
| `@prompt-workspace/prompt-contracts` | `0.2.0` | Skema Zod Domain Rule, Provider ID, Provider Capability, dan Execution Playground contracts. |
| `@prompt-workspace/prompt-engine` | `0.2.0` | Injeksi domain rule pada analyzer/optimizer/evaluator, adapter dinamis, dan modul `playground.ts`. |
| `@prompt-workspace/provider-adapters` | `0.2.0` | Adapter Gemini, OpenRouter, Ollama, provider registry, dan utilitas `redact.ts`. |
| `@prompt-workspace/domain-rules` | `1.0.0` | Inisialisasi package 5 Domain Rule Packs resmi beserta registry dan tes unit. |
| `@prompt-workspace/database` | `0.2.0` | Skema SQLite `userId` multi-user, backup & restore otomatis, helper otorisasi CRUD. |

---

## 🔄 Jaminan Kompatibilitas Mundur (Backward Compatibility)

1. **API `/api/optimize`**:
   - Parameter `domainId`, `providerId`, dan `targetModel` bersifat opsional.
   - Jika request dikirim tanpa parameter baru tersebut, sistem otomatis menggunakan default `domainId: 'general'`, `providerId: 'groq'`, dan model default Groq yang stabil.
2. **Database & Data Aktif**:
   - Kolom `userId` pada tabel `SavedPrompt` memiliki default `'legacy_default_user'`.
   - Record yang dibuat pada rilis `v1.0.0-mvp` (termasuk 2 record aktif terlindungi) tetap dapat diakses dan dibaca dengan aman tanpa risiko error migrasi.
3. **Format Output**:
   - Field `appliedDomainRule`, `provider`, dan `model` ditambahkan ke dalam metadata hasil secara transparan tanpa mengubah struktur objek inti respons v1.0.0.

---

## 🔒 Pembaruan Keamanan & Kepatuhan Blueprint

- **SafeLogger**: Pembaruan regex redaksi untuk mengenali kunci Google Gemini (`AIzaSy...`) dan OpenRouter (`sk-or-...`).
- **CSRF & Rate Limiting**: Pengetatan proteksi origin dan rate limiter sliding-window per IP pada seluruh endpoint mutasi.
- **Fail-Fast Session Guard**: Pemeriksaan integritas `SESSION_SECRET` wajib memiliki panjang minimal 32 karakter pada lingkungan produksi.
