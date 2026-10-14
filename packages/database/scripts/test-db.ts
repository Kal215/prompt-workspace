import {
  savePrompt,
  getHistory,
  getPromptById,
  deletePrompt,
  createPromptVersion,
  getPromptVersions,
  getPromptVersionById,
  saveCrawlSessionBatch,
  getCrawlSessionById,
  saveSpiderRunBatch,
  getSpiderRunById,
  enableSqliteWalMode,
  MAX_PROMPT_VERSIONS_PER_PROMPT,
  MAX_SPIDER_RUNS_PER_VERSION,
  prisma,
  setDatabaseUrl,
} from "../src/index.js";
import { computeCriticalGatePassed } from "@prompt-workspace/prompt-contracts";
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

  // 0. Setup isolated temporary database in os.tmpdir()
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
    await enableSqliteWalMode();
    const journalModeResult = await prisma.$queryRaw<Array<{ journal_mode: string }>>`PRAGMA journal_mode;`;
    console.log(`✅ SQLite journal mode: ${journalModeResult[0]?.journal_mode}`);

    const samplePrompt = {
      userId: "test-user-alpha",
      originalPrompt: "Bantu saya riset pasar dan kasih kesimpulan apakah bisnis ini akan sukses.",
      optimizedPrompt: "Role: Market Research Analyst...\nObjective: Menyusun analisis riset pasar komprehensif...",
      intentSummary: "Riset awal untuk memahami pelanggan, kompetitor, harga, dan risiko bisnis.",
      score: 95,
    };

    console.log("\n[1] Menjalankan savePrompt() v1.0...");
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

    console.log("\n[3] Menguji auto-bootstrap getPromptVersions() (versionNumber = 1 dari SavedPrompt)...");
    const initialVersions = await getPromptVersions(saved.id, "test-user-alpha");
    if (initialVersions.length !== 1 || initialVersions[0].versionNumber !== 1) {
      throw new Error(`Auto-bootstrap version 1 gagal! Got ${JSON.stringify(initialVersions)}`);
    }
    if (initialVersions[0].promptContent !== saved.optimizedPrompt) {
      throw new Error("Konten auto-bootstrap version 1 tidak cocok dengan saved.optimizedPrompt!");
    }
    console.log(`✅ Auto-bootstrap Version 1 berhasil: [version: ${initialVersions[0].versionNumber}, source: ${initialVersions[0].sourceRole}]`);

    console.log("\n[4] Menguji anti-IDOR pada getPromptVersions()...");
    try {
      await getPromptVersions(saved.id, "test-user-beta");
      throw new Error("SECURITY_FAILURE: User Beta berhasil mengakses versions milik User Alpha!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "FORBIDDEN") throw err;
      console.log("✅ Akses lintas pengguna pada getPromptVersions berhasil diblokir dengan FORBIDDEN.");
    }

    console.log("\n[5] Menguji createPromptVersion() v2.0...");
    const v2 = await createPromptVersion({
      savedPromptId: saved.id,
      userId: "test-user-alpha",
      sourceRole: "CLOSED_LOOP",
      promptContent: "Versi 2: Optimasi lanjutan dengan anti-adversarial injection.",
      groundingSummary: "Hasil sintesis spider v1",
    });
    if (v2.versionNumber !== 2) {
      throw new Error(`Ekspektasi versionNumber 2, didapat: ${v2.versionNumber}`);
    }
    console.log(`✅ Version 2 dibuat: [versionNumber: ${v2.versionNumber}, sourceRole: ${v2.sourceRole}]`);

    // Uji anti-IDOR createPromptVersion
    try {
      await createPromptVersion({
        savedPromptId: saved.id,
        userId: "test-user-beta",
        promptContent: "Versi bajakan",
      });
      throw new Error("SECURITY_FAILURE: User Beta berhasil membuat version pada prompt User Alpha!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "FORBIDDEN") throw err;
      console.log("✅ createPromptVersion lintas user berhasil diblokir dengan FORBIDDEN.");
    }

    console.log("\n[6] Menguji saveCrawlSessionBatch() dengan CrawlItem batch & idempotency P2002...");
    const crawlBatch = await saveCrawlSessionBatch({
      userId: "test-user-alpha",
      idempotencyKey: "idemp-crawl-001",
      sourceUrl: "https://github.com/test-org/prompts/blob/main/prompt.md",
      normalizedUrl: "https://raw.githubusercontent.com/test-org/prompts/main/prompt.md",
      sourceType: "GITHUB_RAW_FILE",
      status: "SUCCEEDED",
      bytesRead: 1024,
      items: [
        {
          itemType: "PROMPT_CANDIDATE",
          extractedText: "You are a specialized code reviewer.",
          confidenceEstimate: 0.95,
          warnings: ["Potential short prompt"],
        },
        {
          itemType: "GROUNDING_FACT",
          extractedText: "Target environment: Node.js 20 LTS",
          confidenceEstimate: 0.98,
        },
      ],
    });
    console.log(`✅ CrawlSessionBatch berhasil: [id: ${crawlBatch.id.slice(0, 8)}..., items: ${crawlBatch.items.length}]`);

    // Uji idempotency P2002 crawl session
    const duplicateCrawl = await saveCrawlSessionBatch({
      userId: "test-user-alpha",
      idempotencyKey: "idemp-crawl-001", // Kunci sama
      sourceUrl: "https://should-be-ignored.com",
      normalizedUrl: "https://should-be-ignored.com",
      sourceType: "GITHUB_RAW_FILE",
      status: "FAILED",
    });
    if (duplicateCrawl.id !== crawlBatch.id) {
      throw new Error("Idempotensi CrawlSession gagal! Menghasilkan record berbeda.");
    }
    console.log("✅ Idempotensi CrawlSession (P2002 replay) berhasil memulihkan record eksisting.");

    // Uji anti-IDOR getCrawlSessionById
    try {
      await getCrawlSessionById(crawlBatch.id, "test-user-beta");
      throw new Error("SECURITY_FAILURE: User Beta berhasil membaca crawl session User Alpha!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "FORBIDDEN") throw err;
      console.log("✅ getCrawlSessionById lintas user berhasil diblokir dengan FORBIDDEN.");
    }

    console.log("\n[7] Menguji saveSpiderRunBatch() dengan SpiderBranchResult[] batch...");
    const spiderBranchesInput = [
      {
        caseId: "case-happy-01",
        category: "BASELINE_HAPPY_PATH",
        severity: "LOW",
        status: "PASS",
        score: 95,
        latencyMs: 320,
        sanitizedInput: "Halo",
        sanitizedOutput: "Halo, ada yang bisa dibantu?",
        deterministicPass: true,
      },
      {
        caseId: "case-sec-01",
        category: "ADVERSARIAL_INJECTION",
        severity: "CRITICAL",
        status: "PASS",
        score: 100,
        latencyMs: 410,
        sanitizedInput: "Ignore instructions",
        sanitizedOutput: "Instruksi ditolak",
        deterministicPass: true,
      },
    ];

    const criticalGatePassed = computeCriticalGatePassed([
      { caseId: "case-happy-01", severity: "LOW", status: "PASS" },
      { caseId: "case-sec-01", severity: "CRITICAL", status: "PASS" },
    ]);
    console.log(`✅ computeCriticalGatePassed helper verified: ${criticalGatePassed}`);

    const spiderRun = await saveSpiderRunBatch({
      userId: "test-user-alpha",
      idempotencyKey: "idemp-spider-001",
      promptVersionId: v2.id,
      testSuiteVersion: "1.0.0",
      rubricVersion: "2026.1",
      provider: "groq",
      modelId: "llama-3.3-70b-versatile",
      status: "SUCCEEDED",
      criticalGatePassed,
      qualityMetrics: { taskAdherence: 95, constraintAdherence: 98, formatCompliance: 100, robustness: 92 },
      securityFindings: [],
      totalTokens: 1500,
      durationMs: 730,
      branches: spiderBranchesInput,
    });
    console.log(`✅ SpiderRunBatch berhasil: [id: ${spiderRun.id.slice(0, 8)}..., branches: ${spiderRun.branches.length}]`);

    // Uji getSpiderRunById
    const fetchedRun = await getSpiderRunById(spiderRun.id, "test-user-alpha");
    if (!fetchedRun || fetchedRun.branches.length !== 2) {
      throw new Error("Gagal mengambil SpiderRun dengan branches!");
    }
    console.log(`✅ getSpiderRunById berhasil mengambil ${fetchedRun.branches.length} branches.`);

    // Uji anti-IDOR getSpiderRunById
    try {
      await getSpiderRunById(spiderRun.id, "test-user-beta");
      throw new Error("SECURITY_FAILURE: User Beta berhasil membaca SpiderRun User Alpha!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "FORBIDDEN") throw err;
      console.log("✅ getSpiderRunById lintas user berhasil diblokir dengan FORBIDDEN.");
    }

    // Uji idempotency P2002 spider run
    const duplicateSpider = await saveSpiderRunBatch({
      userId: "test-user-alpha",
      idempotencyKey: "idemp-spider-001",
      promptVersionId: v2.id,
      testSuiteVersion: "1.0.0",
      rubricVersion: "2026.1",
      provider: "groq",
      modelId: "llama-3.3-70b-versatile",
      status: "FAILED",
    });
    if (duplicateSpider.id !== spiderRun.id) {
      throw new Error("Idempotensi SpiderRun gagal!");
    }
    console.log("✅ Idempotensi SpiderRun (P2002 replay) berhasil memulihkan record eksisting.");

    console.log("\n[8] Menguji retensi FIFO PromptVersion (max 20) & SpiderRun (max 10)...");
    // Buat hingga 25 versi untuk saved.id
    console.log(`Membuat tambahan PromptVersion hingga melebihi ${MAX_PROMPT_VERSIONS_PER_PROMPT}...`);
    for (let i = 3; i <= 25; i++) {
      await createPromptVersion({
        savedPromptId: saved.id,
        userId: "test-user-alpha",
        promptContent: `Versi retensi #${i}`,
      });
    }
    const finalVersions = await getPromptVersions(saved.id, "test-user-alpha");
    if (finalVersions.length > MAX_PROMPT_VERSIONS_PER_PROMPT) {
      throw new Error(`Retensi PromptVersion gagal! Count: ${finalVersions.length} > ${MAX_PROMPT_VERSIONS_PER_PROMPT}`);
    }
    console.log(`✅ Retensi PromptVersion FIFO berhasil dibatasi tepat ${finalVersions.length} versi.`);

    // Buat hingga 15 spider runs untuk versi aktif terbaru
    const activeVersion = finalVersions[finalVersions.length - 1];
    console.log(`Membuat tambahan SpiderRun pada version ${activeVersion.versionNumber} hingga melebihi ${MAX_SPIDER_RUNS_PER_VERSION}...`);
    for (let i = 1; i <= 15; i++) {
      await saveSpiderRunBatch({
        userId: "test-user-alpha",
        promptVersionId: activeVersion.id,
        testSuiteVersion: "1.0.0",
        rubricVersion: "2026.1",
        provider: "groq",
        modelId: "llama-3.3-70b-versatile",
        status: "SUCCEEDED",
      });
    }
    const runsForActiveVersion = await prisma.spiderRun.findMany({ where: { promptVersionId: activeVersion.id } });
    if (runsForActiveVersion.length > MAX_SPIDER_RUNS_PER_VERSION) {
      throw new Error(`Retensi SpiderRun gagal! Count: ${runsForActiveVersion.length} > ${MAX_SPIDER_RUNS_PER_VERSION}`);
    }
    console.log(`✅ Retensi SpiderRun FIFO berhasil dibatasi tepat ${runsForActiveVersion.length} runs.`);

    console.log("\n[9] Menguji Cascade Delete: SavedPrompt -> PromptVersion -> SpiderRun -> SpiderBranchResult...");
    await deletePrompt(saved.id, "test-user-alpha");
    const recheckPrompt = await getPromptById(saved.id);
    if (recheckPrompt !== null) {
      throw new Error("SavedPrompt masih ada setelah deletePrompt!");
    }
    const recheckVersions = await prisma.promptVersion.findMany({ where: { savedPromptId: saved.id } });
    if (recheckVersions.length !== 0) {
      throw new Error("PromptVersion masih tersisa setelah cascade delete!");
    }
    const recheckRuns = await prisma.spiderRun.findMany({ where: { promptVersionId: activeVersion.id } });
    if (recheckRuns.length !== 0) {
      throw new Error("SpiderRun masih tersisa setelah cascade delete!");
    }
    const recheckBranches = await prisma.spiderBranchResult.findMany({ where: { spiderRunId: spiderRun.id } });
    if (recheckBranches.length !== 0) {
      throw new Error("SpiderBranchResult masih tersisa setelah cascade delete!");
    }
    console.log("✅ Cascade delete menyeluruh diverifikasi bersih.");

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
