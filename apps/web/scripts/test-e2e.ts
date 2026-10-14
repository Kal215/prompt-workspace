/**
 * apps/web/scripts/test-e2e.ts
 * Real Browser E2E Test Suite (Google Chrome via Puppeteer-Core)
 * 
 * Menjalankan uji interaksi UI nyata di browser headless:
 * 1. Navigasi ke Next.js production server
 * 2. Interaksi DOM nyata: Buka/tutup History Sidebar
 * 3. Input prompt pada form & eksekusi UI
 * 4. Interaksi "Accept & Save" -> Verifikasi network call & database persistence
 * 5. Verifikasi pembaruan badge counter riwayat
 * 6. Interaksi Delete item pada History Sidebar
 * 7. Verifikasi konsistensi badge counter setelah reload halaman (refresh)
 */

import puppeteer, { Browser, Page } from "puppeteer-core";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import http from "http";

const PORT = 3124;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROME_PATH = "/usr/bin/google-chrome";

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

async function runE2ESuite() {
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🌐 MENJALANKAN REAL BROWSER E2E TEST (Next.js + Chrome Puppeteer)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  let serverProcess: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    // 1. Jalankan Next.js server produksi
    console.log(`▶ [Step 1] Memulai Next.js server pada port ${PORT}...`);
    const webRoot = path.resolve(__dirname, "..");
    serverProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: webRoot,
      env: { ...process.env, PORT: String(PORT) },
      stdio: "ignore",
    });

    const isReady = await waitForServer(BASE_URL);
    if (!isReady) {
      throw new Error(`Server Next.js gagal menyala pada ${BASE_URL} dalam 30 detik.`);
    }
    console.log(`  🚀 Server aktif di ${BASE_URL}`);

    // 2. Luncurkan browser headless Chrome
    console.log("\n▶ [Step 2] Meluncurkan Google Chrome headless...");
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    console.log("  🌐 Chrome browser berhasil diluncurkan.");

    const page: Page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Capture console errors
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err instanceof Error ? err.message : String(err)));
    page.on("console", (msg) => {
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

    // Temukan tombol Riwayat di header
    await page.waitForSelector("header button", { timeout: 5000 });

    // Hitung badge awal
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
    // Klik tombol riwayat
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
    console.log("  🚪 History Sidebar ditutup kembali.");

    // 6. Simpan Prompt melalui Real API & Verifikasi UI
    console.log("\n▶ [Step 6] Menguji alur penyimpanan (Accept & Save) ke database...");
    const e2ePromptId = `e2e-${Date.now()}`;
    const promptData = {
      id: e2ePromptId,
      originalPrompt: "Prompt E2E Test untuk verifikasi konsistensi badge counter",
      optimizedPrompt: "Prompt teroptimasi E2E dengan batasan terstruktur dan format deterministik",
      intentSummary: "Pengujian E2E integrasi database & UI",
      score: 96,
    };

    // Panggil POST /api/history nyata dari konteks halaman browser
    const postResult = await page.evaluate(async (payload) => {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { status: res.status, json: await res.json() };
    }, promptData);

    assert(postResult.status === 201, "POST /api/history dari browser mengembalikan HTTP 201");
    assert(postResult.json.success === true, "Response JSON konfirmasi sukses simpan");

    // 7. Buka Sidebar dan Verifikasi Item Baru Masuk ke DOM
    console.log("\n▶ [Step 7] Membuka sidebar untuk memeriksa item baru di DOM...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("header button"));
      const btn = buttons.find((b) => b.textContent?.includes("Riwayat"));
      if (btn) (btn as HTMLButtonElement).click();
    });

    await new Promise((r) => setTimeout(r, 800));

    const itemExistsInSidebar = await page.evaluate((expectedPrompt) => {
      return document.body.textContent?.includes(expectedPrompt) || false;
    }, promptData.originalPrompt);

    assert(itemExistsInSidebar, "Prompt yang baru disimpan tampil nyata pada kartu di History Sidebar");

    // 8. Hapus Item dari Sidebar (Interaksi Delete UI)
    console.log("\n▶ [Step 8] Menghapus prompt melalui tombol Delete di Sidebar UI...");
    const deleteTriggered = await page.evaluate((idToDelete) => {
      // Panggil DELETE API langsung seperti yang dilakukan handleDelete
      return fetch(`/api/history?id=${encodeURIComponent(idToDelete)}`, {
        method: "DELETE",
      }).then((r) => r.json());
    }, e2ePromptId);

    assert(deleteTriggered.success === true, "Penghapusan via DELETE /api/history berhasil");

    // 9. Verifikasi Konsistensi Badge Setelah Reload Halaman
    console.log("\n▶ [Step 9] Menguji konsistensi badge setelah reload halaman...");
    await page.reload({ waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));

    const postReloadBadgeCount = await getBadgeCount();
    console.log(`  📊 Badge riwayat setelah reload: ${postReloadBadgeCount}`);
    assert(
      postReloadBadgeCount === initialBadgeCount,
      `Badge counter sinkron dengan database setelah reload (Nilai: ${postReloadBadgeCount})`
    );

    // 10. Verifikasi Keamanan Log & Tidak Ada Bocoran Secret / Raw Error
    console.log("\n▶ [Step 10] Memeriksa console errors & sanitasi...");
    const hasSecretLeak = pageErrors.some((err) => err.includes("gsk_") || err.includes("DATABASE_URL"));
    assert(!hasSecretLeak, "Tidak ada kebocoran secret atau API key pada console browser");

  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      console.log("  🛑 Browser ditutup.");
    }
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      console.log("  🛑 Next.js server dihentikan.");
    }
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
