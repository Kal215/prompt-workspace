# Kebijakan Kompatibilitas, Versioning & Deprikasi (Compatibility & Deprecation Policy)
**Prompt Intelligence Engineering Workspace (PIEW) — Tahap 7 Platform Evolution**

Dokumen ini mendefinisikan standar tata kelola resmi untuk evolusi antarmuka pemrograman (API), skema kontrak data, paket domain rules, adapter model AI, serta migrasi basis data pada ekosistem Prompt Intelligence Engineering Workspace sesuai dengan **Blueprint v1.0 Bagian 13 (Rencana Kerja #8 & Artefak Wajib)**.

---

## 1. Aturan Semantic Versioning (SemVer 2.0.0) Monorepo

Setiap workspace dalam monorepo mematuhi spesifikasi `MAJOR.MINOR.PATCH`:

1. **MAJOR (X.0.0)**:
   - Diterapkan ketika terdapat perubahan yang memutus kompatibilitas mundur (*breaking changes*).
   - Menghapus field atau mengubah tipe data wajib pada skema publik di `@prompt-workspace/prompt-contracts`.
   - Menghapus atau mengubah interface method wajib pada `LLMProviderAdapter` di `@prompt-workspace/provider-adapters`.
   - Mengubah struktur tabel basis data yang memerlukan migrasi destruktif (penghapusan kolom/tabel).

2. **MINOR (0.X.0 / X.Y.0)**:
   - Menambahkan fitur baru yang **100% kompatibel mundur** (*backward-compatible*).
   - Menambahkan field opsional dengan default aman pada skema Zod (seperti penambahan `providerId` pada C2 dan `placeholderValues`/`testInput` pada C3).
   - Menambahkan domain rule pack baru pada `@prompt-workspace/domain-rules`.
   - Menambahkan adapter provider baru pada `@prompt-workspace/provider-adapters`.
   - Menambahkan kolom baru dengan nilai default pada skema Prisma tanpa memutus query lama.

3. **PATCH (0.0.X / X.Y.Z)**:
   - Perbaikan bug, refactoring internal, optimasi performa, atau pembaruan dokumentasi tanpa mengubah tanda tangan fungsi publik.

### Matriks Dependensi Antar-Workspace
| Package | Kebijakan Versi | Aturan Konsumsi |
|:---|:---|:---|
| `@prompt-workspace/prompt-contracts` | Inti Kontrak (Single Source of Truth) | Seluruh package mengonsumsi versi exact atau patch-compatible (`^`). Perubahan breaking memerlukan rilis Major. |
| `@prompt-workspace/domain-rules` | Plugin Domain Packs | Mengekspos metadata `compatibleEngineVersion`. Engine memvalidasi kompatibilitas saat runtime. |
| `@prompt-workspace/provider-adapters` | Multi-Provider Engine Adapter | Mengimplementasikan interface `LLMProviderAdapter` seragam. Adapter baru tidak boleh merusak adapter eksisting. |
| `@prompt-workspace/prompt-engine` | Logika Bisnis & Playground | Bergantung pada `contracts`, `adapters`, dan `domain-rules`. Menjamin fallback aman jika provider/domain tidak ditemukan. |
| `@prompt-workspace/database` | Persistensi Data (Prisma ORM) | Skema database terenkapsulasi. Operasi CRUD diakses hanya melalui modul helper publik (`savePrompt`, `getPromptsByUserId`, dsb). |
| `web` (`apps/web`) | Aplikasi UI & API Gateway | Mengonsumsi seluruh package melalui internal workspace symlink. |

---

## 2. Kebijakan Backward Compatibility

### A. Kontrak Data Zod (`@prompt-workspace/prompt-contracts`)
1. **Aturan Penambahan Properti**:
   - Setiap properti baru pada request schema (`PromptOptimizationRequestSchema`, `PromptExecutionRequestSchema`) **WAJIB bersifat opsional** (`.optional()`) dan memiliki nilai default yang deterministik (`.default(...)`).
   - Contoh: Ketika `providerId` diperkenalkan pada Fitur C2, nilainya default ke `'groq'`, sehingga seluruh pemanggil lama tetap berfungsi tanpa modifikasi.
2. **Aturan Penambahan Enum**:
   - Penambahan nilai enum baru pada `ProviderIdSchema` atau `DomainId` tidak boleh menghapus atau mengubah arti nilai yang sudah ada.
   - Resolver engine wajib memiliki jalur fallback jika menerima identifier yang tidak dikenal (misal: default ke `general` untuk domain, dan `groq` untuk provider).

### B. Interface Provider Adapter (`@prompt-workspace/provider-adapters`)
1. Interface `LLMProviderAdapter` bersifat stabil:
   ```typescript
   export interface LLMProviderAdapter {
     readonly providerId: ProviderId | string;
     readonly defaultModel: string;
     chatCompletion(
       messages: ChatMessage[],
       options?: ProviderAdapterOptions
     ): Promise<ChatResponse>;
   }
   ```
2. Parameter tambahan pada `ProviderAdapterOptions` harus selalu bersifat opsional.
3. Seluruh error provider wajib dinormalisasi ke `ProviderAdapterError` dengan `code` standar (`AUTH_ERROR`, `RATE_LIMIT`, `PROVIDER_UNAVAILABLE`, `TIMEOUT`, `MALFORMED_OUTPUT`).

### C. Domain Rule Packs (`@prompt-workspace/domain-rules`)
1. Setiap Domain Pack memuat metadata versi dan kompatibilitas:
   ```typescript
   export interface DomainRulePack {
     id: DomainId;
     name: string;
     version: string;
     compatibleEngineVersion: string;
     aliases: string[];
     // ...
   }
   ```
2. Resolusi ID domain mendukung alias historis tanpa batas waktu (misal: `"bisnis-dan-riset-pasar"` dan `"business"` otomatis teresolusi ke `"business_strategy"`).

---

## 3. Prosedur Deprikasi & Jendela Migrasi (Deprecation Window)

Sebelum suatu field, endpoint, atau interface publik dihapus atau diubah secara breaking, proses deprikasi berikut wajib dilalui:

```text
[Fase 1: Pengumuman & Runtime Warning]  ──(Min. 2 Minor / 90 Hari)──>  [Fase 2: Soft Deprecation]  ──(Rilis Major Berikutnya)──>  [Fase 3: End of Life / Removal]
```

1. **Fase 1: Pengumuman & Runtime Warning**:
   - Tambahkan tag `@deprecated` pada JSDoc TypeScript beserta instruksi penggantinya.
   - Keluarkan log peringatan non-blocking melalui `SafeLogger.warn()` saat field/fitur usang dipanggil.
   - Dokumentasikan di `RELEASE-NOTES.md` dan `MIGRATION.md`.
2. **Fase 2: Soft Deprecation**:
   - Field tetap didukung secara otomatis melalui transformer/adapter kompatibilitas.
   - Jendela migrasi aktif selama **minimal 2 siklus rilis minor atau 90 hari kalender**.
3. **Fase 3: End of Life (Removal)**:
   - Field atau interface yang telah didepresiasi hanya boleh dihapus pada rilis **MAJOR** berikutnya.

---

## 4. Aturan Migrasi Skema Basis Data (Prisma / SQLite / PostgreSQL)

Sesuai prinsip pelestarian data (*Data Preservation*) pada Blueprint Bagian 15.2:

1. **Prinsip Non-Destruktif (Additive-Only Migrations)**:
   - Kolom baru **WAJIB** memiliki klausa `@default(...)` atau bersifat *nullable* (`?`).
   - Dilarang keras menjalankan perintah yang menghapus tabel, mereset database (`prisma migrate reset`), atau mengubah tipe kolom secara inkompatibel pada database produksi.
2. **Perlindungan Data Historis (`legacy_default_user`)**:
   - Seluruh record pra-multiuser yang memiliki `userId = 'legacy_default_user'` diperlakukan sebagai arsip bernilai tinggi (*immutable historic records*).
   - Migrasi basis data di masa depan tidak boleh mengubah `userId` atau menghapus record bersejarah ini.
3. **Prosedur Migrasi ke Managed PostgreSQL (Dual-Write & Zero Downtime)**:
   Jika beban sistem memerlukan transisi dari SQLite lokal ke PostgreSQL:
   - **Langkah 1**: Buat skema PostgreSQL yang identik menggunakan generator Prisma.
   - **Langkah 2**: Jalankan skrip replikasi batch data dari SQLite ke PostgreSQL dengan validasi hash SHA-256 untuk memastikan keutuhan record.
   - **Langkah 3**: Aktifkan mode *Dual-Write* pada service database.
   - **Langkah 4**: Alihkan traffic baca (*read switch*) ke PostgreSQL setelah verifikasi konsistensi data 100%.
   - **Langkah 5**: Nonaktifkan SQLite dan lakukan pengarsipan snapshot final.
