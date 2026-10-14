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
