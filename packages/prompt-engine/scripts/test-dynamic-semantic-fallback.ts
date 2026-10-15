import assert from "node:assert";
import {
  synthesizeUniversalBlueprint,
  detectDomainSubtopic,
  classifyUniversalDomain,
  extractDynamicEntitiesFromPrompt,
} from "../src/index.js";

console.log("=== RUNNING TEST SUITE: DYNAMIC SEMANTIC FALLBACK (NICHE TOPICS) ===");

// 1. Uji Ekstraksi Entitas Dinamis
console.log("-> 1. Pengujian Ekstraksi Entitas Dinamis dari Prompt Asing...");
const entitiesSawit = extractDynamicEntitiesFromPrompt(
  "SOP Pabrik Pengolahan Kelapa Sawit dari TBS menjadi CPO berkualitas tinggi",
  "business"
);
console.log("   Entitas Sawit:", entitiesSawit);
assert(entitiesSawit.length >= 3, "Harus menghasilkan minimal 3 entitas dinamis");
assert(
  entitiesSawit.some((e) => /sawit|kelapa|tbs|cpo/i.test(e)),
  "Entitas harus mengandung kata kunci industri sawit"
);

// 2. Skenario 1: IoT Telemetri Satelit Cuaca
console.log("-> 2. Skenario Niche 1: IoT Telemetry Satelit Cuaca...");
const promptIoT =
  "Arsitektur Sistem IoT Telemetri Satelit Cuaca untuk Pemantauan Badai Tropis";
const domainIoT = classifyUniversalDomain(undefined, promptIoT);
const subtopicIoT = detectDomainSubtopic(domainIoT, promptIoT);
assert.strictEqual(domainIoT, "software", "Domain harus terdeteksi software");
assert.strictEqual(
  subtopicIoT,
  "software_iot_telemetry",
  "Subtopik harus terdeteksi software_iot_telemetry"
);

const resIoT = synthesizeUniversalBlueprint({
  prompt: promptIoT,
  audienceLevel: "specialist",
  domain: domainIoT,
});
assert.strictEqual(resIoT.blueprint.domain, "software");
assert(resIoT.blueprint.diagrams.length >= 2, "Harus menghasilkan minimal 2 diagram");
assert(
  resIoT.blueprint.diagrams.some((d) => d.type === "erd" && d.mermaidCode.includes("SensorTelemetry")),
  "Diagram ERD harus memuat model SensorTelemetry"
);
assert(
  resIoT.blueprint.diagrams.some((d) => d.type === "flowchart" && d.mermaidCode.includes("DeteksiAmbangBatas")),
  "Diagram Flowchart harus memuat alur DeteksiAmbangBatas"
);
console.log(`   Skor Konsistensi IoT: ${resIoT.consistencyScore}% (Valid: ${resIoT.consistencyValid})`);
assert(resIoT.consistencyScore >= 80, `Skor konsistensi IoT harus >= 80% (aktual: ${resIoT.consistencyScore}%)`);

// 3. Skenario 2: Rekam Medis Klinik Gigi
console.log("-> 3. Skenario Niche 2: Rekam Medis Klinik Gigi...");
const promptKlinik =
  "Aplikasi Manajemen Rekam Medis Klinik Gigi dan Penjadwalan Pasien Dokter";
const domainKlinik = classifyUniversalDomain(undefined, promptKlinik);
const subtopicKlinik = detectDomainSubtopic(domainKlinik, promptKlinik);
assert.strictEqual(domainKlinik, "software", "Domain harus software");
assert.strictEqual(
  subtopicKlinik,
  "software_medical_clinic",
  "Subtopik harus software_medical_clinic"
);

const resKlinik = synthesizeUniversalBlueprint({
  prompt: promptKlinik,
  audienceLevel: "practitioner",
  domain: domainKlinik,
});
assert(
  resKlinik.blueprint.diagrams.some((d) => d.mermaidCode.includes("RekamMedis")),
  "Diagram harus memuat entitas RekamMedis"
);
console.log(`   Skor Konsistensi Klinik: ${resKlinik.consistencyScore}% (Valid: ${resKlinik.consistencyValid})`);
assert(resKlinik.consistencyScore >= 80, `Skor konsistensi klinik harus >= 80% (aktual: ${resKlinik.consistencyScore}%)`);

// 4. Skenario 3: SOP Pabrik Kelapa Sawit (TBS ke CPO)
console.log("-> 4. Skenario Niche 3: SOP Pabrik Kelapa Sawit (TBS ke CPO)...");
const promptSawit =
  "SOP Pabrik Pengolahan Kelapa Sawit dari TBS menjadi CPO berkualitas ekspor";
const domainSawit = classifyUniversalDomain(undefined, promptSawit);
const subtopicSawit = detectDomainSubtopic(domainSawit, promptSawit);
assert.strictEqual(domainSawit, "business", "Domain harus business");
assert.strictEqual(
  subtopicSawit,
  "business_manufacturing_industry",
  "Subtopik harus business_manufacturing_industry"
);

const resSawit = synthesizeUniversalBlueprint({
  prompt: promptSawit,
  audienceLevel: "specialist",
  domain: domainSawit,
});
assert(
  resSawit.blueprint.diagrams.some((d) => d.mermaidCode.includes("SterilisasiUapPanas")),
  "Diagram harus memuat alur SterilisasiUapPanas"
);
assert(
  resSawit.blueprint.diagrams.some((d) => d.mermaidCode.includes("PenyimpananTangkiCPO")),
  "Diagram harus memuat PenyimpananTangkiCPO"
);
console.log(`   Skor Konsistensi Sawit: ${resSawit.consistencyScore}% (Valid: ${resSawit.consistencyValid})`);
assert(resSawit.consistencyScore >= 80, `Skor konsistensi sawit harus >= 80% (aktual: ${resSawit.consistencyScore}%)`);

// 5. Skenario 4: Praktikum Jamur Tiram SMK
console.log("-> 5. Skenario Niche 4: Praktikum Budidaya Jamur Tiram SMK...");
const promptJamur =
  "Panduan Praktikum Budidaya Jamur Tiram dan Pembuatan Baglog untuk Siswa SMK Pertanian";
const domainJamur = classifyUniversalDomain(undefined, promptJamur);
const subtopicJamur = detectDomainSubtopic(domainJamur, promptJamur);
assert.strictEqual(domainJamur, "education", "Domain harus education");
assert.strictEqual(
  subtopicJamur,
  "education_practical_experiment",
  "Subtopik harus education_practical_experiment"
);

const resJamur = synthesizeUniversalBlueprint({
  prompt: promptJamur,
  audienceLevel: "general",
  domain: domainJamur,
});
assert(
  resJamur.blueprint.diagrams.some((d) => d.title.includes("SOP Prosedur Praktikum") || d.mermaidCode.includes("PersiapanAlatMedia")),
  "Diagram harus SOP praktikum"
);
console.log(`   Skor Konsistensi Jamur: ${resJamur.consistencyScore}% (Valid: ${resJamur.consistencyValid})`);
assert(resJamur.consistencyScore >= 80, `Skor konsistensi jamur harus >= 80% (aktual: ${resJamur.consistencyScore}%)`);

console.log("\n✅ SEMUA 4 SKENARIO NICHE / ASING LULUS DENGAN KONSISTENSI SEMPURNA!");
