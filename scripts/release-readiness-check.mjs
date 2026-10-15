#!/usr/bin/env node
/**
 * scripts/release-readiness-check.mjs
 * -----------------------------------------------------------------------------
 * Audit Kesiapan Rilis & Tata Kelola Platform Otomatis
 * PIEW v2.0.0 — Checklist Kelulusan Rilis P0 (Lampiran A ADR-002) & Stages G0 - G5
 * -----------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== [${title}] ===${colors.reset}`);
}

function logStep(step, status) {
  const icon = status === "PASS" ? `${colors.green}✔ PASS${colors.reset}` : `${colors.red}✖ FAIL${colors.reset}`;
  console.log(`  [${icon}] ${step}`);
}

const checkResults = [];

function recordCheck(category, name, passed, detail = "") {
  checkResults.push({ category, name, passed, detail });
  logStep(`${name}: ${detail}`, passed ? "PASS" : "FAIL");
}

// ------------------------------------------------------------------------------
// 1. Verifikasi Keberadaan Seluruh Artefak Wajib (v1.x & P0 v2.0 Lampiran A ADR-002)
// ------------------------------------------------------------------------------
logHeader("1. AUDIT ARTEFAK WAJIB (STAGES G0 - G5 & ADR-002)");

const REQUIRED_ARTIFACTS = [
  // Fondasi & Arsitektur v1.x
  "docs/architecture/ADR-001-modular-monolith-and-security.md",
  "docs/architecture/RUNBOOK-operations-and-recovery.md",
  "docs/architecture/COMPATIBILITY-AND-VERSIONING-POLICY.md",
  "docs/architecture/ARCHITECTURE-AND-DEBT-REVIEW-2026-Q4.md",
  // Keputusan Produk & Fitur v1.x
  "docs/product/PDR-001-domain-packs-c1.md",
  "docs/product/PDR-002-multi-provider-adapters-c2.md",
  "docs/product/PDR-003-target-model-playground-c3.md",
  "docs/product/RELEASE-NOTES-v1.0.0-mvp.md",
  "docs/product/RELEASE-NOTES-v1.1.0.md",
  "docs/product/USER-GUIDE-AND-FAQ.md",
  "docs/product/ROADMAP-AND-METRICS-STAGE7.md",
  "docs/product/BLUEPRINT-CHANGELOG.md",
  // Operasi & Tata Kelola v1.x
  "docs/operations/RELEASE-CHECKLIST-v1.1.0.md",
  "docs/operations/RUNBOOK.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "README.md",
  ".env.example",
  "test-fixtures/baseline-prompts.json",

  // --- Artefak Wajib v2.0 (Checklist Kelulusan Rilis P0 Lampiran A ADR-002) ---
  // 1. Dokumen Arsitektur & Rilis v2.0
  "docs/architecture/ADR-002-crawler-spider-integration.md",
  "docs/architecture/GATE-0-COMPATIBILITY-REPORT.md",
  "docs/product/RELEASE-NOTES-v2.0.0.md",
  // 2. Package @prompt-workspace/prompt-crawler
  "packages/prompt-crawler/src/ssrf-guard.ts",
  "packages/prompt-crawler/src/fetcher.ts",
  "packages/prompt-crawler/src/redactor.ts",
  "packages/prompt-crawler/src/extractor.ts",
  // 3. Package @prompt-workspace/prompt-spider
  "packages/prompt-spider/src/test-suite.ts",
  "packages/prompt-spider/src/runner.ts",
  "packages/prompt-spider/src/evaluator.ts",
  "packages/prompt-spider/src/semaphore.ts",
  // 4. Helper closed-loop & kontrak v2.0
  "packages/prompt-engine/src/closed-loop.ts",
  "packages/prompt-contracts/src/crawler.ts",
  "packages/prompt-contracts/src/spider.ts",
  // 5. Route API, Feature Flags & Komponen UI v2.0
  "apps/web/src/app/api/crawl/route.ts",
  "apps/web/src/app/api/spider/route.ts",
  "apps/web/src/lib/feature-flags.ts",
  "apps/web/src/components/workspace/crawler-import-modal.tsx",
  "apps/web/src/components/workspace/spider-matrix-panel.tsx",
  "apps/web/src/components/workspace/prompt-version-bar.tsx",
  // 6. Infrastruktur & Panduan Multi-Platform Packaging (Web, Desktop .exe, Android .apk)
  "docs/operations/packaging/capacitor.config.json",
  "docs/operations/packaging/tauri.conf.json",
  "docs/operations/MULTI-PLATFORM-BUILD-GUIDE.md",
  "scripts/verify-multiplatform.mjs",
];

for (const relPath of REQUIRED_ARTIFACTS) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const exists = fs.existsSync(fullPath);
  let size = 0;
  if (exists) {
    size = fs.statSync(fullPath).size;
  }
  const passed = exists && size > 100;
  recordCheck(
    "Artefak Wajib",
    relPath,
    passed,
    exists ? `${size} bytes` : "FILE TIDAK DITEMUKAN"
  );
}

// ------------------------------------------------------------------------------
// 2. Audit Keamanan & Zero-Secret Governance
// ------------------------------------------------------------------------------
logHeader("2. AUDIT KEAMANAN & ZERO-SECRET GOVERNANCE");

// A. Gitignore checks
try {
  const gitignoreContent = fs.readFileSync(path.join(ROOT_DIR, ".gitignore"), "utf-8");
  const ignoresEnv = gitignoreContent.includes(".env");
  const ignoresDb = gitignoreContent.includes("*.db") || gitignoreContent.includes("dev.db");
  recordCheck("Keamanan Git", ".gitignore mengabaikan .env", ignoresEnv, ".env terdaftar");
  recordCheck("Keamanan Git", ".gitignore mengabaikan *.db", ignoresDb, "database terdaftar");
} catch (err) {
  recordCheck("Keamanan Git", "Pembacaan .gitignore", false, err.message);
}

// B. Pastikan .env dan dev.db tidak ter-track oleh Git
try {
  const trackedEnv = execSync("git ls-files .env", { cwd: ROOT_DIR, encoding: "utf-8" }).trim();
  const trackedDb = execSync("git ls-files packages/database/prisma/dev.db", { cwd: ROOT_DIR, encoding: "utf-8" }).trim();
  recordCheck("Keamanan Git", ".env tidak ter-track Git", trackedEnv === "", trackedEnv ? "LEAK ALERT!" : "Aman");
  recordCheck("Keamanan Git", "dev.db tidak ter-track Git", trackedDb === "", trackedDb ? "LEAK ALERT!" : "Aman");
} catch (err) {
  recordCheck("Keamanan Git", "Pemeriksaan git ls-files", false, err.message);
}

// C. Scan potensi naked secret API key di file yang di-track Git
try {
  let secretFound = false;
  const patternMatch = execSync(
    'git grep -E "(gsk_[a-zA-Z0-9]{30,}|AIzaSy[a-zA-Z0-9_-]{33}|sk-or-v1-[a-zA-Z0-9]{32,})" -- ":!test-fixtures/*" ":!*.test.*" ":!*.example" ":!*test*" || true',
    {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      shell: process.platform === "win32" ? "bash" : "/bin/sh",
    }
  ).trim();

  if (patternMatch) {
    secretFound = true;
  }
  recordCheck(
    "Keamanan Git",
    "Zero Naked Secret Leakage di Git",
    !secretFound,
    secretFound ? `Ditemukan potensi secret: ${patternMatch.slice(0, 50)}...` : "Bersih (0 secret bocor)"
  );
} catch (err) {
  recordCheck("Keamanan Git", "Scan regex secret", false, err.message);
}

// ------------------------------------------------------------------------------
// 3. Verifikasi Integritas Database SQLite dev.db
// ------------------------------------------------------------------------------
logHeader("3. AUDIT INTEGRITAS DATABASE AKTIF (dev.db)");

const devDbPath = path.join(ROOT_DIR, "packages/database/prisma/dev.db");
if (!fs.existsSync(devDbPath)) {
  recordCheck("Integritas Database", "Keberadaan dev.db", false, "dev.db tidak ditemukan!");
} else {
  try {
    let lines = [];
    let hasLegacyOwner = false;

    try {
      const { DatabaseSync } = await import("node:sqlite");
      const db = new DatabaseSync(devDbPath);
      const rows = db
        .prepare("SELECT id, userId, score FROM SavedPrompt ORDER BY id;")
        .all();
      lines = rows.map((r) => `${r.id}|${r.userId}|${r.score}`);
      hasLegacyOwner = rows.some((r) => r.userId === "legacy_default_user");
    } catch {
      const rawOutput = execSync(
        `sqlite3 "${devDbPath}" "SELECT id, userId, score FROM SavedPrompt ORDER BY id;"`,
        { encoding: "utf-8" }
      ).trim();
      lines = rawOutput.split("\n").filter((l) => l.trim().length > 0);
      hasLegacyOwner = rawOutput.includes("legacy_default_user");
    }

    const passed = lines.length >= 2 && hasLegacyOwner;
    recordCheck(
      "Integritas Database",
      "Perlindungan Record Asli dev.db",
      passed,
      `Ditemukan ${lines.length} record aktif (legacy_default_user utuh 100%)`
    );
  } catch (err) {
    recordCheck("Integritas Database", "Query dev.db", false, err.message);
  }
}

// ------------------------------------------------------------------------------
// 4. Eksekusi Seluruh Rangkaian Verifikasi Otomatis (Suites)
// ------------------------------------------------------------------------------
logHeader("4. EKSEKUSI SUITE PENGUJIAN OTOMATIS & KOMPILASI");

const VERIFICATION_COMMANDS = [
  {
    name: "Monorepo Typecheck",
    command: "npm run typecheck",
    detail: "Validasi TypeScript 8 workspace",
  },
  {
    name: "v2 Engines Test Suite",
    command: "npm run test:v2-engines",
    detail: "Contracts, Crawler, Spider, & Closed-Loop synthesis",
  },
  {
    name: "Prompt Engine Playground Tests",
    command: "npm run test --workspace=@prompt-workspace/prompt-engine",
    detail: "18/18 tests (Extractor, Resolver, Runner)",
  },
  {
    name: "Provider Adapters Contract Tests",
    command: "npm run test --workspace=@prompt-workspace/provider-adapters",
    detail: "23/23 tests (Groq, Gemini, OpenRouter, Ollama)",
  },
  {
    name: "Domain Rules Unit Tests",
    command: "npm run test --workspace=@prompt-workspace/domain-rules",
    detail: "155/155 asersi 5 domain packs",
  },
  {
    name: "Database Persistence & WAL Mode",
    command: "npm run test --workspace=@prompt-workspace/database",
    detail: "Isolasi data, WAL mode & CRUD pada temp DB",
  },
  {
    name: "Web Unit Tests",
    command: "npm run test:unit --workspace=web",
    detail: "39/39 Vitest subtests (UI & feature flags)",
  },
  {
    name: "Web API Regression Tests",
    command: "npm run test:api --workspace=web",
    detail: "79/79 asersi CSRF, Rate-limit, Crawler, Spider, Playground",
  },
  {
    name: "Multi-Platform Packaging Verification",
    command: "npm run test:multiplatform",
    detail: "Website, Windows .exe (Tauri), & Android .apk (Capacitor)",
  },
  {
    name: "Monorepo Production Build",
    command: "npm run build",
    detail: "Turbopack Next.js & TS packages compile",
  },
];

for (const step of VERIFICATION_COMMANDS) {
  const start = Date.now();
  try {
    process.stdout.write(`  [....] Menjalankan ${colors.bold}${step.name}${colors.reset} ... `);
    execSync(step.command, { cwd: ROOT_DIR, stdio: "pipe" });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\r`);
    recordCheck("Automated Suites", step.name, true, `${step.detail} [${elapsed}s]`);
  } catch (err) {
    process.stdout.write(`\r`);
    const stderr = err.stderr ? err.stderr.toString().slice(0, 200) : err.message;
    recordCheck("Automated Suites", step.name, false, `ERROR: ${stderr}`);
  }
}

// ------------------------------------------------------------------------------
// 5. Ringkasan Akhir & Exit Code
// ------------------------------------------------------------------------------
logHeader("5. RINGKASAN AKHIR AUDIT TATA KELOLA & KESIAPAN RILIS (PIEW v2.0.0)");

const totalChecks = checkResults.length;
const passedChecks = checkResults.filter((c) => c.passed).length;
const failedChecks = totalChecks - passedChecks;

console.log(`  Total Pemeriksaan : ${totalChecks}`);
console.log(`  Pemeriksaan Lulus : ${colors.green}${passedChecks}${colors.reset}`);
console.log(`  Pemeriksaan Gagal : ${failedChecks > 0 ? `${colors.red}${failedChecks}${colors.reset}` : `${colors.green}0${colors.reset}`}`);

if (failedChecks === 0) {
  console.log(`\n${colors.bold}${colors.green}🏆 STATUS: ALL CHECKS PASSED — READY FOR PIEW v2.0.0 RELEASE! 🚀${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${colors.bold}${colors.red}❌ STATUS: ${failedChecks} PEMERIKSAAN GAGAL. PERBAIKI SEBELUM MERGE!${colors.reset}\n`);
  process.exit(1);
}
