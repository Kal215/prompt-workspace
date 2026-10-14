# Panduan Kontribusi (Contributing Guide)
**Prompt Intelligence Engineering Workspace (PIEW)**

Terima kasih atas ketertarikan Anda untuk berkontribusi pada PIEW! Dokumen ini menguraikan panduan, standar teknik, serta prosedur operasional yang wajib dipatuhi oleh seluruh kontributor dan pengembang, sesuai dengan **Blueprint v1.0 Bagian 13 (Rencana Kerja #6), Bagian 16, Bagian 17, dan Bagian 20**.

---

## 🏛️ 1. Standar Rekayasa Perangkat Lunak (Code Standards)

Sesuai **Blueprint Bagian 20.1**, setiap kode yang diajukan wajib mematuhi pilar rekayasa berikut:

1. **TypeScript Ketat (Strict Mode)**:
   - Tidak diperkenankan menggunakan tipe `any` tanpa justifikasi tertulis.
   - Seluruh data yang melintasi batas modul (*module boundary*) wajib divalidasi menggunakan skema Zod di `@prompt-workspace/prompt-contracts`.
2. **Prinsip Arsitektur Monolith Modular**:
   - `packages/prompt-contracts`: Single Source of Truth untuk kontrak data. Dilarang mengimpor dari package lain.
   - `packages/domain-rules`: Berisi aturan domain berversi. Mandiri dan bebas efek samping.
   - `packages/provider-adapters`: Adapter antarmuka LLM pihak ketiga dengan normalisasi error terpadu.
   - `packages/prompt-engine`: Logika bisnis inti optimasi prompt dan playground runner.
   - `packages/database`: Lapisan data Prisma ORM dan helper persistensi.
   - `apps/web`: Antarmuka visual Next.js 16 (App Router) dan API route handlers.
3. **Data Minimization & Safe Logging (Blueprint Bagian 3 & 15.2)**:
   - Dilarang keras mencatat (*log*) teks prompt mentah pengguna, respons mentah LLM, atau kunci API ke konsol server operasional.
   - Selalu gunakan `SafeLogger` untuk sanitasi otomatis kredensial dan data sensitif.

---

## 🌿 2. Konvensi Branching & Pull Request (Git Workflow)

Sesuai **Blueprint Bagian 16.2**:

1. **Aturan Branching**:
   - `main`: Branch produksi yang selalu stabil dan terproteksi (*production-ready*).
   - **Dilarang keras melakukan commit atau push langsung ke `main`**.
   - Format penamaan branch kerja:
     - `feat/<deskripsi-singkat>-task<nomor>` (Fitur baru)
     - `fix/<deskripsi-singkat>-task<nomor>` (Perbaikan bug / hotfix)
     - `docs/<deskripsi-singkat>-task<nomor>` (Dokumentasi & tata kelola)
2. **Format Pesan Commit (Conventional Commits)**:
   Gunakan format: `<type>(<scope>): <deskripsi singkat>`
   Contoh:
   - `feat(prompt-engine): implement target model playground and placeholder resolver (task #29)`
   - `fix(web): resolve race condition in history deletion (task #18)`
   - `docs(release): Stage 6 public release docs and runbook SOP (task #31)`

---

## 🚦 3. Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR) — Sebelum Pekerjaan Dimulai
Sebelum suatu tugas dikerjakan (Tahap G0 - G1):
- [ ] Sasaran tugas (*Goal*) dan batasan wilayah kerja (*Strict Boundaries*) terdokumentasi jelas.
- [ ] Ketergantungan PR sebelumnya telah di-merge ke `main` dan HEAD SHA telah dicatat.
- [ ] Database SQLite aktif `packages/database/prisma/dev.db` diverifikasi keutuhan 2 record aslinya.

### Definition of Done (DoD) — Sebelum PR Diajukan & Di-merge
Sebelum suatu PR disetujui (Tahap G2 - G6):
- [ ] Seluruh kode baru mematuhi aturan batas wilayah monorepo.
- [ ] Tidak ada file rahasia (`.env`, `dev.db`, API keys) yang ter-commit ke Git.
- [ ] Unit test, regression test, dan browser E2E test terkait ditulis dan lulus 100%.
- [ ] Seluruh 10 pemeriksaan verifikasi wajib di bawah ini menghasilkan **Exit Code 0**.

---

## 🧪 4. Daftar Perintah Verifikasi Wajib Sebelum Membuka PR

Jalankan seluruh rangkaian verifikasi berikut di terminal sebelum mengajukan Pull Request:

```bash
# 1. Jalankan Skrip Release Readiness Auditor
node scripts/release-readiness-check.mjs

# 2. Pengujian Unit Prompt Engine & Playground
npm run test --workspace=@prompt-workspace/prompt-engine

# 3. Pengujian Kontrak Provider Adapters & Error Normalization
npm run test --workspace=@prompt-workspace/provider-adapters

# 4. Pengujian 5 Domain Rule Packs
npm run test --workspace=@prompt-workspace/domain-rules

# 5. Typecheck TypeScript Monorepo (Wajib 0 error di seluruh 6 workspace)
npm run typecheck

# 6. Pengujian Persistensi Database & Otorisasi Multi-User
npm run test --workspace=@prompt-workspace/database

# 7. Pengujian Unit Route Handler Web
npm run test:unit --workspace=web

# 8. Pengujian Regresi API Web (Termasuk CSRF, Rate Limit, dan /api/execute)
npm run test:api --workspace=web

# 9. Kompilasi Produksi Monorepo (Next.js Turbopack & TS Packages)
npm run build

# 10. Verifikasi Integritas Database dev.db (2 record aktif wajib utuh)
sqlite3 packages/database/prisma/dev.db "SELECT id, userId, score FROM SavedPrompt ORDER BY id;"
```

---

## 🤝 5. Kode Etik Kontributor (Code of Conduct)

Kami berkomitmen untuk menyediakan lingkungan kolaborasi yang inklusif, profesional, dan saling menghargai. Setiap kontributor diharapkan:
- Berkomunikasi secara konstruktif dan berbasis bukti (*Evidence over claims*).
- Menghargai batasan wilayah kerja dan keputusan arsitektur yang telah disepakati di ADR/PDR.
- Melindungi privasi pengguna dan keamanan sistem di atas segalanya.
