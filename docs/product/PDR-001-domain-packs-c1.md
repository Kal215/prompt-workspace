# PDR-001: Product Decision Memo — Fitur C1: Domain Packs (`packages/domain-rules`)

**Tanggal**: 14 Oktober 2026  
**Status**: Diterima & Diimplementasikan (Accepted & Implemented)  
**Terkait**: Blueprint v1.0 Bagian 3, 4.2, 11 (Rencana Kerja #4), dan Task #25  
**Penulis**: Muhammad Riskal Fadhilla  
**Target Rilis**: v1.1.0-alpha (Post v1.0.0-mvp)

---

## 1. Konteks & Alasan Pemilihan Fitur C1
Setelah MVP v1.0.0 berhasil diluncurkan dengan integrasi database, keamanan berlapis, dan regresi teruji, sistem membutuhkan peningkatan kecerdasan rekayasa prompt tanpa mengorbankan sifat agnostik domain (*domain-aware, not domain-locked* sesuai Blueprint Bagian 3).

Fitur C1 (Domain Packs) dipilih sebagai langkah prioritas pertama pada Tahap 5 karena:
1. **Peningkatan Kualitas Rekonstruksi Prompt**: Prompt di ranah *Coding*, *Debugging*, *Academic Writing*, dan *Business Strategy* memiliki karakteristik kegagalan dan kebutuhan informasi yang sangat berbeda. Analyzer dan Optimizer umum sering kali melewatkan aspek penting spesifik domain (seperti pesan error/stack trace pada debugging, atau batasan metodologi dan referensi pada penulisan akademik).
2. **Kepatuhan Mutlak *Preserve Intent***: Pendekatan domain pack menyediakan aturan terarah untuk mengisi kekosongan informasi menggunakan placeholder terstandarisasi ([MASUKKAN_URL_TARGET], [LAMPIRKAN_KODE_ERROR], dll.) dan melarang keras pengarangan fakta palsu (*anti-deceptive certainty*).
3. **Pemisahan Tanggung Jawab (*Separation of Concerns*)**: Logika aturan domain dikapsulkan secara murni dalam package `@prompt-workspace/domain-rules` berbasis TypeScript murni, tanpa dependensi framework UI/React, sehingga dapat dikonsumsi oleh backend, CLI harness, maupun micro-agent lain.

---

## 2. Desain Interface & 5 Domain Packs Resmi
Sesuai Blueprint Bagian 11.4, interface `DomainRulePack` didefinisikan dengan kontrak metadata yang stabil:
- `domainId`: ID unik domain (`general`, `coding`, `debugging`, `academic_writing`, `business_strategy`).
- `name` & `description`: Label dan penjelasan ringkas dalam Bahasa Indonesia untuk kemudahan integrasi UI.
- `ruleVersion`: Versi aturan domain (dimulai dari `"1.0.0"`).
- `compatibleEngineVersion`: Kompatibilitas versi engine (`">=1.0.0"`).
- `focusCategories`: Kategori taksonomi temuan yang menjadi fokus utama domain tersebut.
- `analyzerDirectives`: Panduan heuristik deteksi kelemahan spesifik domain bagi Analyzer.
- `optimizerDirectives`: Aturan scaffolding, penambahan placeholder wajib, dan guardrail rekonstruksi bagi Optimizer.
- `evaluationCriteriaNotes`: Catatan pertimbangan objektif bagi Evaluator (*LLM-as-a-Judge*).

### Ringkasan 5 Domain Pack:
1. **`general` (Umum / Otomatis)**:
   - Berlaku sebagai fondasi universal dan fallback aman jika domain tidak dispesifikasikan.
   - Menegakkan struktur prompt standar: Peran, Tujuan, Masukan, Instruksi, Format Keluaran, dan Batasan.
2. **`coding` (Pengembangan Perangkat Lunak)**:
   - Selaras dengan fixture baseline `PIW-BL-001`.
   - Menuntut kejelasan bahasa pemrograman, runtime/versi, spesifikasi input-output, penanganan error, batasan keamanan/izin akses, serta penolakan sintaks ambigu.
3. **`debugging` (Debugging & Code Review)**:
   - Selaras dengan fixture baseline `PIW-BL-004`.
   - Menuntut cuplikan kode minimal yang mereproduksi error, pesan error/stack trace lengkap, perbandingan ekspektasi vs perilaku aktual, dan lingkungan eksekusi; melarang tebak-tebakan penyebab bug tanpa bukti konkret.
4. **`academic_writing` (Penulisan Akademik & Riset)**:
   - Selaras dengan fixture baseline `PIW-BL-002`.
   - Menuntut kejelasan target audiens akademik, struktur argumen yang berimbang, batasan panjang/kata, gaya bahasa formal, serta proteksi keras terhadap sitasi palsu (anti-halusinasi referensi ilmiah).
5. **`business_strategy` (Bisnis, Riset Pasar & Perencanaan Produk)**:
   - Selaras dengan fixture baseline `PIW-BL-003` & `PIW-BL-005`.
   - Menuntut pemisahan tegas antara fakta empiris vs asumsi/hipotesis, target pasar/segmen pelanggan, metrik keberhasilan terukur (KPI/ROI), batasan anggaran dan jadwal, serta format deliverable yang siap eksekusi.

---

## 3. Jaminan Backward Compatibility & Anti-Breaking Changes
Untuk memastikan bahwa aplikasi web, script API, maupun database lama tidak mengalami kendala:
1. **Fallback Aman Resolver**:
   Helper `resolveDomainId()` dan `getDomainPack()` menangani nilai `null`, `undefined`, string kosong `""`, alias lama (`"writing"` -> `"academic_writing"`, `"business"` / `"analysis"` -> `"business_strategy"`), serta string asing dengan fallback otomatis ke domain pack `"general"`.
2. **Kontrak Schema Output**:
   Field `appliedDomainRule` ditambahkan sebagai properti opsional pada `PromptMetadataSchema` dan `PromptOptimizationResultSchema`. Konsumen API yang belum memanfaatkan metadata ini tidak akan terpengaruh.
3. **Kontrak Schema Input**:
   Field `taskType` pada `PromptOptimizationRequestSchema` tetap bertipe `z.string().nullable().default(null)`, sehingga seluruh payload request lama tetap valid 100%.

---

## 4. Rencana Tindak Lanjut & Integrasi Antarmuka Web
Setelah PR #19 di-merge ke branch `main`:
1. Pengembang antarmuka web dapat memanfaatkan helper `listDomainPacks()` atau mapping domain ID pada komponen UI (`apps/web`) untuk menampilkan dropdown / selector domain pada form input prompt.
2. Kartu hasil optimasi dapat menampilkan badge domain pack aktif (`appliedDomainRule.name`) untuk transparansi sistem kepada pengguna (*Explainability*).
