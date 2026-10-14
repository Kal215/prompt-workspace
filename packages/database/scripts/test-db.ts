import { savePrompt, getHistory, prisma } from "../src/index.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🗄️  TEST PERSISTENCE: PRISMA & SQLITE (packages/database)");
  console.log("═══════════════════════════════════════════════════════════════════");

  const samplePrompt = {
    originalPrompt: "Bantu saya riset pasar dan kasih kesimpulan apakah bisnis ini akan sukses.",
    optimizedPrompt: "Role: Market Research Analyst...\nObjective: Menyusun analisis riset pasar komprehensif...",
    intentSummary: "Riset awal untuk memahami pelanggan, kompetitor, harga, dan risiko bisnis.",
    score: 95,
  };

  console.log("[1] Menjalankan savePrompt()...");
  const saved = await savePrompt(samplePrompt);
  console.log("✅ Berhasil menyimpan prompt:", {
    id: saved.id,
    originalPromptSnippet: saved.originalPrompt.substring(0, 40) + "...",
    score: saved.score,
    createdAt: saved.createdAt.toISOString(),
  });

  console.log("\n[2] Menjalankan getHistory(5)...");
  const history = await getHistory(5);
  console.log(`✅ Berhasil mengambil ${history.length} data riwayat prompt.`);
  for (const item of history) {
    console.log(`   - [ID: ${item.id.slice(0, 8)}...] Skor: ${item.score} | Intent: ${item.intentSummary}`);
  }

  await prisma.$disconnect();
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🏁 TEST PRISMA & SQLITE BERHASIL 100%");
  console.log("═══════════════════════════════════════════════════════════════════");
}

main().catch(async (e) => {
  console.error("❌ Test database gagal:", e);
  await prisma.$disconnect();
  process.exit(1);
});
