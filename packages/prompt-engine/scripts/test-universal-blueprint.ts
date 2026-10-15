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
  console.log("   5 Golden Benchmark Scenarios & Cross-Artifact Consistency Guard");
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

  test("Memuat pemisahan presisi HPP per Botol (Rp 9.500) vs HET (Rp 18.000)", () => {
    assert.ok(businessResult.blueprint.coreSpecification.includes("HPP"));
    assert.ok(businessResult.blueprint.coreSpecification.includes("Rp 9.500"));
  });

  test("Memuat larangan pencampuran rekening pribadi dan omzet usaha", () => {
    assert.ok(
      businessResult.blueprint.negativeConstraints.some((c) =>
        c.includes("OMZET KOTOR DENGAN LABA BERSIH")
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
  // 6. Cross-Artifact Consistency Guard Deep Validation
  // ────────────────────────────────────────────────────────────────
  console.log("\n🛡️ 6. Pengujian Mendalam Cross-Artifact Consistency Guard");

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
