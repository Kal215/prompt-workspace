# Metric-Informed Roadmap & Tata Kelola Pertumbuhan (Stage 7)
**Prompt Intelligence Engineering Workspace (PIEW) — Versi 1.1.0**

Dokumen ini menetapkan metrik keberhasilan produk, batas layanan gratis/berbayar (monetisasi rasional), serta peta jalan pengembangan platform berbasis data sesuai amanat **Blueprint v1.0 Bagian 13 (Rencana Kerja #1, #3, #4, #5) & Bagian 18**.

---

## 🎯 1. Kerangka Kerja Metrik Produk (Product Metrics Framework)

### A. North-Star Metric
**"Intent-Preserved Successful Prompt Optimizations"**  
*Definisi*: Persentase prompt yang berhasil dioptimasi dengan skor evaluasi QA Auditor `>= 85/100` **DAN** lolos uji penjagaan maksud (*Intent-Preservation*) tanpa deviasi tujuan utama pengguna.
- **Target Baseline (v1.1.0)**: `>= 90%` dari seluruh optimasi yang dieksekusi.
- **Tujuan**: Menjamin bahwa platform memberikan peningkatan kualitas prompt yang nyata tanpa mengorbankan integritas maksud pengguna.

### B. Guardrail Indicators (Indikator Pembatas Sistem)
Sesuai **Blueprint Bagian 18.1**, metrik operasional berikut tidak boleh dilanggar:

| Indikator Guardrail | Ambang Batas Maksimum | Tindakan Jika Melampaui |
|:---|:---:|:---|
| **P95 Pipeline Latency** | `< 5.0 detik` | Evaluasi model fallback, kurangi token evaluasi, atau optimasi batching LLM call. |
| **P99 Playground Execution Latency** | `< 4.0 detik` | Alert provider timeout, aktifkan failover adapter. |
| **Tingkat Error API (5xx Error Rate)** | `< 0.2%` | Investigasi bug handler, periksa kuota provider, evaluasi rate limit. |
| **Token Cost per Optimization Session** | `< 2.500 token` | Sesuaikan batas `maxOutputTokens` dan instruksi scaffolding engine. |
| **Zero-Secret Leakage Incident** | **0 insiden** | Pemblokiran otomatis melalui SafeLogger dan audit build CI/CD. |

---

## 💰 2. Batas Layanan Rasional & Kesiapan Monetisasi (Blueprint Bagian 13.5)

Untuk memastikan keberlanjutan operasional tanpa mengorbankan utilitas publik, batas layanan ditetapkan secara transparan:

| Dimensi Layanan | Paket Komunitas (Gratis / Open-Access) | Paket Tim Rekayasa (Pro / Future Monetization) |
|:---|:---|:---|
| **Penyedia AI Tersedia** | Groq (Llama 3.3 70B pool) & Ollama Lokal (Mesin Sendiri). | Google Gemini (2.5 Pro/Flash), OpenRouter (Frontier Models: Claude 3.5, GPT-4o). |
| **Domain Packs** | 5 Domain Standar (General, Coding, Debugging, Academic, Business). | Kustom Domain Packs tim tak terbatas + private rulesets. |
| **Batas Rate Limit** | 10 optimasi / menit; 20 eksekusi playground / menit. | 100 optimasi / menit; eksekusi batch otomatis. |
| **Penyimpanan Riwayat** | SQLite lokal berbasis browser session (maks 50 prompt). | Sinkronisasi Cloud Database terenkripsi dengan retensi tanpa batas. |
| **Playground Tokens** | Default 1024 token output (maks 2048 token). | Hingga 8192 token output untuk dokumen panjang. |

---

## 🗺️ 3. Peta Jalan Pengembangan Berbasis Hipotesis (Roadmap 2026 - 2027)

```text
[v1.0.0-mvp] ──> [v1.1.0: C1/C2/C3] ──> [v1.2.0: Collaboration & Cache] ──> [v2.0.0: Enterprise & Extensions]
   (Selesai)           (Selesai)                     (Q1 2027)                             (Q2 2027)
```

### Fase A: Q1 2027 — Optimasi Kolaborasi & Efisiensi Biaya (v1.2.0)
- **Hipotesis**: 40% prompt yang dioptimasi memiliki kemiripan semantik tinggi; caching lokal dapat memangkas latensi hingga 60% dan biaya token hingga 35%.
- **Fitur Terencana**:
  1. *Semantic Cache Engine*: Integrasi Mem0 / Qdrant lokal untuk caching prompt instan.
  2. *Interactive Prompt Refinement*: Fitur chat multi-turn untuk merevisi hasil prompt yang dioptimasi secara iteratif.
  3. *Export & Sharing*: Ekspor prompt ke format Markdown, JSON, dan tautan berbagi (*shareable links*).

### Fase B: Q2 2027 — Ekosistem Developer & Integrasi IDE (v2.0.0)
- **Hipotesis**: Pengembang lebih produktif jika diagnosis prompt dilakukan langsung di dalam lingkungan koding mereka.
- **Fitur Terencana**:
  1. *VS Code & Cursor Extension*: Ekstensi editor resmi untuk mengoptimasi prompt di dalam codebase.
  2. *Custom Domain Pack Marketplace*: Memungkinkan tim membuat, membagikan, dan mengimpor ruleset domain buatan komunitas.
  3. *Managed PostgreSQL Migration*: Transisi resmi ke cloud database berkecepatan tinggi.
