# PDR-002: Product Decision Memo — Fitur C2: Multi-Provider Adapter (`packages/provider-adapters`)

**Tanggal**: 14 Oktober 2026  
**Status**: Diterima & Diimplementasikan (Accepted & Implemented)  
**Terkait**: Blueprint v1.0 Bagian 4.2 ("Provider Adapter: Mengirim request ke provider; normalisasi respons, error, usage metadata. Tidak boleh membiarkan detail provider bocor ke seluruh kode engine") serta Bagian 11 Rencana Kerja #3 (Task #27)  
**Penulis**: Muhammad Riskal Fadhilla  
**Target Rilis**: v1.2.0-alpha (Post Fitur C1)

---

## 1. Konteks & Alasan Pemilihan Fitur C2
Setelah rilis MVP v1.0.0 dan penyelesaian Fitur C1 (Domain Packs) di PR #19 & #20, sistem memiliki fondasi rekayasa prompt yang kuat namun masih sangat bergantung pada satu provider eksekusi utama (Groq Cloud). Ketergantungan pada satu penyedia memiliki risiko:
1. **Risiko Rate Limiting & Kuota**: Lonjakan penggunaan atau gangguan jaringan pada provider tunggal dapat melumpuhkan seluruh kapabilitas optimasi.
2. **Kebutuhan Multimodal & Model Khusus**: Beberapa use case memerlukan model berbobot tinggi seperti Claude 3.5 Sonnet / Llama 3.3 70B via OpenRouter, jendela konteks luas Google Gemini 2.5, atau eksekusi offline nir-biaya via Ollama lokal.
3. **Pemisahan Vendor vs Engine (Blueprint 4.2)**: Engine tidak boleh terikat (*vendor lock-in*) pada format API tertentu. Seluruh detail komunikasi HTTP, format pesan, dan penanganan error wajib diisolasi di layer adapter.

---

## 2. Arsitektur Interface Universal `LLMProviderAdapter`
Seluruh provider mengimplementasikan interface tunggal yang konsisten di `@prompt-workspace/provider-adapters`:

```typescript
export interface LLMProviderAdapter {
  readonly providerId: string;
  readonly defaultModel: string;
  chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<ChatResponse>;
}
```

### Karakteristik Desain:
- **Zero-SDK Bloat**: Adapter baru (`GeminiAdapter`, `OpenRouterAdapter`, `OllamaAdapter`) memanfaatkan native `fetch` (Node.js 18+) tanpa ketergantungan pada SDK pihak ketiga berukuran besar, sehingga menjaga dependensi monorepo tetap ringan dan cepat di-build.
- **Dukungan Format JSON Murni**: Parameter `responseFormat: "json"` dipetakan secara native ke fitur masing-masing provider:
  - Gemini: `generationConfig.responseMimeType = "application/json"`
  - OpenRouter: `response_format = { type: "json_object" }`
  - Ollama: `format = "json"`
  - Groq: `response_format = { type: "json_object" }`
- **Dependency Injection & Testability**: Setiap adapter mendukung injeksi `fetchFn?: typeof fetch`, memungkinkan mock testing 100% tanpa jaringan dan tanpa memanggil API berbayar saat pengujian CI/CD.

---

## 3. Spesifikasi 4 Provider Resmi

| Provider ID | Nama Tampilan | Default Model | Mode JSON | Karakteristik / Keunggulan |
|---|---|---|:---:|---|
| `groq` | Groq Cloud (Fast LPUs) | `llama-3.3-70b-versatile` | Ya | Inferensi super cepat via LPU dengan rotasi 6 API key otomatis. |
| `gemini` | Google Gemini | `gemini-2.5-flash` | Ya | Jendela konteks luas, pemrosesan cepat, REST API Google Generative Language. |
| `openrouter` | OpenRouter (Unified Gateway) | `meta-llama/llama-3.3-70b-instruct` | Ya | Akses global ke ratusan model open-source & proprietary via format OpenAI. |
| `ollama` | Ollama (Lokal / Self-Hosted) | `llama3.2` | Ya | Eksekusi mandiri di mesin lokal (`http://127.0.0.1:11434`), privasi penuh tanpa biaya API. |

---

## 4. Normalisasi Error Terpadu (`ErrorTaxonomy`)
Semua adapter memetakan error HTTP atau jaringan ke hierarki `ProviderAdapterError` dengan kode status standar:

| HTTP Status / Skenario | Error Code | HTTP Code | Keterangan & Tindakan Engine |
|---|---|:---:|---|
| HTTP 401 / 403 / API Key Invalid | `AUTH_ERROR` | 401 | Kunci API tidak valid atau kedaluwarsa. |
| HTTP 429 / RESOURCE_EXHAUSTED | `RATE_LIMIT` | 429 | Kuota provider habis; cooldown otomatis atau lempar retryable error. |
| HTTP 500 / 502 / 503 / UNAVAILABLE | `PROVIDER_UNAVAILABLE` | 503 | Server provider tumbang; engine dapat mencoba provider cadangan. |
| Network / Abort / Timeout | `TIMEOUT` | 504 | Permintaan melampaui ambang batas waktu respons. |
| Format JSON Rusak / Body Kosong | `MALFORMED_OUTPUT` | 502 | Model mengembalikan teks yang tidak dapat di-parse sebagai JSON. |
| ECONNREFUSED (Ollama lokal mati) | `PROVIDER_UNAVAILABLE` | 503 | Pesan terstruktur Bahasa Indonesia memandu pengguna menjalankan `ollama serve`. |

---

## 5. Aturan Pemilihan Provider & Zero-Secret Leakage Policy

### A. Aturan Pemilihan Provider (Resolution Priority):
1. **Pilihan Eksplisit Pengguna**: Jika request menyertakan `providerId` (misal `'gemini'`), engine memvalidasi konfigurasi provider tersebut.
2. **Fallback Default ke Groq**: Jika `providerId` bernilai `null`, `undefined`, atau tidak dikirim, engine secara otomatis menggunakan `groq` (menjamin 100% kompatibilitas dengan frontend & pengujian eksisting).
3. **Target Model Dinamis**: Jika `targetModel` disediakan oleh pengguna, model tersebut menggantikan `defaultModel` provider terkait.

### B. Zero-Secret Leakage Policy (Blueprint 15.2):
- Fungsi `listProviderCapabilities()` HANYA mengembalikan status boolean `configured: true/false`. Nilai secret/API key (`process.env.GEMINI_API_KEY`, dll.) **TIDAK PERNAH** dimasukkan ke dalam properti objek capability atau dikirim ke klien.
- Seluruh adapter dilengkapi filter sensor otomatis (`redactApiKey`): pola string `gsk_...`, `sk-...`, `AIzaSy...`, `sk-or-...`, dan `Bearer ...` otomatis disensor menjadi `[REDACTED_...]` sebelum dicetak ke terminal atau log server.

---

## 6. Backward Compatibility & Panduan Integrasi Antarmuka Web
1. **Tidak Ada Breaking Changes**: Seluruh kode `apps/web/` yang masih memanggil pipeline tanpa parameter `providerId` tetap berjalan normal menggunakan `GroqAdapter`.
2. **Metadata Transparan**: Properti `providerId` dan `model` disertakan dalam metadata output (`PromptMetadataSchema`) dan level akar hasil optimasi (`PromptOptimizationResultSchema`) sehingga UI dapat menampilkan label provider dan model aktual (*Reproducibility*).
3. **Langkah Berikutnya (Task #28 Integrasi UI)**:
   - Membuat API route `/api/providers` yang memanggil `listProviderCapabilities()`.
   - Menambahkan selector Provider & Model pada antarmuka web (`apps/web`).
