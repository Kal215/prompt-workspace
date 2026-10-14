import { savePrompt, getHistory, getPromptById, deletePrompt, prisma, setDatabaseUrl } from "../src/index.js";
import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🗄️  TEST PERSISTENCE: PRISMA & SQLITE (packages/database)");
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
  const samplePrompt = {
    userId: "test-user-alpha",
    originalPrompt: "Bantu saya riset pasar dan kasih kesimpulan apakah bisnis ini akan sukses.",
    optimizedPrompt: "Role: Market Research Analyst...\nObjective: Menyusun analisis riset pasar komprehensif...",
    intentSummary: "Riset awal untuk memahami pelanggan, kompetitor, harga, dan risiko bisnis.",
    score: 95,
  };

  console.log("[1] Menjalankan savePrompt() dengan userId...");
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

  console.log("\n[6] Menjalankan deletePrompt() oleh pemilik yang sah...");
  const deleted = await deletePrompt(saved.id, "test-user-alpha");
  console.log(`✅ deletePrompt berhasil menghapus record [ID: ${deleted.id.slice(0, 8)}...]`);

  const recheck = await getPromptById(saved.id);
  if (recheck !== null) {
    throw new Error(`Record ${saved.id} masih ditemukan setelah dihapus!`);
  }
  console.log("✅ Konfirmasi record terhapus bersih (recheck = null)");

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🏁 TEST PRISMA & SQLITE DATA OWNERSHIP BERHASIL 100%");
  console.log("═══════════════════════════════════════════════════════════════════");
  } finally {
    await prisma.$disconnect();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(`${tempDbPath}-journal`)) fs.unlinkSync(`${tempDbPath}-journal`);
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
