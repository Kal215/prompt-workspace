#!/usr/bin/env node
/**
 * scripts/verify-multiplatform.mjs
 * -----------------------------------------------------------------------------
 * Validasi Kesiapan Infrastruktur Multi-Platform Packaging PIEW
 * Memverifikasi konfigurasi Website, Desktop Windows (.exe), dan Android (.apk)
 * sesuai tata kelola Zero-Secret Client (Blueprint Bagian 1, 4.1, dan 15.2).
 * -----------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
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

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assertCheck(name, condition, detail = "") {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [${colors.green}✔ PASS${colors.reset}] ${name} ${detail ? `(${detail})` : ""}`);
  } else {
    failedChecks++;
    console.error(`  [${colors.red}✖ FAIL${colors.reset}] ${name} ${detail ? `(${detail})` : ""}`);
  }
}

logHeader("1. AUDIT BERKAS INFRASTRUKTUR MULTI-PLATFORM");

const CAPACITOR_CONFIG_PATH = path.join(ROOT_DIR, "docs/operations/packaging/capacitor.config.json");
const TAURI_CONFIG_PATH = path.join(ROOT_DIR, "docs/operations/packaging/tauri.conf.json");
const GUIDE_PATH = path.join(ROOT_DIR, "docs/operations/MULTI-PLATFORM-BUILD-GUIDE.md");
const ROOT_PACKAGE_PATH = path.join(ROOT_DIR, "package.json");

assertCheck("Capacitor Android Config Exists", fs.existsSync(CAPACITOR_CONFIG_PATH));
assertCheck("Tauri Desktop Config Exists", fs.existsSync(TAURI_CONFIG_PATH));
assertCheck("Multi-Platform Build Guide Exists", fs.existsSync(GUIDE_PATH));

logHeader("2. VALIDASI STRUKTUR KONFIGURASI CAPACITOR (ANDROID .APK)");

let capConfig;
try {
  const raw = fs.readFileSync(CAPACITOR_CONFIG_PATH, "utf-8");
  capConfig = JSON.parse(raw);
  assertCheck("Capacitor Config JSON Valid", true);
} catch (err) {
  assertCheck("Capacitor Config JSON Valid", false, err.message);
  capConfig = {};
}

assertCheck(
  "Capacitor App ID Terdefinisi",
  typeof capConfig.appId === "string" && capConfig.appId.length > 5,
  capConfig.appId
);
assertCheck(
  "Capacitor App Name Terdefinisi",
  typeof capConfig.appName === "string" && capConfig.appName.length > 0,
  capConfig.appName
);
assertCheck(
  "Capacitor Server & Keamanan Android Valid",
  capConfig.server && typeof capConfig.server.url === "string" && capConfig.android && capConfig.android.allowMixedContent === false,
  "allowMixedContent: false, secure server configuration"
);

logHeader("3. VALIDASI STRUKTUR KONFIGURASI TAURI v2 (WINDOWS .EXE)");

let tauriConfig;
try {
  const raw = fs.readFileSync(TAURI_CONFIG_PATH, "utf-8");
  tauriConfig = JSON.parse(raw);
  assertCheck("Tauri Config JSON Valid", true);
} catch (err) {
  assertCheck("Tauri Config JSON Valid", false, err.message);
  tauriConfig = {};
}

assertCheck(
  "Tauri Product Name & Version Valid",
  typeof tauriConfig.productName === "string" && typeof tauriConfig.version === "string",
  `${tauriConfig.productName} v${tauriConfig.version}`
);
assertCheck(
  "Tauri Window Geometry Terkonfigurasi",
  Array.isArray(tauriConfig.app?.windows) && tauriConfig.app.windows.length > 0 && tauriConfig.app.windows[0].width >= 960,
  `width: ${tauriConfig.app?.windows?.[0]?.width}, height: ${tauriConfig.app?.windows?.[0]?.height}`
);
assertCheck(
  "Tauri Content Security Policy (CSP) Aktif",
  typeof tauriConfig.app?.security?.csp === "string" && tauriConfig.app.security.csp.includes("default-src"),
  "Strict CSP enforced"
);
assertCheck(
  "Tauri Bundle Targets Mencakup Windows NSIS (.exe)",
  Array.isArray(tauriConfig.bundle?.targets) && tauriConfig.bundle.targets.includes("nsis"),
  tauriConfig.bundle?.targets?.join(", ")
);

logHeader("4. AUDIT PANDUAN BANGUN (MULTI-PLATFORM-BUILD-GUIDE.md)");

const guideContent = fs.existsSync(GUIDE_PATH) ? fs.readFileSync(GUIDE_PATH, "utf-8") : "";
assertCheck(
  "Panduan Menjelaskan Deployment Website",
  guideContent.includes("Deployment Website Produksi") && guideContent.includes("npm run build")
);
assertCheck(
  "Panduan Menjelaskan Software Desktop Windows (.exe)",
  guideContent.includes("Software Desktop Windows") && guideContent.includes(".exe") && guideContent.includes("Tauri")
);
assertCheck(
  "Panduan Menjelaskan Aplikasi Android Native (.apk)",
  guideContent.includes("Aplikasi HP Android") && guideContent.includes(".apk") && guideContent.includes("Capacitor")
);
assertCheck(
  "Panduan Menegaskan Prinsip Zero-Secret Client (Blueprint 15.2)",
  guideContent.includes("Zero-Secret") && guideContent.includes("Groq")
);

logHeader("5. AUDIT ZERO-SECRET & KEAMANAN KONFIGURASI");

const SECRET_PATTERNS = [
  /gsk_[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /BEGIN (RSA|EC|OPENSSH) PRIVATE KEY/,
  /password\s*[:=]\s*["'][^"']+["']/i,
];

let leakDetected = false;
const filesToScan = [CAPACITOR_CONFIG_PATH, TAURI_CONFIG_PATH];

for (const filePath of filesToScan) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        leakDetected = true;
        console.error(`  [${colors.red}ALERT${colors.reset}] Pola secret ditemukan di: ${filePath}`);
      }
    }
  }
}

assertCheck(
  "Konfigurasi Packaging Bersih dari Secret / API Key Hardcoded",
  !leakDetected,
  "Zero secret found in client configurations"
);

logHeader("6. AUDIT INTEGRASI NPM SCRIPTS (package.json)");

let rootPkg;
try {
  rootPkg = JSON.parse(fs.readFileSync(ROOT_PACKAGE_PATH, "utf-8"));
} catch (err) {
  rootPkg = {};
}

assertCheck(
  "Script 'test:multiplatform' Terpasang di root package.json",
  typeof rootPkg.scripts?.["test:multiplatform"] === "string" &&
    rootPkg.scripts["test:multiplatform"].includes("verify-multiplatform.mjs"),
  rootPkg.scripts?.["test:multiplatform"]
);

logHeader("RINGKASAN VALIDASI MULTI-PLATFORM");
console.log(`Total Pemeriksaan : ${totalChecks}`);
console.log(`Lolos (PASS)      : ${colors.green}${passedChecks}${colors.reset}`);
console.log(`Gagal (FAIL)      : ${failedChecks > 0 ? colors.red : colors.green}${failedChecks}${colors.reset}`);

if (failedChecks > 0) {
  console.error(`\n${colors.red}${colors.bold}❌ VALIDASI MULTI-PLATFORM GAGAL DENGAN ${failedChecks} KESALAHAN!${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}${colors.bold}✔ SELURUH VALIDASI MULTI-PLATFORM LOLOS 100% (EXIT CODE 0)${colors.reset}\n`);
  process.exit(0);
}
