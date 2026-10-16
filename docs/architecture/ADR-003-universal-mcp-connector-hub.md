# ADR-003: Universal MCP Connector Hub, Bi-Directional Tool Bridge & Safety Gate Engine

## Status
Accepted / Implemented (Task #58)

## Konteks & Latar Belakang
Model Context Protocol (MCP) adalah standar terbuka dari Anthropic untuk menghubungkan asisten AI ke sumber data eksternal dan alat (*tools*). Sebelum Task #58, PIEW hanya beroperasi sebagai **MCP Server** satu arah (`scripts/piew-mcp-server.ts`) yang mengekspos kapabilitas supervisi otonom dan sintesis blueprint ke IDE eksternal (seperti Cursor dan Claude Code).

Namun, untuk mencapai visi otonom PIEW yang komprehensif, arsitektur harus berevolusi menjadi **Dual-Role MCP System**:
1. **MCP Server**: Tetap melayani coding agent eksternal.
2. **MCP Client / Connector Hub**: Bertindak sebagai tuan rumah (*host*) yang mampu menyambung dua arah (*2-Way Bridge*) ke berbagai server MCP eksternal (Figma, GitHub, PostgreSQL, Notion, Airtable, Asana, Algolia, AWS Knowledge, Brave Search, dan konektor kustom pengguna).

## Keputusan Arsitektur

### 1. Empat Pilar Kapabilitas (Kontrak Zod di `@prompt-workspace/prompt-contracts`)
- **Transport Types**: `stdio` (eksekusi lokal child process), `sse`, dan `streamable_http`.
- **Permission Modes**:
  - `read_only`: Hanya mengizinkan pembacaan konteks/resource dan pemanggilan tool non-mutasi.
  - `write_with_approval`: Operasi mutatif keluar (*write action*) wajib melalui gerbang konfirmasi manusia (*Human-in-the-Loop Gate*).
  - `full_trusted`: Mode otomatis penuh hanya jika disetujui secara sadar oleh pemilik sistem.
- **Tool Discovery & Typing**: `McpToolSchema` (name, description, inputSchema, isMutating) dan `McpResourceSchema` (uri, name, mimeType).
- **Connector Configuration**: `McpConnectorConfigSchema` dengan kategori (`design`, `database`, `devtools`, `productivity`, `search`, `analytics`, `custom`), badge (`MCP · Catalog`, `MCP · Custom`, `Managed`), dan status kesehatan koneksi.

### 2. Brankas Persistensi & Katalog Bawaan (`~/.piew/mcp-connectors.json`)
- Penyimpanan lokal dengan izin berkas ketat `0600` (hanya dapat dibaca/ditulis oleh pemilik proses).
- Dukungan resolusi jalur konfigurasi kustom via `PIEW_MCP_CONNECTORS_PATH` untuk isolasi pengujian otomatis.
- **Zero-Secret Leakage Guarantee**: Kredensial sensitif (`FIGMA_ACCESS_TOKEN`, `GITHUB_TOKEN`, `DATABASE_URL`, dll.) otomatis disensor (`sk-••••...`) saat dibaca oleh layer publik atau UI web.
- Preservasi kredensial lama jika kolom input kunci dikosongkan (*"Leave blank to keep current key"*).
- Katalog awal 10 konektor populer terpasang secara default.

### 3. Bi-Directional Tool Bridge & Safety Gate Engine
- **Arah 1 — Inbound Context Enrichment (Read)**:
  - `gatherMcpExternalContext(prompt, options)` mendeteksi tautan atau kata kunci sumber eksternal (misal: URL Figma, skema PostgreSQL, repository GitHub, halaman Notion).
  - Menarik data skema, frame, atau token dari konektor terkait dan menyuntikkannya ke dalam konteks sintesis `synthesizeUniversalBlueprintAsync`.
  - Menghasilkan diagram ERD Mermaid dan spesifikasi teknis yang 100% selaras dengan desain dan basis data riil pengguna.
- **Arah 2 — Outbound Action Execution & Safety Gate (Write)**:
  - `executeMcpConnectorTool({ connectorId, toolName, args, userApproved })` mengevaluasi sifat mutatif alat.
  - Jika alat bersifat mutatif (`isMutating: true`) dan izin konektor adalah `write_with_approval` tanpa `userApproved: true`, eksekusi **DITOLAK SEMENTARA** dengan status `PENDING_HUMAN_APPROVAL`, mengembalikan pratinjau payload (*Human-in-the-Loop*).
  - Jika izin konektor adalah `read_only`, seluruh mutasi ditolak mutlak (`REJECTED`).
  - Hanya setelah persetujuan eksplisit (`userApproved: true`) atau pada mode `full_trusted`, aksi tulis dikirim ke server MCP eksternal.

### 4. Live MCP Client Engine
- Klien JSON-RPC 2.0 nyata yang mendukung siklus hidup:
  1. `initialize`
  2. `notifications/initialized`
  3. `tools/list`
  4. `resources/list`
  5. `tools/call`
- Batas waktu ketat (*strict timeout*) dengan terminasi proses anak otomatis untuk mencegah *zombie processes* atau *memory leak*.

## Konsekuensi & Kompatibilitas
- 100% *backward-compatible* dengan seluruh test suite dan alur sintesis lama.
- Mode fallback deterministik tetap tersedia jika koneksi jaringan atau proses eksternal gagal.
- Antarmuka web (`apps/web/`) siap disambungkan pada Task #59 menggunakan kontrak Zod dan store API yang telah tervalidasi.