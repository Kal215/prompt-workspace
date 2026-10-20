import os
import subprocess
import sys

HTML_CONTENT = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Rancang Bangun Arsitektur PIEW Autonomous Supervisor</title>
<style>
  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @bottom-right {
      content: counter(page);
    }
  }

  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }

  /* Header Cover / Banner */
  .cover-header {
    border-bottom: 2.5pt solid #0f2c59;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .doc-badge {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #0284c7;
    background-color: #e0f2fe;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  h1 {
    font-size: 18pt;
    color: #0f2c59;
    margin: 0 0 6px 0;
    line-height: 1.25;
    font-weight: 800;
  }
  .doc-subtitle {
    font-size: 10pt;
    color: #475569;
    margin: 0 0 12px 0;
  }
  .meta-grid {
    display: table;
    width: 100%;
    margin-top: 10px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    font-size: 8.5pt;
  }
  .meta-row {
    display: table-row;
  }
  .meta-cell-label {
    display: table-cell;
    width: 18%;
    font-weight: 600;
    color: #64748b;
    padding: 2px 0;
  }
  .meta-cell-val {
    display: table-cell;
    width: 32%;
    color: #0f172a;
    font-family: Consolas, monospace;
    padding: 2px 0;
  }

  /* Section Headings */
  h2 {
    font-size: 13pt;
    color: #0f2c59;
    border-bottom: 1.5pt solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 24px;
    margin-bottom: 10px;
    font-weight: 700;
    page-break-after: avoid;
  }
  h3 {
    font-size: 10.5pt;
    color: #1e3a8a;
    margin-top: 14px;
    margin-bottom: 6px;
    font-weight: 700;
    page-break-after: avoid;
  }

  p {
    margin-top: 0;
    margin-bottom: 8px;
    text-align: justify;
  }

  /* Callout Boxes */
  .callout {
    border-left: 4px solid #0284c7;
    background-color: #f0f9ff;
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
    font-size: 9pt;
  }
  .callout-title {
    font-weight: 700;
    color: #0369a1;
    margin-bottom: 4px;
  }

  .callout-warning {
    border-left: 4px solid #dc2626;
    background-color: #fef2f2;
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
    font-size: 9pt;
  }
  .callout-warning .callout-title {
    color: #b91c1c;
  }

  .callout-success {
    border-left: 4px solid #059669;
    background-color: #ecfdf5;
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
    font-size: 9pt;
  }
  .callout-success .callout-title {
    color: #047857;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }
  th {
    background-color: #0f2c59;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #0f2c59;
  }
  td {
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* Code & Diagram Boxes */
  .diagram-box {
    background-color: #0f172a;
    color: #f8fafc;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 8pt;
    line-height: 1.4;
    padding: 12px;
    border-radius: 6px;
    margin: 12px 0;
    white-space: pre;
    overflow-x: hidden;
    page-break-inside: avoid;
    border: 1px solid #334155;
  }

  .code-block {
    background-color: #f1f5f9;
    color: #0f172a;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8pt;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    margin: 8px 0;
    white-space: pre;
    overflow-x: hidden;
    page-break-inside: avoid;
  }

  /* Lists */
  ul, ol {
    margin-top: 4px;
    margin-bottom: 8px;
    padding-left: 20px;
  }
  li {
    margin-bottom: 3px;
    text-align: justify;
  }

  .page-break {
    page-break-before: always;
  }

  .footer-note {
    font-size: 7.5pt;
    color: #94a3b8;
    text-align: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 20px;
  }
</style>
</head>
<body>

<!-- COVER / HEADER -->
<div class="cover-header">
  <div class="doc-badge">PIEW ARCHITECTURE SPECIFICATION • RFC-008</div>
  <h1>RANCANG BANGUN ARSITEKTUR PIEW AUTONOMOUS SUPERVISOR</h1>
  <div class="doc-subtitle">Spesifikasi Sistem Rekayasa: Pengawas Mutu Otonom, Protokol Audit Empiris, dan Kemudi Revisi AI-to-AI</div>
  
  <div class="meta-grid">
    <div class="meta-row">
      <div class="meta-cell-label">Nama Dokumen:</div>
      <div class="meta-cell-val">PIEW-SPEC-SUPERVISOR-V1</div>
      <div class="meta-cell-label">Klasifikasi:</div>
      <div class="meta-cell-val">Internal Architecture Core</div>
    </div>
    <div class="meta-row">
      <div class="meta-cell-label">Target Modul:</div>
      <div class="meta-cell-val">packages/prompt-engine</div>
      <div class="meta-cell-label">Status Standar:</div>
      <div class="meta-cell-val">APPROVED FOR ENGINEERING</div>
    </div>
    <div class="meta-row">
      <div class="meta-cell-label">Protokol:</div>
      <div class="meta-cell-val">MCP / ReAct Empirical Loop</div>
      <div class="meta-cell-label">Tanggal Rilis:</div>
      <div class="meta-cell-val">Oktober 2026</div>
    </div>
  </div>
</div>

<!-- BAB 1 -->
<h2>1. RINGKASAN EKSEKUTIF DAN REPOSISI STRATEGIS</h2>
<p>
Tujuan fundamental dari arsitektur PIEW bukan untuk bersaing menjadi generator kode generik (seperti Cursor, Windsurf, atau Claude Code), melainkan bertindak sebagai <strong>Insinyur Pengawas Mutu dan Pengarah Otonom (Autonomous Lead Architect & Quality Gatekeeper)</strong>. Dalam ekosistem rekayasa perangkat lunak modern, agen koding bertindak sebagai pekerja pelaksana (*implementor*), sementara PIEW bertindak sebagai mandor pengawas yang memastikan setiap instruksi yang diterjemahkan dan setiap baris kode yang dihasilkan memenuhi standar arsitektur industri, bebas cacat sintaksis, dan aman dari halusinasi fungsional.
</p>

<div class="callout">
  <div class="callout-title">REPOSISI NILAI UTAMA PIEW</div>
  PIEW tidak mengambil alih penulisan ribuan baris kode aplikasi dari nol. PIEW mengawal seluruh siklus kerja agen koding: mulai dari formalisasi kontrak kebutuhan pengguna, pengawasan langsung di terminal/git/docker, pengujian bukti fisik nyata, hingga memaksakan revisi taktis terarah sampai hasil akhir terbukti 100% akurat.
</div>

<p>
Dengan memposisikan PIEW sebagai Supervisor Otonom yang memiliki akses alat riil (*terminal, filesystem, git, dan docker*), platform PIEW menyelesaikan persoalan terbesar industri kecerdasan buatan saat ini: <em>ketidakmampuan pengguna awam maupun pengembang dalam memverifikasi kebenaran hasil kerja AI koding secara objektif</em>.
</p>

<!-- BAB 2 -->
<h2>2. EMPAT PRINSIP DASAR REKAYASA (GOLDEN GOVERNANCE PRINCIPLES)</h2>
<p>
Arsitektur pengawas otonom PIEW dibangun di atas 4 pilar tata kelola mutlak yang wajib dipatuhi oleh sistem:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 28%;">Prinsip Rekayasa</th>
      <th style="width: 36%;">Masalah di Industri Saat Ini</th>
      <th style="width: 36%;">Solusi Mekanis PIEW Supervisor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Evidence Over Claims<br>(Audit Bukti Nyata)</strong></td>
      <td>Agen koding sering melapor bahwa tugas "sudah selesai 100%", padahal hanya menyertakan komentar <code>// TODO</code> atau fungsi semu.</td>
      <td>PIEW dilarang mempercayai teks laporan agen. Kelulusan hanya diberikan berdasarkan bukti fisik: git diff, exit code build = 0, dan pengujian unit lulus.</td>
    </tr>
    <tr>
      <td><strong>2. Bounded Iteration<br>(Batas Anggaran Putaran)</strong></td>
      <td>Loop perbaikan tanpa batas menyebabkan kebuntuan logika, token exhaustion, dan pembengkakan biaya API secara eksponensial.</td>
      <td>Menerapkan <em>Circuit Breaker</em> ketat: maksimal 3 kali siklus revisi per fase. Jika batas tercapai, sistem melakukan eskalasi ke operator manusia.</td>
    </tr>
    <tr>
      <td><strong>3. Progressive Task Phasing<br>(Dekonstruksi Bertahap)</strong></td>
      <td>Instruksi monolitik besar membuat agen koding kehilangan konteks, menghasilkan kode terpotong, dan gagal mengintegrasikan sistem.</td>
      <td>PIEW mendekonstruksi proyek menjadi tahapan linier (Database &rarr; API &rarr; UI). Agen dilarang menyentuh fase lanjutan sebelum fase aktif lulus uji.</td>
    </tr>
    <tr>
      <td><strong>4. Zero Secret Leakage<br>(Keamanan Sandbox)</strong></td>
      <td>Kunci API dan token kredensial rawan bocor ke commit log repositori publik saat agen koding melakukan eksekusi otomatis.</td>
      <td>Audit dijalankan pada sandbox lokal berizin terbatas. Kredensial disuntikkan secara bertopeng (masked) melalui variabel lingkungan runtime.</td>
    </tr>
  </tbody>
</table>

<!-- PAGE BREAK UNTUK BAB 3 -->
<div class="page-break"></div>

<!-- BAB 3 -->
<h2>3. ALUR KERJA TERPADU (END-TO-END ORCHESTRATION PIPELINE)</h2>
<p>
Alur orkestrasi antara Pengguna, PIEW Supervisor, dan Agen Koding Eksternal dijalankan melalui 8 tahapan terstruktur yang bersifat linier dan deterministik:
</p>

<div class="diagram-box">
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      ALUR ORKESTRASI & SIKLUS PENGAWASAN PIEW (AI-TO-AI)                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

   [PENGGUNA] Memberikan ide kasar / kebutuhan proyek
       │
       ▼
 ┌─────────────┐
 │   TAHAP 1   │ &rarr; Ingestion & Formalisasi Task Specification Map (DoD & Negative Constraints)
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │   TAHAP 2   │ &rarr; Dekonstruksi Proyek ke Milestone Linier: Fase 1 (DB) &rarr; Fase 2 (API) &rarr; Fase 3 (UI)
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │   TAHAP 3   │ &rarr; Delegasi Instruksi Presisi Fase Aktif ke Agen Pelaksana (Cursor / Claude Code)
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │   TAHAP 4   │ &rarr; Agen Pelaksana Menulis/Memperbarui Berkas Fisik di Workspace Pengembang
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │   TAHAP 5   │ &rarr; ACTIVE EMPIRICAL AUDIT oleh PIEW Supervisor (Bukan Analisis Teks Laporan):
 └─────────────┘   1. Baca git diff HEAD~1 untuk mendeteksi perubahan nyata.
                   2. Eksekusi compiler tsc / npm run build di terminal.
                   3. Verifikasi status kontainer Docker & health-check endpoint.
                   4. Validasi ketiadaan pelanggaran Negative Constraints.
       │
       ▼
 ┌───────────────────────────────────────────────┐
 │ TAHAP 6: KEPUTUSAN KELULUSAN (QUALITY GATE)   │
 └───────────────────────────────────────────────┘
       │
       ├─────────────────────────────────┬─────────────────────────────────┐
       ▼                                 ▼                                 ▼
 [STATUS: DEFECT FOUND]        [STATUS: HARD BLOCK]             [STATUS: GATE PASSED]
 (Ada galat & Retry &lt; 3x)      (Buntu / Retry &gt;= 3x)            (Seluruh Kriteria Lulus)
       │                                 │                                 │
       ▼                                 ▼                                 ▼
 ┌─────────────┐                 ┌─────────────┐                   ┌─────────────┐
 │   TAHAP 7   │                 │  ESKALASI   │                   │   TAHAP 8   │
 │ Formulasi   │                 │ Laporkan ke │                   │ Kunci Fase, │
 │ Revisi Taktis                 │ Manusia via │                   │ Lanjut Fase │
 └─────────────┘                 │ HITL Gate   │                   │ Berikutnya  │
       │                         └─────────────┘                   └─────────────┘
       └───────(Loop ke Tahap 3)                                           │
                                                                           ▼
                                                             [PENYERAHAN AKHIR KE USER]
</div>

<h3>Rincian Pelaksanaan Setiap Tahapan:</h3>
<ol>
  <li><strong>Tahap 1 — Pre-Flight Ingestion & Kontrak Kerja</strong>: PIEW menerima prompt pengguna, membedah tujuan inti, mengidentifikasi arketipe tugas, menyusun batasan mutlak (<em>negative constraints</em>), dan menetapkan kriteria kelulusan formal (<em>Definition of Done / DoD</em>).</li>
  <li><strong>Tahap 2 — Milestone Phasing</strong>: Tugas besar dipecah menjadi unit-unit logis berurutan. Misalnya pada aplikasi e-commerce: Fase 1 adalah skema database Prisma, Fase 2 adalah endpoint transaksi & pembayaran, Fase 3 adalah antarmuka web.</li>
  <li><strong>Tahap 3 — Delegasi Presisi</strong>: PIEW mengirimkan paket instruksi fase aktif ke agen koding (via MCP Server atau prompt terstruktur) lengkap dengan batasan teknologi dan larangan mutlak.</li>
  <li><strong>Tahap 4 — Pengerjaan Agen Koding</strong>: Agen pelaksana (seperti Cursor atau Claude Code) memproses instruksi dan melakukan modifikasi berkas di lingkungan lokal.</li>
  <li><strong>Tahap 5 — Active Empirical Inspection</strong>: Segera setelah agen koding menyatakan selesai, PIEW Supervisor secara mandiri menjalankan serangkaian alat inspeksi fisik di terminal tanpa meminta konfirmasi dari agen koding.</li>
  <li><strong>Tahap 6 — Quality Gate Decision</strong>: Menilai matriks temuan audit ke dalam 3 tingkat keparahan: <em>Critical</em> (wajib revisi), <em>Major</em> (wajib revisi), atau <em>Minor</em> (peringatan).</li>
  <li><strong>Tahap 7 — Automated Steering Loop</strong>: Jika ditemukan galat, PIEW merumuskan prompt koreksi taktis yang spesifik menyebutkan nama berkas, nomor baris, pesan galat compiler, dan langkah perbaikan yang ditargetkan.</li>
  <li><strong>Tahap 8 — Phase Sign-Off & Delivery</strong>: Fase aktif dinyatakan selesai secara permanen. Progres dikunci di basis data riwayat, dan sistem beralih ke fase berikutnya hingga seluruh proyek tuntas.</li>
</ol>

<!-- PAGE BREAK UNTUK BAB 4 -->
<div class="page-break"></div>

<!-- BAB 4 -->
<h2>4. TAKSONOMI ALAT KERJA SUPERVISOR (SUPERVISOR TOOLSET)</h2>
<p>
Agar mampu melakukan pengawasan secara objektif tanpa halusinasi, runtime PIEW Supervisor dibekali 5 alat kerja kanonis (*Canonical Verification Tools*):
</p>

<table>
  <thead>
    <tr>
      <th style="width: 22%;">Nama Tool</th>
      <th style="width: 25%;">Target & Parameter</th>
      <th style="width: 28%;">Metode Kerja Empiris</th>
      <th style="width: 25%;">Pencegahan Kegagalan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>git_inspect_diff</code></td>
      <td><code>path?: string</code><br><code>targetCommit: string</code></td>
      <td>Mengeksekusi <code>git diff</code> secara terisolasi untuk mendeteksi penambahan, modifikasi, atau penghapusan baris kode.</td>
      <td>Mendeteksi bila agen koding menghapus file konfigurasi penting secara tidak sengaja.</td>
    </tr>
    <tr>
      <td><code>terminal_run_verification</code></td>
      <td><code>command: string</code><br><code>timeoutSec: number</code></td>
      <td>Menjalankan compiler TypeScript (<code>tsc --noEmit</code>) atau test runner (<code>npm test</code>) dan menangkap exit code, stdout, serta stderr.</td>
      <td>Dilengkapi timeout guard 60 detik untuk mencegah proses terminal membeku selamanya.</td>
    </tr>
    <tr>
      <td><code>docker_health_check</code></td>
      <td><code>containerName: string</code><br><code>expectedPorts: int[]</code></td>
      <td>Memeriksa status kontainer Docker lokal (running/restarting/exited), memeriksa pemetaan port, dan membaca 50 baris log terakhir.</td>
      <td>Mendeteksi kondisi <em>crash-loop</em> pada database atau service latar belakang.</td>
    </tr>
    <tr>
      <td><code>spec_compliance_evaluator</code></td>
      <td><code>taskSpecId: string</code><br><code>changedFiles: string[]</code></td>
      <td>Mencocokkan berkas yang diubah terhadap daftar batasan negatif dan persyaratan fungsional dari Task Specification Map.</td>
      <td>Menolak hasil jika agen membuat modul yang secara eksplisit dilarang oleh pengguna.</td>
    </tr>
    <tr>
      <td><code>generate_steering_prompt</code></td>
      <td><code>auditFailures: Defect[]</code><br><code>phaseId: string</code></td>
      <td>Mengonversi seluruh log kegagalan teknis menjadi naskah instruksi perbaikan yang terstruktur dan mudah dieksekusi agen koding.</td>
      <td>Menghilangkan nada emosional/berbelit-belit; fokus pada perbaikan kode deterministik.</td>
    </tr>
  </tbody>
</table>

<!-- BAB 5 -->
<h2>5. KONTRAK DATA DAN SKEMA KEPUTUSAN MUTU (DATA SCHEMAS)</h2>
<p>
Seluruh komunikasi pengawasan diatur menggunakan skema data validasi Zod ketat yang bertempat di <code>packages/prompt-contracts/src/supervision.ts</code>:
</p>

<h3>A. Skema Kontrak Pengawasan Fase Proyek (PhasedProjectSessionSchema)</h3>
<div class="code-block">export const PhasedProjectSessionSchema = z.object({
  sessionId: z.string().uuid(),
  projectName: z.string().min(1),
  userOriginalPrompt: z.string(),
  totalPhases: z.number().int().min(1),
  currentPhaseIndex: z.number().int().nonnegative(),
  phases: z.array(z.object({
    phaseId: z.string(),
    name: z.string(),
    targetArchetype: z.string(),
    definitionOfDone: z.array(z.string()),
    negativeConstraints: z.array(z.string()),
    retryCount: z.number().int().default(0),
    maxRetries: z.number().int().default(3),
    status: z.enum(["PENDING", "IN_PROGRESS", "AUDITING", "COMPLETED", "HALTED"]),
    auditTrail: z.array(z.string()).default([]),
  })),
  overallStatus: z.enum(["INITIALIZING", "RUNNING", "COMPLETED", "HALTED_MAX_RETRIES"]),
});</div>

<h3>B. Skema Hasil Audit Empiris (EmpiricalAuditResultSchema)</h3>
<div class="code-block">export const EmpiricalAuditResultSchema = z.object({
  auditId: z.string().uuid(),
  phaseId: z.string(),
  timestamp: z.string().datetime(),
  verificationChecks: z.object({
    typecheckPassed: z.boolean(),
    testSuitePassed: z.boolean(),
    negativeConstraintsRespected: z.boolean(),
    runtimeHealthPassed: z.boolean(),
  }),
  defectsDetected: z.array(z.object({
    severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
    fileLocation: z.string().optional(),
    lineRange: z.string().optional(),
    failureMessage: z.string(),
    rawStdoutStderr: z.string().optional(),
  })),
  verdict: z.enum(["APPROVED_PASS", "REJECT_REVISE", "ESCALATE_BLOCKED"]),
  steeringDirective: z.string().optional(),
});</div>

<!-- PAGE BREAK UNTUK BAB 6 -->
<div class="page-break"></div>

<!-- BAB 6 -->
<h2>6. FORMAT RESMI INSTRUKSI KEMUDI REVISI (STEERING PROMPT FORMAT)</h2>
<p>
Ketika PIEW Supervisor mendeteksi kegagalan audit pada Tahap 5, sistem secara otomatis merumuskan <em>Steering Prompt</em> dengan struktur baku 4-komponen yang telah terbukti memiliki tingkat keberhasilan perbaikan tertinggi saat diterima oleh Cursor atau Claude Code:
</p>

<div class="code-block">[PIEW SUPERVISOR REJECTION DIRECTIVE — PHASE {PHASE_NUMBER}: {PHASE_NAME}]
Pekerjaan Anda pada fase ini DITOLAK oleh PIEW Quality Gatekeeper karena tidak memenuhi standar verifikasi empiris.

1. RINGKASAN DEFECT KRITIS:
   - File: {PATH_TO_FILE} (Baris: {LINE_NUMBERS})
   - Kategori Kegagalan: {DEFECT_CATEGORY} (Misal: TypeScript Type Mismatch / Unhandled Promise Rejection)
   - Bukti Output Terminal:
     >>> {RAW_COMPILER_OR_TEST_STDERR}

2. PELANGGARAN BATASAN MUTLAK (JIKA ADA):
   - Anda melanggar batasan pengguna: "{VIOLATED_NEGATIVE_CONSTRAINT}".

3. TINDAKAN PERBAIKAN WAJIB (ACTION REQUIRED):
   - Perbaiki berkas {PATH_TO_FILE} agar tipe data kembali sesuai kontrak.
   - Tambahkan blok penanganan error pada fungsi {FUNCTION_NAME}.
   - Pastikan perintah `npm run build` dan `npm test` menghasilkan Exit Code 0.

4. CATATAN BATAS ANGGARAN:
   - Percobaan ke-{RETRY_CURRENT} dari maksimum {MAX_RETRIES} toleransi perbaikan.
   - Perbaiki berkas tersebut sekarang dan laporkan kembali setelah tuntas.</div>

<!-- BAB 7 -->
<h2>7. INTEGRASI MODEL CONTEXT PROTOCOL (MCP SERVER DI IDE)</h2>
<p>
Pengguna yang menggunakan IDE AI modern (Cursor, Windsurf, atau Claude Code) dapat menghubungkan PIEW Supervisor secara native melalui protokol MCP:
</p>

<div class="callout-success">
  <div class="callout-title">SEAMLESS IDE MCP INTEGRATION</div>
  Pengembang cukup menambahkan PIEW ke berkas konfigurasi MCP mereka (<code>cursor.json</code> atau <code>claude_desktop_config.json</code>). Agen koding di dalam IDE akan melihat PIEW sebagai alat verifikasi otoritatif yang dapat dipanggil sebelum menandai pekerjaan selesai.
</div>

<p>Contoh konfigurasi integrasi pada IDE pengembang:</p>
<div class="code-block">{
  "mcpServers": {
    "piew-supervisor": {
      "command": "piew",
      "args": ["mcp"],
      "env": {
        "PIEW_AUTONOMOUS_SUPERVISOR": "true",
        "PIEW_MAX_PHASE_RETRIES": "3"
      }
    }
  }
}</div>

<!-- BAB 8 -->
<h2>8. ROADMAP IMPLEMENTASI TEKNIS PADA MONOREPO PIEW</h2>
<p>
Penerapan rancang bangun ini tidak memerlukan perubahan merusak pada monorepo dan dapat diintegrasikan secara 100% aditif:
</p>
<ul>
  <li><strong>Fase A (Penyempurnaan Kontrak)</strong>: Memperkaya <code>packages/prompt-contracts/src/supervision.ts</code> dengan skema <code>EmpiricalAuditResultSchema</code> dan tipe defek teknis.</li>
  <li><strong>Fase B (Aktivasi Runtime Empiris)</strong>: Menghubungkan fungsi terminal runner lokal dan git parser ke dalam <code>packages/prompt-engine/src/supervisor.ts</code>.</li>
  <li><strong>Fase C (Eksposur Subperintah CLI)</strong>: Menambahkan subperintah <code>npm run piew -- supervise &lt;prompt&gt;</code> pada <code>scripts/piew-cli.ts</code> untuk pengoperasian langsung dari terminal pengguna.</li>
  <li><strong>Fase D (Tampilan Status Dashboard)</strong>: Menghubungkan log audit empiris ke panel pengawasan antarmuka web masa depan.</li>
</ul>

<div class="footer-note">
  Dokumen Spesifikasi Resmi • Prompt Intelligence Engineering Workspace (PIEW) • Hak Cipta 2026 • Format Standar Industri
</div>

</body>
</html>
"""

def generate_pdf():
    workspace_dir = "/home/riskal/prompt-workspace"
    html_path = os.path.join(workspace_dir, "RANCANG_BANGUN_PIEW_AUTONOMOUS_SUPERVISOR.html")
    pdf_path = os.path.join(workspace_dir, "RANCANG_BANGUN_PIEW_AUTONOMOUS_SUPERVISOR.pdf")

    print(f"[*] Menulis berkas HTML spesifikasi ke: {html_path}")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)

    print(f"[*] Mengonversi HTML ke PDF berkualitas tinggi menggunakan Google Chrome Headless...")
    cmd = [
        "google-chrome",
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        html_path
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Gagal membuat PDF: {res.stderr}")
        sys.exit(1)

    print(f"[+] Berkas PDF berhasil dibuat di: {pdf_path}")
    print(f"[+] Ukuran berkas: {os.path.getsize(pdf_path)} bytes")

if __name__ == "__main__":
    generate_pdf()
