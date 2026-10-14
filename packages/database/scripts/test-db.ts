import { savePrompt, getHistory, getPromptById, deletePrompt, prisma } from "../src/index.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🗄️  TEST PERSISTENCE: PRISMA & SQLITE (packages/database)");
  console.log("═══════════════════════════════════════════════════════════════════");

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

  console.log("\n[5] Menjalankan deletePrompt() oleh pemilik yang sah...");
  const deleted = await deletePrompt(saved.id, "test-user-alpha");
  console.log(`✅ deletePrompt berhasil menghapus record [ID: ${deleted.id.slice(0, 8)}...]`);

  const recheck = await getPromptById(saved.id);
  if (recheck !== null) {
    throw new Error(`Record ${saved.id} masih ditemukan setelah dihapus!`);
  }
  console.log("✅ Konfirmasi record terhapus bersih (recheck = null)");

  await prisma.$disconnect();
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🏁 TEST PRISMA & SQLITE DATA OWNERSHIP BERHASIL 100%");
  console.log("═══════════════════════════════════════════════════════════════════");
}

main().catch(async (e) => {
  console.error("❌ Test database gagal:", e);
  await prisma.$disconnect();
  process.exit(1);
});
