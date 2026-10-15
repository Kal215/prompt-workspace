import {
  MasterPromptValidationResult,
  TaskSpecificationMap,
  SynthesisStylePreset,
} from "@prompt-workspace/prompt-contracts";

/**
 * Validator Deterministik untuk Master Prompt Synthesis (Mega Task #44 & #48)
 *
 * Memeriksa kualitas struktural, pelestarian intent, penegakan batasan negatif,
 * ketiadaan placeholder dumping, serta keberadaan tahapan operasional dan DoD.
 */
export function validateMasterPromptSynthesis(
  originalPrompt: string,
  optimizedPrompt: string,
  taskSpec: TaskSpecificationMap,
  repairPassesTriggered = 0,
  stylePreset: SynthesisStylePreset = "comprehensive_blueprint"
): MasterPromptValidationResult {
  const missingRequirements: string[] = [];
  const violatedNegativeConstraints: string[] = [];
  const failureReasons: string[] = [];

  const lowerOriginal = originalPrompt.toLowerCase();
  const lowerOptimized = optimizedPrompt.toLowerCase();

  // 1. Intent Preserved: Kata kunci inti dari prompt asli tetap hadir
  const originalWords = lowerOriginal
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["buat", "dengan", "fitur", "tolong", "bantu", "saya", "yang", "dan", "atau", "pada"].includes(w));

  const matchedKeywords = originalWords.filter((w) => lowerOptimized.includes(w));
  const intentPreserved =
    originalWords.length === 0 || matchedKeywords.length / originalWords.length >= 0.5;

  if (!intentPreserved) {
    failureReasons.push(
      "Intent asli tidak cukup terwakili dalam prompt hasil optimasi (kata kunci inti hilang)."
    );
  }

  // 2. Explicit Requirements Covered
  for (const req of taskSpec.explicitRequirements) {
    const reqWords = req
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["fitur", "sistem", "pembuatan", "pengelolaan"].includes(w));

    const matches = reqWords.filter((w) => lowerOptimized.includes(w));
    const isCovered = reqWords.length === 0 || matches.length >= 1;
    if (!isCovered) {
      missingRequirements.push(req);
    }
  }

  if (missingRequirements.length > 0) {
    failureReasons.push(
      `Terdapat persyaratan eksplisit yang belum terwakili: ${missingRequirements.join(", ")}`
    );
  }
  const explicitRequirementsCovered = missingRequirements.length === 0;

  // 3. Negative Constraints Enforced
  for (const constraint of taskSpec.negativeConstraints) {
    const lowerConstraint = constraint.toLowerCase();

    // Deteksi subjek larangan (misal: "pos", "kasir", "checkout", dll.)
    const subjectMatches = [];
    if (lowerConstraint.includes("pos")) subjectMatches.push("pos");
    if (lowerConstraint.includes("kasir")) subjectMatches.push("kasir");

    // Pastikan prompt menyebutkan larangan ini secara eksplisit
    const mentionsProhibition =
      lowerOptimized.includes("jangan") ||
      lowerOptimized.includes("dilarang") ||
      lowerOptimized.includes("tidak boleh") ||
      lowerOptimized.includes("tanpa") ||
      lowerOptimized.includes("hindari") ||
      lowerOptimized.includes("bukan");

    let isEnforced = true;
    for (const subj of subjectMatches) {
      const subjectMentioned = lowerOptimized.includes(subj);
      if (subjectMentioned && !mentionsProhibition) {
        isEnforced = false;
        violatedNegativeConstraints.push(constraint);
      } else if (!subjectMentioned && !mentionsProhibition) {
        // Jika larangan sama sekali tidak dimuat di batasan
        isEnforced = false;
        violatedNegativeConstraints.push(constraint);
      }
    }

    if (!isEnforced) {
      failureReasons.push(
        `Batasan mutlak/larangan "${constraint}" tidak ditegakkan secara eksplisit.`
      );
    }
  }
  const negativeConstraintsEnforced = violatedNegativeConstraints.length === 0;

  // 4. Not Shallow Rewrite
  // Untuk tugas moderate/complex, panjang teks minimal 600 karakter dan minimal 4-5 heading/tahapan
  const lines = optimizedPrompt.split("\n");
  const headingCount = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("#") ||
      /^\d+\.\s+/.test(trimmed) ||
      /^tahap\s+\w+/i.test(trimmed) ||
      /^fase\s+\w+/i.test(trimmed)
    );
  }).length;

  const isComplexOrModerate =
    taskSpec.complexity === "complex" || taskSpec.complexity === "moderate";
  let minLength = isComplexOrModerate ? 600 : 300;
  let minHeadings = isComplexOrModerate ? 4 : 2;

  if (stylePreset === "concise_tactical") {
    minLength = 350;
    minHeadings = 3;
  } else if (stylePreset === "conversational_expert") {
    minLength = 400;
    minHeadings = 3;
  }

  const notShallowRewrite =
    optimizedPrompt.trim().length >= minLength && headingCount >= minHeadings;

  if (!notShallowRewrite) {
    failureReasons.push(
      `Prompt hasil optimasi terlalu dangkal (panjang ${optimizedPrompt.trim().length} < ${minLength} atau heading ${headingCount} < ${minHeadings}).`
    );
  }

  // 5. Not Placeholder Dumping
  // Deteksi rasio placeholder [HURUF_BESAR_ATAU_UNDERSCORE]
  const placeholderRegex = /\[[A-Z0-9_]{3,}\]/g;
  const placeholdersFound = optimizedPrompt.match(placeholderRegex) || [];
  const notPlaceholderDumping = placeholdersFound.length <= 4;

  if (!notPlaceholderDumping) {
    failureReasons.push(
      `Terjadi placeholder dumping: ditemukan ${placeholdersFound.length} token placeholder kosong (${placeholdersFound.slice(0, 5).join(", ")}...).`
    );
  }

  // 6. Has Operational Stages
  const hasOperationalStages =
    lowerOptimized.includes("tahap") ||
    lowerOptimized.includes("langkah") ||
    lowerOptimized.includes("fase") ||
    lowerOptimized.includes("implementasi") ||
    lowerOptimized.includes("perancangan") ||
    lowerOptimized.includes("kriteria perbandingan") ||
    lowerOptimized.includes("kajian") ||
    lowerOptimized.includes("metodologi");

  if (!hasOperationalStages) {
    failureReasons.push("Tidak memuat tahapan operasional kerja yang konkret.");
  }

  // 7. Has Verification And DoD
  const hasVerification =
    lowerOptimized.includes("pengujian") ||
    lowerOptimized.includes("verifikasi") ||
    lowerOptimized.includes("skenario") ||
    lowerOptimized.includes("testing") ||
    lowerOptimized.includes("test") ||
    lowerOptimized.includes("pemeriksaan pemahaman") ||
    lowerOptimized.includes("checkpoint") ||
    lowerOptimized.includes("latihan") ||
    lowerOptimized.includes("kuis") ||
    lowerOptimized.includes("evaluasi");

  const hasDoD =
    lowerOptimized.includes("definition of done") ||
    lowerOptimized.includes("kriteria selesai") ||
    lowerOptimized.includes("kriteria kelengkapan") ||
    lowerOptimized.includes("kriteria penyelesaian") ||
    lowerOptimized.includes("kriteria kemajuan") ||
    lowerOptimized.includes("kriteria keberhasilan") ||
    lowerOptimized.includes("kriteria evaluasi");

  const hasVerificationAndDoD = hasVerification && hasDoD;

  if (!hasVerificationAndDoD) {
    failureReasons.push(
      "Tidak memuat skenario pengujian/verifikasi dan kriteria selesai (Definition of Done)."
    );
  }

  // 8. No Deceptive Tech Fabrication & Anti-Scope Creep
  const fakeUrlRegex = /https?:\/\/(?:www\.)?(?:contoh-palsu|fake-url|example-dummy-db)\.[a-z]+/i;
  const claimsUnrunTests =
    lowerOptimized.includes("saya telah menjalankan tes") ||
    lowerOptimized.includes("semua tes telah berhasil dilewati");

  // Deteksi Scope Creep & Over-Prescription untuk arketipe software_engineering
  const forbidsScopeCreepAuth =
    !lowerOriginal.includes("jwt") &&
    !lowerOriginal.includes("auth") &&
    !lowerOriginal.includes("login") &&
    lowerOptimized.includes("jwt");

  const forbidsScopeCreepChart =
    !lowerOriginal.includes("chart") &&
    !lowerOriginal.includes("grafik") &&
    lowerOptimized.includes("chart.js");

  const forbidsScopeCreepWarehouse =
    !lowerOriginal.includes("gudang") &&
    lowerOptimized.includes("lokasi_gudang");

  const hasHumanReviewerRequirement =
    lowerOptimized.includes("reviewer independen");

  const hasDummyReportDeliverable =
    lowerOptimized.includes("yang dihasilkan dari data dummy") ||
    lowerOptimized.includes("laporan contoh (pdf/csv)");

  const hasMetricIntegrity =
    !lowerOriginal.includes("laporan penjualan") ||
    (lowerOptimized.includes("omzet") &&
      lowerOptimized.includes("keuntungan") &&
      (lowerOptimized.includes("hpp") || lowerOptimized.includes("harga pokok")));

  const hasTransactionConsistency =
    taskSpec.detectedArchetype !== "software_engineering" ||
    lowerOptimized.includes("gagal di tengah jalan");

  const hasHonestTestingGuidance =
    taskSpec.detectedArchetype !== "software_engineering" ||
    lowerOptimized.includes("toolchain aktual") ||
    lowerOptimized.includes("benar-benar dijalankan") ||
    lowerOptimized.includes("kejujuran pelaporan");

  let noDeceptiveTechFabrication =
    !fakeUrlRegex.test(optimizedPrompt) &&
    !claimsUnrunTests &&
    !forbidsScopeCreepAuth &&
    !forbidsScopeCreepChart &&
    !forbidsScopeCreepWarehouse &&
    !hasHumanReviewerRequirement &&
    !hasDummyReportDeliverable &&
    hasMetricIntegrity &&
    hasTransactionConsistency &&
    hasHonestTestingGuidance;

  if (fakeUrlRegex.test(optimizedPrompt) || claimsUnrunTests) {
    failureReasons.push(
      "Mengandung kepastian teknis palsu (URL fabrikasi atau klaim eksekusi tes yang belum dilakukan)."
    );
  }
  if (forbidsScopeCreepAuth || forbidsScopeCreepChart || forbidsScopeCreepWarehouse) {
    failureReasons.push(
      "Pelanggaran noDeceptiveTechFabrication (anti-scope-creep / anti-unrequested-tech-injection): Terdeteksi pemaksaan teknologi/fitur (JWT, Chart.js, atau lokasi_gudang) yang tidak diminta pada originalPrompt."
    );
  }
  if (hasHumanReviewerRequirement) {
    failureReasons.push(
      "Pelanggaran noDeceptiveTechFabrication (anti-unrequested-tech-injection): Dilarang mensyaratkan 'reviewer independen' pada Definition of Done untuk AI target otonom."
    );
  }
  if (hasDummyReportDeliverable) {
    failureReasons.push(
      "Dilarang meminta laporan contoh dari data dummy di bagian Deliverables."
    );
  }
  if (!hasMetricIntegrity) {
    failureReasons.push(
      "Integritas metrik laporan belum terpenuhi (wajib membedakan omzet vs keuntungan dan penanganan tanpa data)."
    );
  }
  if (!hasTransactionConsistency) {
    failureReasons.push(
      "Konsistensi stok belum terjaga terhadap kegagalan transaksi di tengah jalan."
    );
  }
  if (!hasHonestTestingGuidance) {
    failureReasons.push(
      "Petunjuk kejujuran pelaporan pengujian berbasis toolchain aktual belum disertakan."
    );
  }

  const checks = {
    intentPreserved,
    explicitRequirementsCovered,
    negativeConstraintsEnforced,
    notShallowRewrite,
    notPlaceholderDumping,
    hasOperationalStages,
    hasVerificationAndDoD,
    noDeceptiveTechFabrication,
  };

  const allChecksPassed = Object.values(checks).every((c) => c === true);
  const passed =
    allChecksPassed &&
    missingRequirements.length === 0 &&
    violatedNegativeConstraints.length === 0;

  // Kalkulasi overallSynthesisScore (0-100)
  let baseScore = 60;
  if (checks.intentPreserved) baseScore += 5;
  if (checks.explicitRequirementsCovered) baseScore += 5;
  if (checks.negativeConstraintsEnforced) baseScore += 10;
  if (checks.notShallowRewrite) baseScore += 5;
  if (checks.notPlaceholderDumping) baseScore += 5;
  if (checks.hasOperationalStages) baseScore += 5;
  if (checks.hasVerificationAndDoD) baseScore += 5;
  if (checks.noDeceptiveTechFabrication) baseScore += 5;

  if (!checks.negativeConstraintsEnforced || !checks.intentPreserved) {
    baseScore = Math.min(baseScore, 45);
  }
  if (!checks.notShallowRewrite) {
    baseScore = Math.min(baseScore, 50);
  }

  const overallSynthesisScore = Math.max(0, Math.min(100, baseScore));

  return {
    passed,
    overallSynthesisScore,
    checks,
    missingRequirements,
    violatedNegativeConstraints,
    failureReasons,
    repairPassesTriggered,
  };
}
