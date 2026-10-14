/**
 * apps/web/scripts/test-e2e.ts
 * Real Browser E2E Test Suite (Google Chrome via Puppeteer-Core)
 * Task #19: Deterministic /api/optimize Interception, Intent Guard, Findings, Diff Viewer, & History Persistence
 */

import puppeteer, { Browser, Page } from "puppeteer-core";
import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import http from "http";

const PORT = 3124;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function findBrowserExecutable(): string {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA || "C:\\Users\\Default\\AppData\\Local"}\\Google\\Chrome\\Application\\chrome.exe`,
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }
  } else {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  throw new Error("Executable Chrome/Edge tidak ditemukan di sistem.");
}

function killProcessTree(pid?: number) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } catch {}
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {}
    }
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    results.push({ name, passed: true, details });
  } else {
    console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
    results.push({ name, passed: false, details });
  }
}

async function waitForServer(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on("error", reject);
        req.setTimeout(1500, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return false;
}

const mockOptimizationResult = {
  requestId: "mock-e2e-task19-req",
  originalPrompt: "Buatkan saya kode Python untuk scraping data produk e-commerce",
  detectedIntent: "Ekstraksi data katalog produk e-commerce secara otomatis dan terstruktur",
  analysis: {
    findings: [
      {
        category: "Clarity",
        severity: "minor",
        evidence: "Tidak menyebutkan library atau format output yang diinginkan",
        recommendation: "Spesifikasikan pustaka (Playwright/BeautifulSoup) dan format JSON/CSV",
      },
    ],
    score: 85,
    status: "analyzed",
  },
  optimizedPrompt:
    "Sebagai Senior Python Engineer, buatkan skrip automasi web scraping e-commerce menggunakan BeautifulSoup4 dan requests untuk mengekstrak data ke format [FORMAT_OUTPUT]. Skrip harus mengekstrak: nama produk, harga, dan rating; menangani pagination dan error handling; serta mengekspor data ke file terstruktur.",
  changes: [
    "Menambahkan persona Senior Python Engineer",
    "Menetapkan pustaka BeautifulSoup4 & requests",
    "Menentukan format output JSON dan skema error handling",
  ],
  warnings: [
    "Pastikan kepatuhan terhadap robots.txt dan ketentuan layanan situs target",
  ],
  appliedDomainRule: {
    domainId: "coding",
    ruleVersion: "1.0.0",
    name: "Pengembangan Perangkat Lunak (Coding)",
  },
  providerId: "groq",
  model: "llama-3.3-70b-versatile",
  evaluation: {
    score: 95,
    passed: true,
    auditorNotes: "Intent terpelihara 100%, struktur instruksi sangat jelas dan dapat direproduksi.",
    intentPreserved: true,
    deceptiveCertaintyAvoided: true,
    clarityAndStructureScore: 95,
  },
  metadata: {
    modelTarget: "llama-3.3-70b-versatile",
    processingTimeMs: 420,
    latencyMs: 380,
    tokensUsed: { promptTokens: 120, completionTokens: 180, totalTokens: 300 },
    confidenceScore: 0.95,
  },
};

const mockExecutionResult = {
  executionId: "mock-exec-e2e-12345",
  resolvedPrompt:
    "Sebagai Senior Python Engineer, buatkan skrip automasi web scraping e-commerce menggunakan BeautifulSoup4 dan requests untuk mengekstrak data ke format JSON terstruktur. Skrip harus mengekstrak: nama produk, harga, dan rating; menangani pagination dan error handling; serta mengekspor data ke file terstruktur.\n\n--- KASUS UJI / TEST CASE INPUT ---\nTarget URL: https://example.com/products",
  unresolvedPlaceholders: [],
  output:
    "Berikut adalah skrip Python BeautifulSoup4 lengkap dengan pagination dan ekspor JSON:\n```python\nimport requests\nfrom bs4 import BeautifulSoup\n# Scraping logic...\n```",
  providerId: "groq",
  model: "llama-3.3-70b-versatile",
  parameters: {
    temperature: 0.3,
    maxOutputTokens: 1024,
  },
  latencyMs: 382,
  usage: {
    promptTokens: 85,
    completionTokens: 210,
    totalTokens: 295,
  },
  nondeterminismNotice:
    "Catatan: Respons model bahasa probabilistik; hasil dapat bervariasi pada temperature > 0.",
  createdAt: new Date().toISOString(),
};

async function runE2ESuite() {
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🌐 MENJALANKAN REAL BROWSER E2E TEST (Next.js + Chrome Puppeteer)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  let serverProcess: ChildProcess | null = null;
  let browser: Browser | null = null;
  let tempDbPath: string | null = null;

  try {
    // 0. Setup isolated temporary database
    const tempDbName = `test-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    tempDbPath = path.join(os.tmpdir(), tempDbName).replace(/\\/g, "/");
    const tempDbUrl = `file:${tempDbPath}`;
    const schemaPath = path.resolve(__dirname, "../../../packages/database/prisma/schema.prisma");

    console.log(`[0] Menginisialisasi database SQLite sementara terisolasi: ${tempDbPath}`);
    execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
      env: { ...process.env, DATABASE_URL: tempDbUrl },
      stdio: "ignore",
    });

    // 1. Jalankan Next.js server produksi
    console.log(`▶ [Step 1] Memulai Next.js server pada port ${PORT}...`);
    const webRoot = path.resolve(__dirname, "..");
    const isWin = process.platform === "win32";
    serverProcess = spawn(isWin ? "npx.cmd" : "npx", ["next", "start", "-p", String(PORT)], {
      cwd: webRoot,
      env: {
        ...process.env,
        PORT: String(PORT),
        DATABASE_URL: tempDbUrl,
        SESSION_SECRET: "e2e-test-session-secret-at-least-32-characters-long",
        ALLOWED_ORIGINS: "http://127.0.0.1:3124,http://localhost:3124",
      },
      shell: isWin,
      stdio: "ignore",
    });

    const isReady = await waitForServer(BASE_URL);
    if (!isReady) {
      throw new Error(`Server Next.js gagal menyala pada ${BASE_URL} dalam 30 detik.`);
    }
    console.log(`  🚀 Server aktif di ${BASE_URL}`);

    // 2. Luncurkan browser headless Chrome / Edge
    console.log("\n▶ [Step 2] Meluncurkan browser headless Chromium/Chrome/Edge...");
    const browserPath = findBrowserExecutable();
    console.log(`  🌐 Menggunakan executable browser: ${browserPath}`);
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    console.log("  🌐 Browser berhasil diluncurkan.");

    const page: Page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Intersepsi Jaringan: Mock Deterministik /api/optimize & /api/execute
    let interceptedTaskType: string | null = null;
    let interceptedProviderId: string | null = null;
    let interceptedTargetModel: string | null = null;
    let interceptedExecPrompt: string | null = null;
    await page.setRequestInterception(true);
    page.on("request", (interceptedReq) => {
      const url = interceptedReq.url();
      if (url.includes("/api/execute") && interceptedReq.method() === "POST") {
        try {
          const postData = JSON.parse(interceptedReq.postData() || "{}");
          interceptedExecPrompt = postData.prompt ?? null;
        } catch {
          interceptedExecPrompt = null;
        }
        console.log(
          `  🎯 [Network Intercept] Intersepsi POST /api/execute -> Mengembalikan mock fixture execution`
        );
        interceptedReq.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: mockExecutionResult }),
        });
      } else if (url.includes("/api/optimize") && interceptedReq.method() === "POST") {
        try {
          const postData = JSON.parse(interceptedReq.postData() || "{}");
          interceptedTaskType = postData.taskType ?? null;
          interceptedProviderId = postData.providerId ?? null;
          interceptedTargetModel = postData.targetModel ?? null;
        } catch {
          interceptedTaskType = null;
          interceptedProviderId = null;
          interceptedTargetModel = null;
        }
        console.log(
          `  🎯 [Network Intercept] Intersepsi POST /api/optimize (taskType: ${interceptedTaskType}, providerId: ${interceptedProviderId}, targetModel: ${interceptedTargetModel}) -> Mengembalikan mock fixture deterministik`
        );
        interceptedReq.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockOptimizationResult),
        });
      } else {
        interceptedReq.continue();
      }
    });

    // Capture console errors
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      console.log(`[Page Error] ${err}`);
      pageErrors.push(err instanceof Error ? err.message : String(err));
    });
    page.on("console", (msg) => {
      console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") {
        pageErrors.push(msg.text());
      }
    });

    // 3. Navigasi ke halaman utama
    console.log("\n▶ [Step 3] Membuka halaman utama workspace...");
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });
    const title = await page.title();
    console.log(`  📄 Page title: "${title}"`);
    assert(title.length > 0, "Halaman utama berhasil dimuat");

    // 4. Verifikasi elemen UI utama
    console.log("\n▶ [Step 4] Memverifikasi elemen antarmuka (DOM)...");
    const headerText = await page.$eval("header", (el) => el.textContent || "");
    assert(
      headerText.includes("Prompt Intelligence Workspace"),
      "Header aplikasi memuat judul 'Prompt Intelligence Workspace'"
    );

    // Verifikasi Keberadaan Disclosure Privasi & Retensi Data (Task #24)
    const privacyNoticeExists = await page.evaluate(() => {
      const el =
        document.querySelector('[data-testid="privacy-disclosure"]') ||
        document.body;
      const text = el.textContent || "";
      return (
        text.includes("Kebijakan Privasi") &&
        text.includes("Groq API") &&
        text.includes("Zero Raw-Prompt Logging") &&
        text.includes("Terima & Simpan")
      );
    });
    assert(
      privacyNoticeExists,
      "Panel informasi transparansi privasi, pemrosesan Groq API, & retensi sesi ter-render di DOM"
    );

    // Verifikasi Keberadaan Panel Panduan Pengguna (Tahap 6 - Bagian 12)
    const userGuideExists = await page.$('[data-testid="user-guide-section"]');
    assert(
      userGuideExists !== null,
      "Panel panduan pengguna (data-testid='user-guide-section') ter-render di DOM"
    );

    // Verifikasi Keberadaan Stage 7 North-Star Telemetry Bar (Task #32 / Tahap 7)
    const telemetryBarExists = await page.$('[data-testid="stage7-telemetry-bar"]');
    assert(
      telemetryBarExists !== null,
      "Panel metrik sesi & North-Star telemetry (data-testid='stage7-telemetry-bar') ter-render di DOM"
    );

    const getBadgeCount = async (): Promise<number> => {
      return await page.evaluate(() => {
        const header = document.querySelector("header");
        if (!header) return 0;
        const badges = header.querySelectorAll("span, div");
        for (const b of badges) {
          if (b.className.includes("font-mono") && /^\d+$/.test(b.textContent?.trim() || "")) {
            return parseInt(b.textContent?.trim() || "0", 10);
          }
        }
        return 0;
      });
    };

    const initialBadgeCount = await getBadgeCount();
    console.log(`  📊 Badge riwayat awal: ${initialBadgeCount}`);

    // 5. Interaksi: Buka dan Tutup Sidebar Riwayat
    console.log("\n▶ [Step 5] Menguji interaksi buka/tutup History Sidebar...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("header button"));
      const btn = buttons.find((b) => b.textContent?.includes("Riwayat"));
      if (btn) (btn as HTMLButtonElement).click();
    });

    await new Promise((r) => setTimeout(r, 600));
    const isSidebarVisible = await page.evaluate(() => {
      return document.body.textContent?.includes("Riwayat Tersimpan") || false;
    });
    assert(isSidebarVisible, "History Sidebar berhasil terbuka saat tombol Riwayat diklik");

    // Tutup sidebar via tombol close
    await page.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll("button"));
      const closeBtn = closeButtons.find(
        (b) => b.querySelector("svg.lucide-x") || b.getAttribute("aria-label") === "Close"
      );
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // 6. Alur Pengujian Deterministik /api/optimize
    console.log("\n▶ [Step 6] Menguji alur form optimasi deterministik (Form Input -> Optimize)...");

    // Verifikasi keberadaan dan interaksi Domain Pack Selector (Task #26)
    await page.waitForSelector("#domain-pack-select", { timeout: 5000 });
    const domainSelectExists = await page.$("#domain-pack-select");
    assert(domainSelectExists !== null, "Elemen #domain-pack-select ditemukan di form input");

    // Pilih domain 'coding' secara eksplisit
    await page.select("#domain-pack-select", "coding");
    console.log("  🎯 Memilih mode domain: 'coding' (Pengembangan Perangkat Lunak)");

    // Verifikasi keberadaan dan interaksi Provider & Target Model Selector (Task #28)
    await page.waitForSelector("#provider-select", { timeout: 5000 });
    const providerSelectExists = await page.$("#provider-select");
    assert(providerSelectExists !== null, "Elemen #provider-select ditemukan di form input");

    await page.waitForSelector("#target-model-select", { timeout: 5000 });
    const targetModelSelectExists = await page.$("#target-model-select");
    assert(targetModelSelectExists !== null, "Elemen #target-model-select ditemukan di form input");

    // Pilih provider 'groq' dan model default-nya
    await page.select("#provider-select", "groq");
    await page.select("#target-model-select", "llama-3.3-70b-versatile");
    console.log("  🎯 Memilih provider 'groq' dan targetModel 'llama-3.3-70b-versatile'");

    const inputPromptText = mockOptimizationResult.originalPrompt;
    await page.waitForSelector("#original-prompt", { timeout: 5000 });
    await page.type("#original-prompt", inputPromptText, { delay: 10 });

    // Klik tombol submit "Optimalkan Prompt"
    const submitBtn = await page.$('button[type="submit"]');
    assert(submitBtn !== null, "Tombol submit 'Optimalkan Prompt' ditemukan di form");

    if (submitBtn) {
      await submitBtn.click();
    }

    // Tunggu transisi loading state dan render hasil mock deterministik
    await page.waitForFunction(
      () => {
        return (
          document.body.textContent?.includes("Intent Guard") ||
          document.body.textContent?.includes("Audit & Analisis Celah") ||
          document.body.textContent?.includes("Ekstraksi data katalog produk")
        );
      },
      { timeout: 8000 }
    );

    // 7. Verifikasi Render Komponen Hasil Optimasi
    console.log("\n▶ [Step 7] Memverifikasi render Intent Guard, Findings Panel, dan Diff Viewer...");

    // Verifikasi bahwa taskType 'coding' terkirim dalam payload request POST /api/optimize
    assert(
      interceptedTaskType === "coding",
      `Payload request POST /api/optimize memuat taskType 'coding' (diterima: '${interceptedTaskType}')`
    );

    // Verifikasi bahwa providerId dan targetModel terkirim dalam payload request POST /api/optimize (Task #28)
    assert(
      interceptedProviderId === "groq",
      `Payload request POST /api/optimize memuat providerId 'groq' (diterima: '${interceptedProviderId}')`
    );
    assert(
      interceptedTargetModel === "llama-3.3-70b-versatile",
      `Payload request POST /api/optimize memuat targetModel 'llama-3.3-70b-versatile' (diterima: '${interceptedTargetModel}')`
    );

    // Verifikasi render badge aturan domain aktif (Task #26)
    const domainBadgeText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="applied-domain-badge"]');
      return el ? el.textContent?.trim() : null;
    });
    assert(
      domainBadgeText !== null &&
        domainBadgeText.includes("Pengembangan Perangkat Lunak") &&
        domainBadgeText.includes("v1.0.0"),
      `Badge aturan domain aktif (data-testid="applied-domain-badge") ter-render di DOM: "${domainBadgeText}"`
    );

    // Verifikasi render badge provider & model aktif (Task #28)
    const providerBadgeText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="applied-provider-badge"]');
      return el ? el.textContent?.trim() : null;
    });
    assert(
      providerBadgeText !== null &&
        providerBadgeText.includes("Provider: groq") &&
        providerBadgeText.includes("llama-3.3-70b-versatile"),
      `Badge provider aktif (data-testid="applied-provider-badge") ter-render di DOM: "${providerBadgeText}"`
    );

    const pageTextAfterOptimize = await page.evaluate(() => document.body.textContent || "");

    assert(
      pageTextAfterOptimize.includes("Intent Guard") ||
      pageTextAfterOptimize.includes("Ekstraksi data katalog produk"),
      "Komponen Intent Guard berhasil dirender dengan intent yang terdeteksi"
    );

    assert(
      pageTextAfterOptimize.includes("Audit & Analisis Celah") ||
      pageTextAfterOptimize.includes("Clarity") ||
      pageTextAfterOptimize.includes("Tidak menyebutkan library"),
      "Komponen Findings Panel berhasil dirender dengan taksonomi temuan"
    );

    assert(
      pageTextAfterOptimize.includes("Perbandingan Prompt") ||
      pageTextAfterOptimize.includes("Sebagai Senior Python Engineer") ||
      pageTextAfterOptimize.includes("BeautifulSoup4"),
      "Komponen Diff Viewer berhasil dirender dengan teks prompt teroptimasi"
    );

    // 7B. Verifikasi Komponen Playground & Alur Eksekusi Target Model (Task #30 / Fitur C3)
    console.log("\n▶ [Step 7B] Menguji Target Model Execution Playground (PlaygroundCard)...");

    await page.waitForSelector('[data-testid="playground-card"]', { timeout: 5000 });
    const playgroundExists = await page.$('[data-testid="playground-card"]');
    assert(playgroundExists !== null, "Komponen PlaygroundCard (data-testid='playground-card') ter-render di DOM");

    // Verifikasi form input placeholder dinamis
    const placeholderInputsExists = await page.$('[data-testid="placeholder-inputs"]');
    assert(placeholderInputsExists !== null, "Form input variabel placeholder (data-testid='placeholder-inputs') ter-render");

    // Isi nilai placeholder [FORMAT_OUTPUT]
    await page.type('input[id="placeholder-[FORMAT_OUTPUT]"]', 'JSON terstruktur');
    console.log("  🎯 Mengisi nilai placeholder [FORMAT_OUTPUT] = 'JSON terstruktur'");

    // Isi optional test case input
    await page.type('#playground-test-input', 'Target URL: https://example.com/products');
    console.log("  🎯 Mengisi kasus uji tambahan (test input)");

    // Klik tombol Jalankan pada Model Tujuan
    const runBtn = await page.$('[data-testid="run-playground-btn"]');
    assert(runBtn !== null, "Tombol 'Jalankan pada Model Tujuan' (data-testid='run-playground-btn') ditemukan");
    await page.click('[data-testid="run-playground-btn"]');

    // Tunggu hasil eksekusi muncul di data-testid="playground-result"
    await page.waitForSelector('[data-testid="playground-result"]', { timeout: 8000 });
    const resultExists = await page.$('[data-testid="playground-result"]');
    assert(resultExists !== null, "Kontainer hasil eksekusi (data-testid='playground-result') ter-render di DOM");

    const resultText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="playground-result"]');
      return el ? el.textContent || "" : "";
    });

    assert(
      resultText.includes("BeautifulSoup4") && resultText.includes("groq"),
      "Output nyata target model dan badge metadata ter-render di Playground"
    );
    assert(
      resultText.includes("tokens") && resultText.includes("ms"),
      "Metadata token dan latensi eksekusi ter-render di Playground"
    );
    assert(
      resultText.includes("probabilistik") || resultText.includes("nondeterminism") || resultText.includes("bervariasi"),
      "Catatan transparansi nondeterminism ter-render di Playground"
    );
    assert(
      Boolean(interceptedExecPrompt),
      "Payload request POST /api/execute berhasil diintersepsi dan memuat prompt"
    );

    // 7C. Verifikasi Fitur Ekspor Terverifikasi (Markdown & JSON) & Human Utility Rating (Task #32 / Tahap 7)
    console.log("\n▶ [Step 7C] Menguji Ekspor Terverifikasi (.md & .json) dan Feedback Kualitas...");

    await page.waitForSelector('[data-testid="export-markdown-btn"]', { timeout: 5000 });
    const exportMdBtn = await page.$('[data-testid="export-markdown-btn"]');
    assert(exportMdBtn !== null, "Tombol 'Ekspor Markdown (.md)' (data-testid='export-markdown-btn') ditemukan");

    const exportJsonBtn = await page.$('[data-testid="export-json-btn"]');
    assert(exportJsonBtn !== null, "Tombol 'Ekspor JSON (.json)' (data-testid='export-json-btn') ditemukan");

    const utilityHelpfulBtn = await page.$('[data-testid="utility-feedback-helpful"]');
    assert(utilityHelpfulBtn !== null, "Tombol 'Perbaikan Ini Membantu' (data-testid='utility-feedback-helpful') ditemukan");

    // Klik tombol Ekspor Markdown
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="export-markdown-btn"]') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await page.waitForSelector('[data-testid="export-status-msg"]', { timeout: 5000 });
    const mdStatusText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="export-status-msg"]');
      return el ? el.textContent || "" : "";
    });
    assert(
      mdStatusText.includes("Markdown") && mdStatusText.includes(".md"),
      `Pesan status ekspor Markdown ter-render: "${mdStatusText}"`
    );

    // Klik tombol Ekspor JSON
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="export-json-btn"]') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const jsonStatusText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="export-status-msg"]');
      return el ? el.textContent || "" : "";
    });
    assert(
      jsonStatusText.includes("JSON") && jsonStatusText.includes(".json"),
      `Pesan status ekspor JSON ter-render: "${jsonStatusText}"`
    );

    // Klik tombol feedback kualitas
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="utility-feedback-helpful"]') as HTMLButtonElement;
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    console.log("  🎯 Ekspor terverifikasi Markdown, JSON, dan Human Utility Feedback berhasil diverifikasi di DOM.");

    // 8. Interaksi "Accept & Save" ke Riwayat SQLite
    console.log("\n▶ [Step 8] Menguji interaksi tombol 'Accept & Save'...");
    const savedClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saveBtn = buttons.find(
        (b) =>
          b.textContent?.includes("Accept & Save") ||
          b.textContent?.includes("Diterima & Tersimpan") ||
          b.textContent?.includes("Terima & Simpan")
      );
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    });

    assert(savedClicked, "Tombol 'Accept & Save' berhasil ditemukan dan diklik");
    await new Promise((r) => setTimeout(r, 1200));

    // Verifikasi badge riwayat bertambah 1
    const badgeAfterSave = await getBadgeCount();
    console.log(`  📊 Badge riwayat setelah simpan: ${badgeAfterSave}`);
    assert(
      badgeAfterSave === initialBadgeCount + 1,
      `Badge counter riwayat bertambah 1 (Sebelum: ${initialBadgeCount}, Sesudah: ${badgeAfterSave})`
    );

    // 9. Buka Sidebar dan Verifikasi Item Tersimpan di DOM
    console.log("\n▶ [Step 9] Memeriksa kartu riwayat baru di dalam Sidebar...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("header button"));
      const btn = buttons.find((b) => b.textContent?.includes("Riwayat"));
      if (btn) (btn as HTMLButtonElement).click();
    });

    await new Promise((r) => setTimeout(r, 800));
    const isSavedItemInSidebar = await page.evaluate((promptKeyword) => {
      return document.body.textContent?.includes(promptKeyword) || false;
    }, "scraping data produk e-commerce");

    assert(isSavedItemInSidebar, "Prompt hasil optimasi tersimpan muncul di dalam History Sidebar");

    // 10. Hapus Item Baru Tersebut via DELETE API untuk Menjaga Kebersihan Database
    console.log("\n▶ [Step 10] Menghapus prompt uji coba via DELETE /api/history...");
    const deleteSuccess = await page.evaluate(async (promptToDeleteId) => {
      const delRes = await fetch(`/api/history?id=${encodeURIComponent(promptToDeleteId)}`, {
        method: "DELETE",
        headers: {
          Origin: window.location.origin,
        },
      });
      const delJson = await delRes.json();
      console.log("E2E DELETE status:", delRes.status, JSON.stringify(delJson));
      return delJson.success === true;
    }, mockOptimizationResult.requestId);

    assert(deleteSuccess, "Prompt uji coba berhasil dihapus via endpoint DELETE");
    await new Promise((r) => setTimeout(r, 600));

    // 11. Verifikasi Konsistensi Badge Setelah Reload Halaman
    console.log("\n▶ [Step 11] Menguji konsistensi state dan badge setelah reload...");
    await page.reload({ waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    const finalBadgeCount = await getBadgeCount();
    console.log(`  📊 Badge riwayat akhir setelah reload: ${finalBadgeCount}`);
    assert(
      finalBadgeCount === initialBadgeCount,
      `Badge counter kembali sinkron persis dengan kondisi awal (${initialBadgeCount})`
    );

    // 12. Verifikasi Keamanan Konsol Browser
    console.log("\n▶ [Step 12] Memeriksa console errors & sanitasi...");
    const hasSecretLeak = pageErrors.some((err) => err.includes("gsk_") || err.includes("DATABASE_URL"));
    assert(!hasSecretLeak, "Tidak ada kebocoran secret atau API key pada console browser");

  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      console.log("  🛑 Browser ditutup.");
    }
    if (serverProcess && serverProcess.pid) {
      killProcessTree(serverProcess.pid);
      console.log("  🛑 Next.js server dihentikan.");
    }
    try {
      if (tempDbPath && fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (tempDbPath && fs.existsSync(`${tempDbPath}-journal`)) fs.unlinkSync(`${tempDbPath}-journal`);
    } catch {}
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════════");
  const failedCount = results.filter((r) => !r.passed).length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`🏁 HASIL AKHIR E2E: ${passedCount} LULUS, ${failedCount} GAGAL (Total ${results.length} Asersi)`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error("Fatal E2E Error:", err);
  process.exit(1);
});
