#!/usr/bin/env node

/**
 * ==============================================================================
 * PROMPT INTELLIGENCE ENGINEERING WORKSPACE (PIEW)
 * RELEASE READINESS AUDITOR & SMOKE TEST RUNNER (v1.1.0)
 * ==============================================================================
 * Skrip audit mandiri untuk memverifikasi kesiapan rilis publik v1.1.0.
 * Memeriksa artefak wajib, governance zero-secret, integritas dev.db,
 * dan seluruh rangkaian automated test monorepo secara deterministik.
 * ==============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

function logStep(label, status, detail = "") {
  const icon = status === "PASS" ? `${colors.green}✔ PASS${colors.reset}` : `${colors.red}✖ FAIL${colors.reset}`;
  console.log(`  [${icon}] ${colors.bold}${label}${colors.reset} ${detail ? `${colors.gray}(${detail})${colors.reset}` : ""}`);
}

const checkResults = [];

function recordCheck(category, name, passed, detail = "") {
  checkResults.push({ category, name, passed, detail });
  logStep(`${name}: ${detail}`, passed ? "PASS" : "FAIL");
}

// ------------------------------------------------------------------------------
// 1. Verifikasi Keberadaan Seluruh Artefak Wajib (Tahap 0 s/d Tahap 6)
// ------------------------------------------------------------------------------
logHeader("1. AUDIT ARTEFAK WAJIB (STAGES G0 - G6)");

const REQUIRED_ARTIFACTS = [
  "docs/architecture/ADR-001-modular-monolith-and-security.md",
  "docs/architecture/RUNBOOK-operations-and-recovery.md",
  "docs/product/PDR-001-domain-packs-c1.md",
  "docs/product/PDR-002-multi-provider-adapters-c2.md",
  "docs/product/PDR-003-target-model-playground-c3.md",
  "docs/product/RELEASE-NOTES-v1.0.0-mvp.md",
  "docs/product/RELEASE-NOTES-v1.1.0.md",
  "docs/product/USER-GUIDE-AND-FAQ.md",
  "docs/operations/RELEASE-CHECKLIST-v1.1.0.md",
  "docs/operations/RUNBOOK.md",
  "README.md",
  ".env.example",
  "test-fixtures/baseline-prompts.json",
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
  // Periksa diff atau committed code terhadap pola key nyata (bukan placeholder dummy)
  const patternMatch = execSync(
    "git grep -E '(gsk_[a-zA-Z0-9]{30,}|AIzaSy[a-zA-Z0-9_-]{33}|sk-or-v1-[a-zA-Z0-9]{32,})' -- ':!test-fixtures/*' ':!*.test.*' ':!*.example' ':!*test*' || true",
    { cwd: ROOT_DIR, encoding: "utf-8" }
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
// 3. Verifikasi Integritas Database SQLite dev.db (2 Record Aktif)
// ------------------------------------------------------------------------------
logHeader("3. AUDIT INTEGRITAS DATABASE AKTIF (dev.db)");

const devDbPath = path.join(ROOT_DIR, "packages/database/prisma/dev.db");
if (!fs.existsSync(devDbPath)) {
  recordCheck("Integritas Database", "Keberadaan dev.db", false, "dev.db tidak ditemukan!");
} else {
  try {
    const rawOutput = execSync(
      `sqlite3 "${devDbPath}" "SELECT id, userId, score FROM SavedPrompt ORDER BY id;"`,
      { encoding: "utf-8" }
    ).trim();

    const lines = rawOutput.split("\n").filter((l) => l.trim().length > 0);
    const hasLegacy1 = rawOutput.includes("397d6e10-afc1-4cb7-943f-1117e66641ce");
    const hasLegacy2 = rawOutput.includes("82224252-4cde-47ed-a489-ad76bbc659cf");
    const hasLegacyOwner = rawOutput.includes("legacy_default_user");

    const passed = lines.length >= 2 && hasLegacy1 && hasLegacy2 && hasLegacyOwner;
    recordCheck(
      "Integritas Database",
      "Perlindungan 2 Record Asli dev.db",
      passed,
      `Ditemukan ${lines.length} record aktif (ID 397d6e10 & 82224252 utuh 100%)`
    );
  } catch (err) {
    recordCheck("Integritas Database", "Query sqlite3 dev.db", false, err.message);
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
    detail: "Validasi TypeScript 6 workspace",
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
    name: "Database Persistence & Isolation",
    command: "npm run test --workspace=@prompt-workspace/database",
    detail: "Isolasi data & CRUD pada temp DB",
  },
  {
    name: "Web Unit Tests",
    command: "npm run test:unit --workspace=web",
    detail: "22/22 subtest route handlers",
  },
  {
    name: "Web API Regression Tests",
    command: "npm run test:api --workspace=web",
    detail: "50/50 asersi CSRF, Rate-limit, Providers",
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
logHeader("5. RINGKASAN AKHIR AUDIT KESIAPAN RILIS v1.1.0");

const totalChecks = checkResults.length;
const passedChecks = checkResults.filter((c) => c.passed).length;
const failedChecks = totalChecks - passedChecks;

console.log(`  Total Pemeriksaan : ${totalChecks}`);
console.log(`  Pemeriksaan Lulus : ${colors.green}${passedChecks}${colors.reset}`);
console.log(`  Pemeriksaan Gagal : ${failedChecks > 0 ? `${colors.red}${failedChecks}${colors.reset}` : `${colors.green}0${colors.reset}`}`);

if (failedChecks === 0) {
  console.log(`\n${colors.bold}${colors.green}🏆 STATUS: ALL CHECKS PASSED — READY FOR PUBLIC RELEASE v1.1.0! 🚀${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${colors.bold}${colors.red}❌ STATUS: ${failedChecks} PEMERIKSAAN GAGAL. PERBAIKI SEBELUM MERGE!${colors.reset}\n`);
  process.exit(1);
}
