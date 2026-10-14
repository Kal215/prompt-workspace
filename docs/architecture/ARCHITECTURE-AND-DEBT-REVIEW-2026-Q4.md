# Quarterly Architecture & Technical Debt Review (Q4 2026)
**Prompt Intelligence Engineering Workspace (PIEW) — Versi 1.1.0**

Dokumen ini menyajikan audit arsitektur berkala dan inventarisasi utang teknis (*technical debt review*) sesuai amanat **Blueprint v1.0 Bagian 13 (Rencana Kerja #7 & #9) serta Bagian 4.4**.

---

## 1. Evaluasi Arsitektur: Modular Monolith vs Microservices

### A. Rasionalisasi Mempertahankan Arsitektur Saat Ini
Pada rilis v1.1.0, repositori mengadopsi pola **Modular Monolith** dengan 6 packages (`prompt-contracts`, `domain-rules`, `provider-adapters`, `prompt-engine`, `database`, `web`). Evaluasi Q4 2026 memutuskan untuk **TETAP MEMPERTAHANKAN** Modular Monolith berdasarkan pertimbangan objektif berikut:

1. **Nol Latensi Komunikasi Antar-Modul (Zero IPC Overhead)**:
   - Pipeline optimasi prompt (`analyzer` -> `optimizer` -> `evaluator`) berjalan secara in-process melalui fungsi TypeScript native.
   - Tidak ada overhead serialisasi jaringan (HTTP/gRPC) antar-lapisan, menghasilkan latensi komputasi minimal.
2. **Kesesuaian dengan Skala Tim & Operasional**:
   - Tim pengembang saat ini beranggotakan 2 agen otonom (Agent PC & Agent VPS).
   - Mengadopsi arsitektur microservices saat ini akan menambah kompleksitas operasional yang tidak perlu (*premature optimization*): orchestration Kubernetes, service discovery, distributed tracing, dan konsistensi data eventual.
3. **Integritas Transaksional & Kontrak Terpusat**:
   - Paket `@prompt-workspace/prompt-contracts` berfungsi sebagai *Single Source of Truth*. Seluruh perubahan tipe data terverifikasi saat kompilasi (`tsc --noEmit`), mengeliminasi risiko kegagalan integrasi runtime.

### B. Metrik Pemicu Kuantitatif untuk Pemisahan Layanan (Service Split Trigger)
Sesuai **Blueprint Bagian 4.4**, pemisahan `@prompt-workspace/prompt-engine` menjadi microservice mandiri (misal: REST/gRPC Prompt Engine Daemon) HANYA boleh dilakukan jika **minimal 2 dari 4 kriteria kuantitatif** berikut terpenuhi:

| Indikator | Ambang Batas Pemicu (*Trigger Threshold*) | Alasan Pemisahan |
|:---|:---|:---|
| **Volume Permintaan (Traffic)** | Beban stabil `> 500 Requests Per Second (RPS)` selama 7 hari berturut-turut. | Beban komputasi parsing AST / regex tokenizing mulai memengaruhi throughput rendering Next.js. |
| **Beban CPU / Memori Engine** | Penggunaan CPU pada worker engine `> 80%` konstan selama jam sibuk. | Engine memerlukan autoscaling berbasis horizontal pod mandiri yang terpisah dari frontend UI. |
| **Skala Tim Pengembang** | Tim teknik bertumbuh menjadi `> 8 engineer` dengan siklus rilis independen. | Mengurangi gesekan branching Git dan memungkinkan deployment frekuensi tinggi per modul. |
| **Kebutuhan Isolasi Lingkungan** | Kebutuhan menjalankan sandbox kode Python/WASM untuk eksekusi prompt yang aman. | Memerlukan lingkungan container terisolasi ketat dengan seccomp/AppArmor khusus. |

---

## 2. Inventarisasi Utang Teknis (Technical Debt Register) & Rencana Mitigasi

| ID | Item Utang Teknis | Area | Tingkat Keparahan | Dampak Saat Ini | Rencana Mitigasi Terjadwal |
|:---|:---|:---|:---:|:---|:---|
| **TD-01** | **Penyimpanan SQLite Lokal (`dev.db`)** | Database | **MEDIUM** | SQLite menggunakan file-level lock untuk penulisan (`WAL mode`). Tidak mendukung horizontal scaling lintas node server. | Migrasi ke managed cloud database (Neon PostgreSQL atau Supabase) saat beralih ke multi-instance production. Skrip Prisma telah disiapkan untuk dual-write. |
| **TD-02** | **In-Memory Rate Limiter (Sliding Window)** | Keamanan & Web | **LOW** | Kuota rate limit disimpan dalam memory cache proses Node.js. Jika server direstart atau dijalankan multi-worker, counter reset. | Integrasikan distributed store berbasis Redis (Upstash Redis) menggunakan middleware `@upstash/ratelimit`. |
| **TD-03** | **Ketiadaan Semantic Prompt Cache** | Biaya & Latensi | **LOW** | Permintaan optimasi dengan prompt identik/hampir identik tetap memanggil LLM upstream, mengonsumsi kuota token. | Implementasikan semantic caching layer menggunakan embedding vektor lokal (Qdrant / Mem0) untuk prompt dengan kemiripan cosine > 0.95. |
| **TD-04** | **Eksekusi Pipeline Bersifat Sinkron** | UX & Performa | **LOW** | Eksekusi pipeline (analisis, optimasi, evaluasi) memakan waktu 3-7 detik. Request HTTP tetap terbuka hingga selesai. | Pertimbangkan background job worker (BullMQ + Redis) dengan Server-Sent Events (SSE) atau WebSocket untuk status pembaruan real-time pada batch besar. |

---

## 3. Kesimpulan & Rekomendasi Arsitektur Q4 2026
Arsitektur sistem saat ini dinilai **Sangat Sehat (Grade A)**. Tidak ada utang teknis kategori *High/Critical* yang membahayakan stabilitas rilis publik v1.1.0. Seluruh mitigasi teknis di atas telah dijadwalkan secara bertahap pada Roadmap Tahap 7 tanpa memutus alur operasional saat ini.
