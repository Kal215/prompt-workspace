import {
  savePrompt,
  getHistory,
  getPromptById,
  deletePrompt,
  savePromptVersion,
  getPromptVersions,
  getPromptVersionById,
  saveSpiderRun,
  getSpiderRuns,
  getSpiderRunById,
  saveCrawlerSource,
  getCrawlerSource,
  enableSqliteWal,
  MAX_PROMPT_VERSIONS_PER_PROMPT,
  MAX_SPIDER_RUNS_PER_VERSION,
  prisma,
  setDatabaseUrl,
} from "../src/index.js";
import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🗄️  TEST PERSISTENCE: PRISMA & SQLITE v1.0 & v2.0 (packages/database)");
  console.log("═══════════════════════════════════════════════════════════════════");

  // 0. Setup isolated temporary database
  const tempDbName = `test-db-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const tempDbPath = path.join(os.tmpdir(), tempDbName).replace(/\\/g, "/");
  const tempDbUrl = `file:${tempDbPath}`;
  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

  console.log(`[0] Menginisialisasi database SQLite sementara terisolasi: ${tempDbPath}`);
  execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
    env: { ...process.env, DATABASE_URL: tempDbUrl },
    stdio: "ignore",
  });
  setDatabaseUrl(tempDbUrl);

  try {
    // 0b. Test SQLite WAL initialization
    console.log("[0b] Menguji inisialisasi SQLite WAL mode...");
    await enableSqliteWal();
    const journalModeResult = await prisma.$queryRaw<Array<{ journal_mode: string }>>`PRAGMA journal_mode;`;
    console.log(`✅ SQLite journal mode: ${journalModeResult[0]?.journal_mode}`);

    const samplePrompt = {
      userId: "test-user-alpha",
      originalPrompt: "Bantu saya riset pasar dan kasih kesimpulan apakah bisnis ini akan sukses.",
      optimizedPrompt: "Role: Market Research Analyst...\nObjective: Menyusun analisis riset pasar komprehensif...",
      intentSummary: "Riset awal untuk memahami pelanggan, kompetitor, harga, dan risiko bisnis.",
      score: 95,
    };

    console.log("\n[1] Menjalankan savePrompt() dengan userId...");
    const saved = await savePrompt(samplePrompt);
    console.log("✅ Berhasil menyimpan prompt:", {
      id: saved.id,
      userId: saved.userId,
      originalPromptSnippet: saved.originalPrompt.substring(0, 40) + "...",
      score: saved.score,
      createdAt: saved.createdAt.toISOString(),
    });

    console.log("\n[2] Menjalankan getHistory() isolasi pengguna...");
    const historyAlpha = await getHistory(5, "test-user-alpha");
    const historyBeta = await getHistory(5, "test-user-beta");
    console.log(`✅ User Alpha melihat ${historyAlpha.length} riwayat (termasuk legacy).`);
    console.log(`✅ User Beta melihat ${historyBeta.length} riwayat (tanpa data User Alpha).`);

    const betaSeesAlpha = historyBeta.some((item) => item.id === saved.id);
    if (betaSeesAlpha) {
      throw new Error("ISOLATION_FAILURE: User Beta melihat record milik User Alpha!");
    }
    console.log("✅ Konfirmasi isolasi data antar pengguna terverifikasi.");

    console.log("\n[3] Menjalankan getPromptById()...");
    const fetched = await getPromptById(saved.id);
    if (!fetched || fetched.id !== saved.id) {
      throw new Error(`getPromptById gagal menemukan ID: ${saved.id}`);
    }
    console.log(`✅ getPromptById berhasil mengambil record [ID: ${fetched.id.slice(0, 8)}...]`);

    console.log("\n[4] Menguji proteksi otorisasi deletePrompt() lintas pengguna...");
    try {
      await deletePrompt(saved.id, "test-user-beta");
      throw new Error("SECURITY_FAILURE: User Beta berhasil menghapus record milik User Alpha!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "FORBIDDEN") {
        throw err;
      }
      console.log("✅ Penghapusan lintas pengguna berhasil diblokir dengan FORBIDDEN.");
    }

    console.log("\n[5] Menguji perlindungan data legacy (legacy_default_user)...");
    const legacyPrompt = await savePrompt({
      userId: "legacy_default_user",
      originalPrompt: "Prompt legacy historis",
      optimizedPrompt: "Prompt optimasi legacy",
      score: 85,
    });
    try {
      // User biasa (test-user-alpha) mencoba menghapus data legacy
      await deletePrompt(legacyPrompt.id, "test-user-alpha");
      throw new Error("SECURITY_FAILURE: User biasa berhasil menghapus record legacy!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "FORBIDDEN") {
        throw err;
      }
      console.log("✅ Penghapusan data legacy oleh user biasa berhasil diblokir dengan FORBIDDEN.");
    }

    // Pemilik sah legacy menghapus record uji
    await deletePrompt(legacyPrompt.id, "legacy_default_user");
    console.log("✅ Record legacy berhasil dihapus oleh 'legacy_default_user'.");

    // ─────────────────────────────────────────────────────────────────────────
    // v2.0 Extended Features Testing
    // ─────────────────────────────────────────────────────────────────────────

    console.log("\n[6] Menguji savePromptVersion() dan auto version numbering...");
    const v1 = await savePromptVersion({
      savedPromptId: saved.id,
      promptText: "Versi 1: Baseline Prompt",
      score: 88,
      changesSummary: "Inisialisasi versi 1",
    });
    if (v1.versionNumber !== 1) {
      throw new Error(`Ekspektasi versionNumber 1, didapat: ${v1.versionNumber}`);
    }
    console.log(`✅ Version 1 dibuat: [versionNumber: ${v1.versionNumber}, score: ${v1.score}]`);

    const v2 = await savePromptVersion({
      savedPromptId: saved.id,
      promptText: "Versi 2: Perbaikan batasan keamanan",
      score: 96,
      changesSummary: "Menambahkan aturan no jailbreak",
      parentVersionId: v1.id,
    });
    if (v2.versionNumber !== 2) {
      throw new Error(`Ekspektasi versionNumber 2, didapat: ${v2.versionNumber}`);
    }
    console.log(`✅ Version 2 dibuat: [versionNumber: ${v2.versionNumber}, score: ${v2.score}]`);

    const versions = await getPromptVersions(saved.id);
    if (versions.length !== 2) {
      throw new Error(`Ekspektasi 2 versions, didapat: ${versions.length}`);
    }
    console.log(`✅ getPromptVersions berhasil mengembalikan ${versions.length} versi prompt.`);

    console.log("\n[7] Menguji saveSpiderRun() dengan nested testResults batch...");
    const spiderRun = await saveSpiderRun({
      promptVersionId: v2.id,
      targetProvider: "groq",
      targetModel: "llama-3.3-70b-versatile",
      status: "COMPLETED",
      totalCases: 2,
      passedCases: 2,
      averageScore: 95.5,
      averageLatencyMs: 420,
      testResults: [
        {
          caseIndex: 0,
          testInput: "Uji Happy Path Analisis",
          expectedOutput: "Riset komprehensif",
          actualOutput: "Analisis riset pasar terstruktur...",
          score: 96,
          latencyMs: 410,
          status: "PASSED",
        },
        {
          caseIndex: 1,
          testInput: "Uji Adversarial Injection",
          expectedOutput: "Penolakan sopan",
          actualOutput: "Saya tidak dapat mengeksekusi instruksi ini...",
          score: 95,
          latencyMs: 430,
          status: "PASSED",
        },
      ],
    });
    console.log(`✅ SpiderRun dibuat: [ID: ${spiderRun.id.slice(0, 8)}..., results: ${spiderRun.testResults?.length}]`);

    const fetchedSpiderRun = await getSpiderRunById(spiderRun.id);
    if (!fetchedSpiderRun || fetchedSpiderRun.testResults.length !== 2) {
      throw new Error(`Gagal fetch spider run by ID dengan testResults!`);
    }
    console.log(`✅ getSpiderRunById berhasil memverifikasi ${fetchedSpiderRun.testResults.length} testResults.`);

    console.log("\n[8] Menguji saveCrawlerSource() dan getCrawlerSource()...");
    const crawlerSource = await saveCrawlerSource({
      savedPromptId: saved.id,
      sourceUrl: "https://raw.githubusercontent.com/test-org/prompts/main/system.md",
      domain: "raw.githubusercontent.com",
      contentHash: "sha256-abcdef1234567890",
    });
    console.log(`✅ CrawlerSource tersimpan: [ID: ${crawlerSource.id.slice(0, 8)}..., domain: ${crawlerSource.domain}]`);

    const fetchedCrawler = await getCrawlerSource(saved.id);
    if (!fetchedCrawler || fetchedCrawler.sourceUrl !== crawlerSource.sourceUrl) {
      throw new Error("Gagal mengambil CrawlerSource berdasarkan savedPromptId!");
    }
    console.log(`✅ getCrawlerSource berhasil diverifikasi.`);

    console.log("\n[9] Menguji penegakan kebijakan retensi FIFO SQLite (ADR-002 Lampiran B)...");
    // Uji retensi prompt versions: batas MAX_PROMPT_VERSIONS_PER_PROMPT (20)
    console.log(`Membuat tambahan versi hingga melampaui batas ${MAX_PROMPT_VERSIONS_PER_PROMPT}...`);
    for (let i = 3; i <= 23; i++) {
      await savePromptVersion({
        savedPromptId: saved.id,
        promptText: `Versi uji retensi #${i}`,
        score: 90,
      });
    }
    const versionsAfterRetention = await getPromptVersions(saved.id);
    if (versionsAfterRetention.length > MAX_PROMPT_VERSIONS_PER_PROMPT) {
      throw new Error(`Kebijakan retensi gagal! Jumlah versi ${versionsAfterRetention.length} > ${MAX_PROMPT_VERSIONS_PER_PROMPT}`);
    }
    console.log(`✅ Retensi PromptVersion FIFO berhasil dibatasi tepat ${versionsAfterRetention.length} versi (max: ${MAX_PROMPT_VERSIONS_PER_PROMPT}).`);

    console.log("\n[10] Menjalankan deletePrompt() oleh pemilik yang sah & memverifikasi cascade delete...");
    const deleted = await deletePrompt(saved.id, "test-user-alpha");
    console.log(`✅ deletePrompt berhasil menghapus record [ID: ${deleted.id.slice(0, 8)}...]`);

    const recheck = await getPromptById(saved.id);
    if (recheck !== null) {
      throw new Error(`Record ${saved.id} masih ditemukan setelah dihapus!`);
    }

    const recheckVersions = await getPromptVersions(saved.id);
    if (recheckVersions.length !== 0) {
      throw new Error("Cascade delete gagal: masih ada PromptVersion setelah SavedPrompt dihapus!");
    }

    const recheckCrawler = await getCrawlerSource(saved.id);
    if (recheckCrawler !== null) {
      throw new Error("Cascade delete gagal: masih ada CrawlerSource setelah SavedPrompt dihapus!");
    }
    console.log("✅ Konfirmasi cascade delete bersih pada seluruh child tables v2.0.");

    console.log("\n═══════════════════════════════════════════════════════════════════");
    console.log("🏁 TEST PRISMA & SQLITE v1.0 & v2.0 PERSISTENCE BERHASIL 100%");
    console.log("═══════════════════════════════════════════════════════════════════");
  } finally {
    await prisma.$disconnect();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(`${tempDbPath}-journal`)) fs.unlinkSync(`${tempDbPath}-journal`);
      if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
      if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
    } catch {
      // Abaikan
    }
  }
}

main().catch(async (e) => {
  console.error("❌ Test database gagal:", e);
  await prisma.$disconnect();
  process.exit(1);
});
