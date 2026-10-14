# AGENTS.md - Aturan Kerja AI Agent

Dokumen ini adalah sumber kebenaran bagi AI Agent di repositori ini.
Setiap Agent WAJIB membaca dan mematuhi batasan ini sebelum menulis kode.
Berdasarkan: Prompt_Intelligence_Engineering_Workspace_Blueprint_v1.0

## 1. Pembagian Wilayah (Strict Boundaries)
- **Agent VPS (Engine & Backend)**:
  - HANYA boleh menyentuh: packages/prompt-engine, packages/prompt-contracts, packages/provider-adapters, packages/domain-rules, test-fixtures
  - Fokus: Logika murni, skema validasi, Analyzer, Optimizer, Evaluator, Adapter LLM
  - DILARANG menyentuh React, Next.js UI, atau CSS

- **Agent PC (Frontend & Web)**:
  - HANYA boleh menyentuh: apps/web
  - Fokus: Next.js, Tailwind, shadcn/ui, State Management, integrasi API
  - DILARANG menulis logika bisnis prompt di dalam komponen React

## 2. Aturan Emas (Blueprint v1.0 Bagian 3)
- **Preserve Intent**: Jangan pernah mengubah maksud asli prompt user secara diam-diam
- **Analyze before optimize**: Temukan masalah dulu, baru perbaiki
- **Evidence over Claims**: Jangan klaim "lebih baik" tanpa rubrik/bukti
- **Human in Control**: User selalu punya kendali accept/edit/reject
- **No Secrets**: JANGAN PERNAH taruh API Key di kode, log, atau commit. Gunakan .env

## 3. Standar Commit & Branch (Blueprint Bagian 16.2)
- Branch pendek: feat/nama-fitur atau fix/nama-bug
- Commit message jelas: feat(engine): add intent validator
- Jangan push langsung ke main. Selalu buat Pull Request (PR)
- Types First: definisikan kontrak di packages/prompt-contracts dulu sebelum implementasi