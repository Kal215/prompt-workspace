# SUPERVISOR EXECUTION STATE (DURABLE RUNTIME STATE)

*Dokumen Status Eksekusi Fisik PIEW Autonomous Supervisor & Quality Gatekeeper.*
*Status: SELESAI & TERVERIFIKASI 100% | Branch: `feat/autonomous-supervisor-runtime` | Tanggal: Oktober 2026*

---

## 1. IDENTITAS REKAYASA & RUNTIME
- **Repositori**: `/home/riskal/prompt-workspace` (Monorepo PIEW)
- **Cabang Aktif**: `feat/autonomous-supervisor-runtime` (Base: `chore/reset-web-to-clean-slate` PR #71)
- **Status Kompilasi TypeScript**: **LULUS 100% (0 Error pada seluruh 8 workspace)**
- **Status Basis Data (`dev.db`)**: **100% Utuh & Terlindungi (2 Record Kanonis Aman)**
- **Standar Eksekusi**: Evidence Over Claims, Bounded Iterations (Circuit Breaker max 3x), Progressive Task Phasing, Strict Zod Types.

---

## 2. KONTRAK DATA BARU (`packages/prompt-contracts/src/supervision.ts`)
- `DefectSeverityEnum`: `CRITICAL | MAJOR | MINOR`
- `AuditDefectItemSchema`: Lokasi berkas, baris/kolom, kategori, deskripsi kegagalan, cuplikan terminal.
- `EmpiricalAuditDetailSchema`: Status git diff, deteksi file deletion, exit code build & test, status container Docker, pelanggaran batasan negatif, durasi audit.
- `SteeringDirectiveSchema`: Direktif instruksi terstruktur 4-bagian (Diagnosis, Berkas & Baris Cacat, Tindakan Wajib, Batasan Mutlak) beserta status sirkuit `HALTED_MAX_RETRIES`.
- `AutonomousVerificationConfigSchema`: Konfigurasi direktori kerja, perintah build/test, timeout ms, dan batas retry.

---

## 3. MODUL ALAT AUDIT FISIK (`packages/prompt-engine/src/supervisor/`)
1. **`git-diff-inspector.ts`**:
   - Membaca status Git dan diff perubahan kode nyata (`git diff` & `git status --porcelain`).
   - Mendeteksi penambahan, modifikasi, dan mendeteksi penghapusan berkas secara sepihak.
2. **`terminal-verifier.ts`**:
   - Menjalankan perintah build (`npm run build` / `tsc --noEmit`) dan test suite (`npm test`) secara independen dengan batas waktu (*timeout guard*) 60 detik.
   - Parser galat kompiler otomatis (`parseCompilerAndLinterErrors`) yang mengekstrak lokasi berkas, nomor baris, dan kode galat TypeScript (misal TS2304).
3. **`docker-health-checker.ts`**:
   - Memeriksa kestabilan kontainer Docker, status port listening, dan mendeteksi kondisi *crash-loop*.
4. **`negative-constraint-guard.ts`**:
   - Memvalidasi kepatuhan kode dan teks terhadap batasan mutlak pengguna (misal: larangan penghapusan transaksi, larangan mock data).
5. **`steering-director.ts`**:
   - Menyusun naskah perbaikan (*Steering Directive*) presisi 4-komponen untuk memandu agen pelaksana memperbaiki kode.
   - Mengaktifkan penghentian sirkuit otomatis (*Circuit Breaker*) jika percobaan perbaikan melebihi batas 3 kali.
6. **`autonomous-engine.ts`**:
   - Orkestrator tunggal yang mengeksekusi siklus ReAct (Think-Act-Observe-Reflect) dan mengunci status sesi di disk.

---

## 4. INTEGRASI CLI RUNNER (`scripts/piew-cli.ts`)
- Penambahan flag `--audit`: Memungkinkan pengguna atau sistem CI menjalankan audit empiris mandiri pada workspace aktif.
- Penambahan opsi `--session=<id>`, `--phase=<idx>`, `--build-cmd=<cmd>`, `--test-cmd=<cmd>`.
- Menghasilkan keputusan kelulusan (*VERIFIED_PROCEED*, *REJECTED_NEEDS_REPAIR*, *PROJECT_COMPLETED*, *HALTED_MAX_RETRIES*) dan direktif perbaikan langsung ke terminal.

---

## 5. HASIL VERIFIKASI PENGUJIAN OTOMATIS (TEST SUITES)
| Test Suite | Berkas Pengujian | Hasil Pengujian | Status |
| :--- | :--- | :--- | :--- |
| **Empirical Supervisor** | `packages/prompt-engine/scripts/test-empirical-supervisor.ts` | 6/6 Asersi Lulus | **PASS (Exit 0)** |
| **Autonomous Supervisor** | `packages/prompt-engine/scripts/test-autonomous-supervisor.ts` | 7/7 Simulasi Lulus | **PASS (Exit 0)** |
| **Provider Registry** | `packages/provider-adapters/scripts/test-provider-registry.ts` | 6/6 Pengujian Lulus | **PASS (Exit 0)** |
| **MCP Catalog & Store** | `packages/provider-adapters/scripts/test-mcp-catalog.ts` | 5/5 Pengujian Lulus | **PASS (Exit 0)** |
| **Monorepo Typecheck** | `npm run typecheck` (8 Workspace) | 0 Error / 0 Warning | **PASS (Exit 0)** |

---

## 6. JAMINAN KEAMANAN & INTEGRITAS
- **Zero-Regression Guarantee**: Seluruh kode mesin inti lama tetap 100% utuh dan kompatibel.
- **Data Protection**: Basis data SQLite `packages/database/prisma/dev.db` tetap menyimpan 2 record kanonis `SavedPrompt` tanpa modifikasi.
- **Zero Secret Leakage**: Kunci API dan kredensial lingkungan tetap terjaga aman.
