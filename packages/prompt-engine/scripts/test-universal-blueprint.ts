import assert from "node:assert";
import {
  UniversalBlueprintSpecSchema,
  AudienceLevelEnum,
} from "@prompt-workspace/prompt-contracts";
import {
  synthesizeUniversalBlueprint,
  classifyUniversalDomain,
  auditCrossArtifactConsistency,
} from "../src/index.js";

async function runUniversalBlueprintVerification() {
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("🌟 TAHAP A: UNIVERSAL META-BLUEPRINT & POLYMORPHIC DIAGRAMS");
  console.log("   5 Golden Benchmark Scenarios + 3 Blind Tests + Consistency Guard");
  console.log("════════════════════════════════════════════════════════════════════\n");

  let totalTests = 0;
  let passedTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 1. GOLDEN SCENARIO 1: Software / IT (Neumorphism Website)
  // ────────────────────────────────────────────────────────────────
  console.log("💻 1. Golden Scenario 1: Software & System Engineering (Website Neumorphism)");
  const itPrompt = "Buat website toko kue tema neumorphism dari awal sampai akhir";
  const itResult = synthesizeUniversalBlueprint({
    prompt: itPrompt,
    audienceLevel: "specialist",
  });

  test("Domain terklasifikasi sebagai 'software'", () => {
    assert.strictEqual(itResult.blueprint.domain, "software");
  });

  test("Tervalidasi 100% oleh UniversalBlueprintSpecSchema (Zod Contract)", () => {
    const parsed = UniversalBlueprintSpecSchema.parse(itResult.blueprint);
    assert.ok(parsed);
  });

  test("Dewan Pakar mencakup 8 peran spesialis software", () => {
    assert.strictEqual(itResult.blueprint.roles.length, 8);
    assert.ok(itResult.blueprint.roles.some((r) => r.includes("Neumorphism")));
    assert.ok(itResult.blueprint.roles.some((r) => r.includes("Database Architect")));
  });

  test("Menghasilkan minimal 2 diagram Mermaid valid (ERD & Flowchart Transaksi)", () => {
    assert.ok(itResult.blueprint.diagrams.length >= 2);
    assert.ok(itResult.blueprint.diagrams.some((d) => d.type === "erd"));
    assert.ok(itResult.blueprint.diagrams.some((d) => d.type === "flowchart"));
  });

  test("Diagram ERD memuat entitas kunci database (USER, PRODUCT, ORDER, dll)", () => {
    const erd = itResult.blueprint.diagrams.find((d) => d.type === "erd");
    assert.ok(erd);
    assert.ok(erd.entities.includes("USER"));
    assert.ok(erd.entities.includes("PRODUCT"));
    assert.ok(erd.entities.includes("ORDER"));
  });

  test("Cross-Artifact Consistency Guard mencatat skor >= 90%", () => {
    assert.ok(itResult.consistencyScore >= 90, `Skor: ${itResult.consistencyScore}`);
    assert.strictEqual(itResult.consistencyValid, true);
  });

  test("Rangkaian End-to-End mencakup 6 fase kerja (Phase 0 s/d Phase 5)", () => {
    assert.strictEqual(itResult.blueprint.executionPhases.length, 6);
    assert.strictEqual(itResult.blueprint.executionPhases[0].name, "Discovery & Requirements Analysis");
  });

  test("Master prompt markdown mengandung 10 bagian universal lengkap", () => {
    const md = itResult.blueprint.renderedMasterPrompt;
    for (let i = 1; i <= 10; i++) {
      assert.ok(md.includes(`## ${i}.`), `Markdown harus memuat Bagian ${i}`);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // 2. GOLDEN SCENARIO 2: Science & Research (Dampak Mikroplastik Laut)
  // ────────────────────────────────────────────────────────────────
  console.log("\n🔬 2. Golden Scenario 2: Scientific Research & Empirical Study (Mikroplastik Laut)");
  const sciencePrompt = "Rancang penelitian tentang dampak mikroplastik pada ekosistem laut dan mangrove";
  const scienceResult = synthesizeUniversalBlueprint({
    prompt: sciencePrompt,
    audienceLevel: "specialist",
  });

  test("Domain terklasifikasi sebagai 'research'", () => {
    assert.strictEqual(scienceResult.blueprint.domain, "research");
  });

  test("Tervalidasi 100% oleh Zod Contract", () => {
    assert.ok(UniversalBlueprintSpecSchema.parse(scienceResult.blueprint));
  });

  test("Dewan Pakar dipimpin oleh Principal Investigator & Biostatistician", () => {
    assert.ok(scienceResult.blueprint.roles.some((r) => r.includes("Principal Investigator")));
    assert.ok(scienceResult.blueprint.roles.some((r) => r.includes("Biostatistician")));
  });

  test("Menghasilkan diagram Kerangka Konsep Variabel & Alur Metodologi PRISMA", () => {
    assert.ok(scienceResult.blueprint.diagrams.length >= 2);
    assert.ok(scienceResult.blueprint.diagrams.some((d) => d.mermaidCode.includes("PRISMA")));
  });

  test("Memuat larangan mutlak sitasi fiktif (Zero Hallucinated Citations)", () => {
    assert.ok(
      scienceResult.blueprint.negativeConstraints.some((c) =>
        c.includes("DILARANG MENGARANG SITASI ATAU JURNAL FIKTIF")
      )
    );
  });

  test("Deliverables mencakup dokumen ilmiah standar (RESEARCH_PROPOSAL, PROTOCOL, MANUSCRIPT)", () => {
    const allDeliverables = scienceResult.blueprint.executionPhases.flatMap((p) => p.deliverables);
    assert.ok(allDeliverables.includes("RESEARCH_PROPOSAL.md"));
    assert.ok(allDeliverables.includes("SAMPLING_PROTOCOL.md"));
    assert.ok(allDeliverables.includes("MANUSCRIPT_FINAL.docx"));
  });

  test("Cross-Artifact Consistency Guard valid (Skor >= 90%)", () => {
    assert.ok(scienceResult.consistencyScore >= 90);
    assert.strictEqual(scienceResult.consistencyValid, true);
  });

  // ────────────────────────────────────────────────────────────────
  // 3. GOLDEN SCENARIO 3: Academic Thesis (Skripsi Adopsi AI di UMKM)
  // ────────────────────────────────────────────────────────────────
  console.log("\n📚 3. Golden Scenario 3: Academic Thesis & Methodology (Skripsi Adopsi AI UMKM)");
  const thesisPrompt = "Bantu saya menyusun kerangka skripsi tentang adopsi AI di UMKM kuliner";
  const thesisResult = synthesizeUniversalBlueprint({
    prompt: thesisPrompt,
    audienceLevel: "academic",
  });

  test("Domain terklasifikasi sebagai 'academic'", () => {
    assert.strictEqual(thesisResult.blueprint.domain, "academic");
  });

  test("Audience Level terkalibrasi ke 'academic'", () => {
    assert.strictEqual(thesisResult.blueprint.audienceLevel, "academic");
  });

  test("Dewan Pakar mencakup Dosen Pembimbing Akademik & Analis Statistik", () => {
    assert.ok(thesisResult.blueprint.roles.some((r) => r.includes("Dosen Pembimbing Akademik")));
    assert.ok(thesisResult.blueprint.roles.some((r) => r.includes("Analis Statistik")));
  });

  test("Menghasilkan diagram Kerangka Teori TAM/UTAUT dan Alur Uji Statistik", () => {
    assert.ok(thesisResult.blueprint.diagrams.some((d) => d.mermaidCode.includes("Kemudahan")));
    assert.ok(thesisResult.blueprint.diagrams.some((d) => d.mermaidCode.includes("Regresi")));
  });

  test("Tahapan eksekusi mencakup struktur Bab 1 sampai Bab 5 lengkap", () => {
    const allDeliverables = thesisResult.blueprint.executionPhases.flatMap((p) => p.deliverables);
    assert.ok(allDeliverables.some((d) => d.includes("BAB1")));
    assert.ok(allDeliverables.some((d) => d.includes("BAB2")));
    assert.ok(allDeliverables.some((d) => d.includes("BAB3")));
    assert.ok(allDeliverables.some((d) => d.includes("BAB4")));
    assert.ok(allDeliverables.some((d) => d.includes("SKRIPSI_LENGKAP_FINAL")));
  });

  test("Memuat larangan pemalsuan data kuesioner dan plagiarisme", () => {
    assert.ok(
      thesisResult.blueprint.negativeConstraints.some((c) =>
        c.includes("plagiarisme") || c.includes("fiktif")
      )
    );
  });

  // ────────────────────────────────────────────────────────────────
  // 4. GOLDEN SCENARIO 4: Business Strategy & SOP (Kopi Kemasan Botol)
  // ────────────────────────────────────────────────────────────────
  console.log("\n💼 4. Golden Scenario 4: Enterprise Business Strategy & Operational SOP (Kopi Botol)");
  const businessPrompt = "Buatkan strategi peluncuran produk kopi susu kemasan botol baru dari awal sampai eksekusi";
  const businessResult = synthesizeUniversalBlueprint({
    prompt: businessPrompt,
    audienceLevel: "professional",
  });

  test("Domain terklasifikasi sebagai 'business'", () => {
    assert.strictEqual(businessResult.blueprint.domain, "business");
  });

  test("Audience Level terkalibrasi ke 'professional'", () => {
    assert.strictEqual(businessResult.blueprint.audienceLevel, "professional");
  });

  test("Dewan Pakar dipimpin oleh Chief Strategy Officer & Head of Operations", () => {
    assert.ok(businessResult.blueprint.roles.some((r) => r.includes("Chief Strategy Officer")));
    assert.ok(businessResult.blueprint.roles.some((r) => r.includes("Operations")));
  });

  test("Menghasilkan diagram SOP Alur Produksi & Gantt Chart 12 Minggu", () => {
    assert.ok(businessResult.blueprint.diagrams.some((d) => d.type === "flowchart"));
    assert.ok(businessResult.blueprint.diagrams.some((d) => d.type === "gantt"));
  });

  test("Memuat formula matematis HPP transparan tanpa angka karangan (No Deceptive Certainty)", () => {
    assert.ok(businessResult.blueprint.coreSpecification.includes("HPP"));
    assert.ok(businessResult.blueprint.coreSpecification.includes("FORMULA"));
    // Tidak boleh mengarang angka palsu yang tidak ada di prompt
    assert.strictEqual(businessResult.blueprint.coreSpecification.includes("Rp 9.500"), false);
  });

  test("Memuat larangan pencampuran rekening pribadi dan omzet usaha", () => {
    assert.ok(
      businessResult.blueprint.negativeConstraints.some((c) =>
        c.toUpperCase().includes("OMZET KOTOR")
      )
    );
  });

  // ────────────────────────────────────────────────────────────────
  // 5. GOLDEN SCENARIO 5: Student & Education (Praktikum Fotosintesis)
  // ────────────────────────────────────────────────────────────────
  console.log("\n🎓 5. Golden Scenario 5: Guided Learning & Lab Experiment (Fotosintesis Siswa)");
  const studentPrompt = "Jelaskan cara kerja fotosintesis dan buatkan panduan praktikumnya untuk siswa sekolah";
  const studentResult = synthesizeUniversalBlueprint({
    prompt: studentPrompt,
    audienceLevel: "student",
  });

  test("Domain terklasifikasi sebagai 'education'", () => {
    assert.strictEqual(studentResult.blueprint.domain, "education");
  });

  test("Audience Level terkalibrasi ke 'student'", () => {
    assert.strictEqual(studentResult.blueprint.audienceLevel, "student");
  });

  test("Dewan Pakar terdiri dari Guru Pembimbing Sains & Desainer Kurikulum Visual", () => {
    assert.ok(studentResult.blueprint.roles.some((r) => r.includes("Guru Pembimbing Sains")));
    assert.ok(studentResult.blueprint.roles.some((r) => r.includes("Visual")));
  });

  test("Menghasilkan Diagram Alur Reaksi Terang-Gelap & Mindmap Faktor Fotosintesis", () => {
    assert.ok(studentResult.blueprint.diagrams.some((d) => d.mermaidCode.includes("ReaksiTerang")));
    assert.ok(studentResult.blueprint.diagrams.some((d) => d.mermaidCode.includes("FaktorPengaruh")));
  });

  test("Menggunakan analogi ramah siswa 'Pabrik Tenaga Surya'", () => {
    assert.ok(studentResult.blueprint.coreSpecification.includes("Pabrik Tenaga Surya"));
  });

  test("Menyediakan SOP Keselamatan Laboratorium ramah siswa", () => {
    const allDeliverables = studentResult.blueprint.executionPhases.flatMap((p) => p.deliverables);
    assert.ok(allDeliverables.includes("SOP_KESELAMATAN_LAB.md"));
  });

  // ────────────────────────────────────────────────────────────────
  // 6. BLIND TEST 1: Pelajar SMA — Fisika (Rangkaian Listrik Seri & Paralel)
  // ────────────────────────────────────────────────────────────────
  console.log("\n⚡ 6. BLIND TEST 1: Pelajar SMA — Fisika Rangkaian Listrik Seri & Paralel");
  const blind1Prompt = "Jelaskan cara kerja rangkaian listrik seri dan paralel beserta panduan praktikum baterai dan lampu bohlam di sekolah";
  const blind1Result = synthesizeUniversalBlueprint({
    prompt: blind1Prompt,
    audienceLevel: "student",
  });

  test("Blind 1: Domain terklasifikasi sebagai 'education'", () => {
    assert.strictEqual(blind1Result.blueprint.domain, "education");
  });

  test("Blind 1: Diagram Mermaid menggunakan konsep kelistrikan (bukan fotosintesis!)", () => {
    const diagrams = blind1Result.blueprint.diagrams;
    assert.ok(diagrams.length >= 2);
    const allCode = diagrams.map((d) => d.mermaidCode).join(" ");
    assert.ok(allCode.includes("SumberTeganganBaterai") || allCode.includes("RangkaianSeriSatuJalur"));
    assert.ok(allCode.includes("BebanLampuBohlam") || allCode.includes("RangkaianParalelBercabang"));
    // Uji kebocoran mutlak:
    assert.strictEqual(allCode.toLowerCase().includes("fotosintesis"), false, "Diagram tidak boleh membocorkan kata 'fotosintesis'");
    assert.strictEqual(allCode.toLowerCase().includes("mikroplastik"), false, "Diagram tidak boleh membocorkan kata 'mikroplastik'");
    assert.strictEqual(allCode.toLowerCase().includes("kopi"), false, "Diagram tidak boleh membocorkan kata 'kopi'");
  });

  test("Blind 1: Core Specification memuat analogi aliran air & rumus Hukum Ohm", () => {
    const core = blind1Result.blueprint.coreSpecification;
    assert.ok(core.includes("Hukum Ohm") || core.includes("V = I * R"));
    assert.ok(core.includes("Aliran Air"));
    assert.ok(core.includes("korsleting"));
  });

  test("Blind 1: 0% Kebocoran topik lain di seluruh rendered Master Prompt", () => {
    const fullPrompt = blind1Result.blueprint.renderedMasterPrompt.toLowerCase();
    assert.strictEqual(fullPrompt.includes("fotosintesis"), false, "Tidak boleh bocor kata 'fotosintesis'");
    assert.strictEqual(fullPrompt.includes("ftir"), false, "Tidak boleh bocor kata 'ftir'");
    assert.strictEqual(fullPrompt.includes("kopi"), false, "Tidak boleh bocor kata 'kopi'");
    assert.strictEqual(fullPrompt.includes("toko kue"), false, "Tidak boleh bocor kata 'toko kue'");
    assert.strictEqual(fullPrompt.includes("9.500"), false, "Tidak boleh ada angka '9.500'");
  });

  test("Blind 1: Cross-Artifact Consistency Guard mencatat skor >= 90%", () => {
    assert.ok(blind1Result.consistencyScore >= 90, `Skor: ${blind1Result.consistencyScore}`);
    assert.strictEqual(blind1Result.consistencyValid, true);
  });

  // ────────────────────────────────────────────────────────────────
  // 7. BLIND TEST 2: Bisnis / UMKM — Peternakan (Budidaya Lele Bioflok)
  // ────────────────────────────────────────────────────────────────
  console.log("\n🐟 7. BLIND TEST 2: Bisnis/UMKM — Budidaya Ikan Lele Sistem Bioflok");
  const blind2Prompt = "Buatkan rencana strategis dan SOP usaha budidaya ikan lele sistem bioflok dari tebar benih hingga panen";
  const blind2Result = synthesizeUniversalBlueprint({
    prompt: blind2Prompt,
    audienceLevel: "professional",
  });

  test("Blind 2: Domain terklasifikasi sebagai 'business'", () => {
    assert.strictEqual(blind2Result.blueprint.domain, "business");
  });

  test("Blind 2: Diagram Mermaid menggunakan entitas Bioflok (SOP Kolam & Gantt 90 Hari)", () => {
    const diagrams = blind2Result.blueprint.diagrams;
    assert.ok(diagrams.length >= 2);
    const allCode = diagrams.map((d) => d.mermaidCode).join(" ");
    assert.ok(allCode.includes("PersiapanKolamDanAir") || allCode.includes("Bioflok"));
    assert.ok(allCode.includes("BenihLele") || allCode.includes("PemberianPakanFCR"));
    // Uji kebocoran mutlak:
    assert.strictEqual(allCode.toLowerCase().includes("kopi"), false, "Diagram tidak boleh membocorkan kata 'kopi'");
    assert.strictEqual(allCode.toLowerCase().includes("toko kue"), false, "Diagram tidak boleh membocorkan kata 'toko kue'");
    assert.strictEqual(allCode.toLowerCase().includes("fotosintesis"), false, "Diagram tidak boleh membocorkan kata 'fotosintesis'");
  });

  test("Blind 2: Model Biaya menggunakan formula HPP matematis transparan (Zero Fake Numbers)", () => {
    const core = blind2Result.blueprint.coreSpecification;
    assert.ok(core.includes("FORMULA_HPP_PER_KG") || core.includes("HPP per Kg"));
    assert.ok(core.includes("FCR"));
    assert.ok(core.includes("Oksigen") || core.includes("DO"));
    // Dilarang keras mengarang angka Rp 9.500:
    assert.strictEqual(core.includes("Rp 9.500"), false);
    assert.strictEqual(core.includes("9500"), false);
  });

  test("Blind 2: 0% Kebocoran topik lain di seluruh rendered Master Prompt", () => {
    const fullPrompt = blind2Result.blueprint.renderedMasterPrompt.toLowerCase();
    assert.strictEqual(fullPrompt.includes("kopi"), false, "Tidak boleh bocor kata 'kopi'");
    assert.strictEqual(fullPrompt.includes("toko kue"), false, "Tidak boleh bocor kata 'toko kue'");
    assert.strictEqual(fullPrompt.includes("fotosintesis"), false, "Tidak boleh bocor kata 'fotosintesis'");
    assert.strictEqual(fullPrompt.includes("mikroplastik"), false, "Tidak boleh bocor kata 'mikroplastik'");
    assert.strictEqual(fullPrompt.includes("9.500"), false, "Tidak boleh ada angka '9.500'");
  });

  test("Blind 2: Cross-Artifact Consistency Guard mencatat skor >= 90%", () => {
    assert.ok(blind2Result.consistencyScore >= 90, `Skor: ${blind2Result.consistencyScore}`);
    assert.strictEqual(blind2Result.consistencyValid, true);
  });

  // ────────────────────────────────────────────────────────────────
  // 8. BLIND TEST 3: Spesialis IT/Web3 — Smart Contract DeFi Staking
  // ────────────────────────────────────────────────────────────────
  console.log("\n⛓️ 8. BLIND TEST 3: Spesialis IT/Web3 — Smart Contract Staking Token Kripto DeFi");
  const blind3Prompt = "Rancang sistem smart contract staking token kripto DeFi dengan mekanisme penalti unstake dini dan audit keamanan anti-reentrancy";
  const blind3Result = synthesizeUniversalBlueprint({
    prompt: blind3Prompt,
    audienceLevel: "specialist",
  });

  test("Blind 3: Domain terklasifikasi sebagai 'software'", () => {
    assert.strictEqual(blind3Result.blueprint.domain, "software");
  });

  test("Blind 3: Diagram ERD & Flowchart menggunakan entitas DeFi Staking (bukan toko kue!)", () => {
    const diagrams = blind3Result.blueprint.diagrams;
    assert.ok(diagrams.length >= 2);
    const allCode = diagrams.map((d) => d.mermaidCode).join(" ");
    assert.ok(allCode.includes("StakerAccount") || allCode.includes("StakingPoolContract"));
    assert.ok(allCode.includes("DepositPosition") || allCode.includes("ReentrancyGuardShield"));
    // Uji kebocoran mutlak:
    assert.strictEqual(allCode.toLowerCase().includes("toko kue"), false, "Diagram tidak boleh membocorkan kata 'toko kue'");
    assert.strictEqual(allCode.toLowerCase().includes("katalog"), false, "Diagram tidak boleh membocorkan 'katalog'");
    assert.strictEqual(allCode.toLowerCase().includes("kopi"), false, "Diagram tidak boleh membocorkan kata 'kopi'");
    assert.strictEqual(allCode.toLowerCase().includes("fotosintesis"), false, "Diagram tidak boleh membocorkan kata 'fotosintesis'");
  });

  test("Blind 3: Core Specification memuat arsitektur EVM, modifier nonReentrant, & formula penalti", () => {
    const core = blind3Result.blueprint.coreSpecification;
    assert.ok(core.includes("ReentrancyGuard") || core.includes("nonReentrant"));
    assert.ok(core.includes("Checks-Effects-Interactions"));
    assert.ok(core.includes("Penalti"));
    assert.ok(core.includes("msg.sender"));
  });

  test("Blind 3: Negative Constraints memuat larangan reentrancy, tx.origin, dan larangan POS", () => {
    const neg = blind3Result.blueprint.negativeConstraints;
    assert.ok(neg.some((c) => c.includes("Reentrancy") || c.includes("Checks-Effects-Interactions")));
    assert.ok(neg.some((c) => c.includes("tx.origin")));
    assert.ok(neg.some((c) => c.includes("POS") || c.includes("Kasir")));
  });

  test("Blind 3: 0% Kebocoran topik lain di seluruh rendered Master Prompt", () => {
    const fullPrompt = blind3Result.blueprint.renderedMasterPrompt.toLowerCase();
    assert.strictEqual(fullPrompt.includes("toko kue"), false, "Tidak boleh bocor kata 'toko kue'");
    assert.strictEqual(fullPrompt.includes("kopi"), false, "Tidak boleh bocor kata 'kopi'");
    assert.strictEqual(fullPrompt.includes("fotosintesis"), false, "Tidak boleh bocor kata 'fotosintesis'");
    assert.strictEqual(fullPrompt.includes("mikroplastik"), false, "Tidak boleh bocor kata 'mikroplastik'");
    assert.strictEqual(fullPrompt.includes("9.500"), false, "Tidak boleh ada angka '9.500'");
  });

  test("Blind 3: Cross-Artifact Consistency Guard mencatat skor >= 90%", () => {
    assert.ok(blind3Result.consistencyScore >= 90, `Skor: ${blind3Result.consistencyScore}`);
    assert.strictEqual(blind3Result.consistencyValid, true);
  });

  // ────────────────────────────────────────────────────────────────
  // 9. Cross-Artifact Consistency Guard Deep Validation
  // ────────────────────────────────────────────────────────────────
  console.log("\n🛡️ 9. Pengujian Mendalam Cross-Artifact Consistency Guard");

  test("Guard mendeteksi entitas fiktif (phantom entities) jika ditambahkan secara tidak wajar", () => {
    const syntheticAudit = auditCrossArtifactConsistency({
      diagrams: [
        {
          id: "test-erd",
          type: "erd",
          title: "Test ERD",
          mermaidCode: "erDiagram\n  USER ||--o{ ORDER : places",
          description: "Test",
          entities: ["USER", "ORDER", "UNREFERENCED_PHANTOM_TABLE"],
        },
      ],
      coreSpecification: "Teks ini hanya menjelaskan sistem tanpa menyebut entitas ketiga.",
      executionPhases: [
        {
          phaseNumber: 0,
          name: "Test Phase",
          tasks: ["Gunakan tabel USER dan ORDER."],
          deliverables: ["TEST.md"],
        },
      ],
    });

    assert.ok(syntheticAudit.warnings.length > 0);
    assert.ok(syntheticAudit.warnings.some((w) => w.includes("UNREFERENCED_PHANTOM_TABLE")));
  });

  test("Guard mendeteksi jika sintaks header Mermaid tidak dikenali", () => {
    const badSyntaxAudit = auditCrossArtifactConsistency({
      diagrams: [
        {
          id: "broken-diag",
          type: "flowchart",
          title: "Broken",
          mermaidCode: "invalid_syntax_header\n  A --> B",
          description: "Broken",
          entities: ["A", "B"],
        },
      ],
      coreSpecification: "A dan B",
      executionPhases: [],
    });

    assert.ok(badSyntaxAudit.warnings.some((w) => w.includes("header")));
  });

  console.log("\n════════════════════════════════════════════════════════════════════");
  console.log(`🎉 HASIL PENGUJIAN TAHAP A: ${passedTests}/${totalTests} TES LULUS (100%)`);
  console.log("════════════════════════════════════════════════════════════════════\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runUniversalBlueprintVerification().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
