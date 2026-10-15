// ──────────────────────────────────────────────────────────────────
// Unit Tests: @prompt-workspace/domain-rules
// Menguji kelengkapan metadata, perilaku fallback, dan integritas registry.
// ──────────────────────────────────────────────────────────────────

import {
  getDomainPack,
  listDomainPacks,
  resolveDomainId,
  DomainRulePack,
} from "../src/index.js";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${label}`);
  } else {
    failed++;
    errors.push(label);
    console.log(`  ❌ [FAIL] ${label}`);
  }
}

console.log(
  "═══════════════════════════════════════════════════════════════════"
);
console.log(
  "🧪 UNIT TESTS: @prompt-workspace/domain-rules (Domain Packs)"
);
console.log(
  "═══════════════════════════════════════════════════════════════════"
);

// ── Test 1: Registry completeness ──────────────────────────────
console.log("\n▶ [Test 1] Registry mengembalikan tepat 5 domain packs");
const allPacks = listDomainPacks();
assert(allPacks.length === 5, `listDomainPacks() mengembalikan 5 pack (actual: ${allPacks.length})`);

const expectedIds = ["general", "coding", "debugging", "academic_writing", "business_strategy"];
const actualIds = allPacks.map((p) => p.domainId).sort();
assert(
  JSON.stringify(actualIds) === JSON.stringify(expectedIds.sort()),
  `Domain IDs sesuai: ${actualIds.join(", ")}`
);

// ── Test 2: Metadata completeness per pack ─────────────────────
console.log("\n▶ [Test 2] Kelengkapan metadata seluruh domain packs");
for (const pack of allPacks) {
  assert(typeof pack.domainId === "string" && pack.domainId.length > 0, `${pack.domainId}: domainId tidak kosong`);
  assert(typeof pack.name === "string" && pack.name.length > 0, `${pack.domainId}: name tidak kosong`);
  assert(typeof pack.description === "string" && pack.description.length > 0, `${pack.domainId}: description tidak kosong`);
  assert(typeof pack.ruleVersion === "string" && /^\d+\.\d+\.\d+$/.test(pack.ruleVersion), `${pack.domainId}: ruleVersion SemVer valid (${pack.ruleVersion})`);
  assert(typeof pack.compatibleEngineVersion === "string" && pack.compatibleEngineVersion.length > 0, `${pack.domainId}: compatibleEngineVersion tidak kosong`);
  assert(Array.isArray(pack.focusCategories) && pack.focusCategories.length > 0, `${pack.domainId}: focusCategories berisi minimal 1 kategori`);
  assert(Array.isArray(pack.analyzerDirectives) && pack.analyzerDirectives.length > 0, `${pack.domainId}: analyzerDirectives berisi minimal 1 aturan`);
  assert(Array.isArray(pack.optimizerDirectives) && pack.optimizerDirectives.length > 0, `${pack.domainId}: optimizerDirectives berisi minimal 1 aturan`);
  assert(Array.isArray(pack.evaluationCriteriaNotes) && pack.evaluationCriteriaNotes.length > 0, `${pack.domainId}: evaluationCriteriaNotes berisi minimal 1 catatan`);
}

// ── Test 3: Directive content quality ──────────────────────────
console.log("\n▶ [Test 3] Isi directives tidak kosong per elemen");
for (const pack of allPacks) {
  for (const d of pack.analyzerDirectives) {
    assert(typeof d === "string" && d.trim().length > 10, `${pack.domainId}: analyzerDirective "${d.substring(0, 40)}..." cukup panjang`);
  }
  for (const d of pack.optimizerDirectives) {
    assert(typeof d === "string" && d.trim().length > 10, `${pack.domainId}: optimizerDirective "${d.substring(0, 40)}..." cukup panjang`);
  }
}

// ── Test 4: resolveDomainId fallback aman ──────────────────────
console.log("\n▶ [Test 4] resolveDomainId() fallback aman untuk input edge cases");
assert(resolveDomainId(null) === "general", "null → general");
assert(resolveDomainId(undefined) === "general", "undefined → general");
assert(resolveDomainId("") === "general", "string kosong → general");
assert(resolveDomainId("   ") === "general", "whitespace → general");
assert(resolveDomainId("unknown_domain_xyz") === "general", "string asing → general");
assert(resolveDomainId("CODING") === "coding", "CODING (uppercase) → coding");
assert(resolveDomainId("Debugging") === "debugging", "Debugging (mixed case) → debugging");

// ── Test 5: Alias backward-compatibility ───────────────────────
console.log("\n▶ [Test 5] Alias backward-compatible");
assert(resolveDomainId("software_development") === "coding", "software_development → coding");
assert(resolveDomainId("programming") === "coding", "programming → coding");
assert(resolveDomainId("debug") === "debugging", "debug → debugging");
assert(resolveDomainId("code_review") === "debugging", "code_review → debugging");
assert(resolveDomainId("writing") === "academic_writing", "writing → academic_writing");
assert(resolveDomainId("research") === "academic_writing", "research → academic_writing");
assert(resolveDomainId("business") === "business_strategy", "business → business_strategy");
assert(resolveDomainId("market_research") === "business_strategy", "market_research → business_strategy");
assert(resolveDomainId("product_planning") === "business_strategy", "product_planning → business_strategy");

// ── Test 6: getDomainPack returns correct pack ─────────────────
console.log("\n▶ [Test 6] getDomainPack() mengembalikan pack yang sesuai");
for (const id of expectedIds) {
  const pack = getDomainPack(id);
  assert(pack.domainId === id, `getDomainPack("${id}") → domainId === "${id}"`);
}

const fallbackPack = getDomainPack("nonexistent");
assert(fallbackPack.domainId === "general", 'getDomainPack("nonexistent") → fallback general');

const nullPack = getDomainPack(null);
assert(nullPack.domainId === "general", "getDomainPack(null) → fallback general");

const undefinedPack = getDomainPack();
assert(undefinedPack.domainId === "general", "getDomainPack() → fallback general");

// ── Test 7: focusCategories are valid taxonomy values ──────────
console.log("\n▶ [Test 7] focusCategories berisi nilai taksonomi yang valid");
const validCategories = new Set([
  "Tujuan", "Konteks", "Ambiguitas", "Kontradiksi",
  "Batasan", "Keluaran", "Keberhasilan", "Bukti",
]);
for (const pack of allPacks) {
  for (const cat of pack.focusCategories) {
    assert(validCategories.has(cat), `${pack.domainId}: focusCategory "${cat}" valid`);
  }
}

// ── Test 8: Task #44 Intelligent Task Router ───────────────────
console.log("\n▶ [Test 8] Auto-Detecting Task Router");
import {
  detectTaskArchetypeAndDomain,
  getSynthesisBlueprint,
  listSynthesisBlueprints,
} from "../src/index.js";

// a. Software Engineering
const routeSoftware = detectTaskArchetypeAndDomain(
  "Buat website toko kue dengan fitur stok barang dan laporan penjualan. Jangan buat POS."
);
assert(
  routeSoftware.archetype === "software_engineering",
  `Website toko kue -> software_engineering (actual: ${routeSoftware.archetype})`
);
assert(
  routeSoftware.domainId === "coding",
  `Website toko kue -> coding domain (actual: ${routeSoftware.domainId})`
);
assert(routeSoftware.signals.length > 0, "Website toko kue: signals detected");

// b. Debugging & Investigasi
const routeDebug = detectTaskArchetypeAndDomain(
  "Perbaiki bug login yang kadang gagal."
);
assert(
  routeDebug.archetype === "debugging_investigation",
  `Bug login -> debugging_investigation (actual: ${routeDebug.archetype})`
);
assert(
  routeDebug.domainId === "debugging",
  `Bug login -> debugging domain (actual: ${routeDebug.domainId})`
);

// c. Riset & Perbandingan
const routeResearch = detectTaskArchetypeAndDomain(
  "Bandingkan beberapa database yang cocok untuk aplikasi kecil."
);
assert(
  routeResearch.archetype === "research_comparison",
  `Bandingkan database -> research_comparison (actual: ${routeResearch.archetype})`
);
assert(
  routeResearch.domainId === "academic_writing",
  `Bandingkan database -> academic_writing domain (actual: ${routeResearch.domainId})`
);

// d. Pendidikan & Kurikulum
const routeEdu = detectTaskArchetypeAndDomain(
  "Ajari saya dasar machine learning dari nol."
);
assert(
  routeEdu.archetype === "education_curriculum",
  `Ajari machine learning -> education_curriculum (actual: ${routeEdu.archetype})`
);

// e. Analisis Data
const routeData = detectTaskArchetypeAndDomain(
  "Analisis data penjualan ini dan cari pola yang menarik."
);
assert(
  routeData.archetype === "data_analysis",
  `Analisis data penjualan -> data_analysis (actual: ${routeData.archetype})`
);

// f. Desain UI/UX
const routeDesign = detectTaskArchetypeAndDomain(
  "Buat dashboard modern untuk aplikasi manajemen proyek."
);
assert(
  routeDesign.archetype === "ui_ux_design",
  `Dashboard modern -> ui_ux_design (actual: ${routeDesign.archetype})`
);

// Fallback & explicit override
const routeExplicit = detectTaskArchetypeAndDomain(
  "Tolong analisa sistem ini",
  null,
  "software_development"
);
assert(
  routeExplicit.archetype === "software_engineering",
  `Explicit software_development -> software_engineering`
);

// ── Test 9: Task #44 Domain Synthesis Blueprints ───────────────
console.log("\n▶ [Test 9] Domain Synthesis Blueprints");
const allBlueprints = listSynthesisBlueprints();
assert(
  allBlueprints.length >= 8,
  `listSynthesisBlueprints() mengembalikan minimal 8 blueprints (actual: ${allBlueprints.length})`
);

const seBlueprint = getSynthesisBlueprint("software_engineering");
assert(
  seBlueprint.structuralSections.length === 11,
  `software_engineering memiliki 11 structuralSections (actual: ${seBlueprint.structuralSections.length})`
);
assert(
  seBlueprint.structuralSections.some((s) => s.includes("Pemeriksaan Proyek")),
  "SE Blueprint memiliki tahap pemeriksaan proyek aktual"
);
assert(
  seBlueprint.structuralSections.some((s) => s.includes("Batasan Mutlak")),
  "SE Blueprint memiliki Batasan Mutlak"
);
assert(
  seBlueprint.structuralSections.some((s) => s.includes("Definition of Done")),
  "SE Blueprint memiliki Definition of Done"
);

const debugBlueprint = getSynthesisBlueprint("debugging_investigation");
assert(
  debugBlueprint.structuralSections.length === 9,
  `debugging_investigation memiliki 9 structuralSections (actual: ${debugBlueprint.structuralSections.length})`
);

const researchBlueprint = getSynthesisBlueprint("research_comparison");
assert(
  researchBlueprint.structuralSections.length === 6,
  `research_comparison memiliki 6 structuralSections (actual: ${researchBlueprint.structuralSections.length})`
);

// ── Summary ────────────────────────────────────────────────────
console.log(
  "\n═══════════════════════════════════════════════════════════════════"
);
console.log(
  `🏁 HASIL AKHIR: ${passed} LULUS, ${failed} GAGAL (Total ${passed + failed} Asersi)`
);
if (errors.length > 0) {
  console.log(`\n❌ GAGAL:`);
  errors.forEach((e) => console.log(`  - ${e}`));
}
console.log(
  "═══════════════════════════════════════════════════════════════════"
);

process.exit(failed > 0 ? 1 : 0);
