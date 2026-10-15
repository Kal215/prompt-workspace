import assert from "node:assert";
import {
  sanitizeMermaidNodeId,
  sanitizeMermaidLabel,
  validateMermaidSyntaxDeep,
  applyMermaidLayoutGuard,
  synthesizeUniversalDiagrams,
} from "../src/diagram-synthesizer";

console.log("════════════════════════════════════════════════════════════════════");
console.log("🧪 TESTING MERMAID SANITIZATION & LAYOUT GUARD (LANGKAH 1)");
console.log("════════════════════════════════════════════════════════════════════\n");

// Test 1: sanitizeMermaidNodeId
console.log("1. Pengujian sanitizeMermaidNodeId (Pembersihan ID Node)...");
assert.strictEqual(
  sanitizeMermaidNodeId("Sistem AI (v2.0): Cek & Ricek -> Sukses/Gagal [99%]"),
  "SistemAIV20CekRicekSuksesGagal99"
);
assert.strictEqual(
  sanitizeMermaidNodeId("50% Diskon & PPN"),
  "Node_50DiskonPPN"
);
assert.strictEqual(
  sanitizeMermaidNodeId("user-account@test.com"),
  "UserAccountTestCom"
);
assert.strictEqual(
  sanitizeMermaidNodeId("   "),
  "Node_Entity"
);
console.log("  ✅ sanitizeMermaidNodeId lulus seluruh kasus ekstrem!\n");

// Test 2: sanitizeMermaidLabel
console.log("2. Pengujian sanitizeMermaidLabel (Pembersihan Label Visual)...");
const dirtyLabel = 'Toko Kue "Lezat" & Bakery; Status: [PRODUKSI] -> OK!';
const cleanLabel = sanitizeMermaidLabel(dirtyLabel, 40);
assert.strictEqual(cleanLabel.includes('"'), false, "Tidak boleh ada double quote");
assert.strictEqual(cleanLabel.includes("["), false, "Tidak boleh ada kurung siku buka");
assert.strictEqual(cleanLabel.includes("]"), false, "Tidak boleh ada kurung siku tutup");
assert.strictEqual(cleanLabel.includes(";"), false, "Tidak boleh ada titik koma");
assert.ok(cleanLabel.length <= 40, "Panjang label wajib <= 40 karakter");
console.log(`  Output label bersih: '${cleanLabel}'`);
console.log("  ✅ sanitizeMermaidLabel lulus seluruh kasus ekstrem!\n");

// Test 3: validateMermaidSyntaxDeep
console.log("3. Pengujian validateMermaidSyntaxDeep (Audit Sintaks Mendalam)...");
const validFlowchart = `flowchart TD
    Start([Mulai: Aliran Sirkuit]) --> Switch[Saklar Aman]
    Switch --> Done[Selesai]`;
const validCheck = validateMermaidSyntaxDeep(validFlowchart);
assert.strictEqual(validCheck.valid, true);
assert.strictEqual(validCheck.errors.length, 0);

const brokenBrackets = `flowchart TD
    Start[Mulai Aliran Sirkuit --> Switch[Saklar Aman]`;
const brokenCheck = validateMermaidSyntaxDeep(brokenBrackets);
assert.strictEqual(brokenCheck.valid, false, "Wajib mendeteksi kurung siku yang tidak seimbang");

const invalidHeader = `invalidDiagram TD
    A --> B`;
const invalidHeaderCheck = validateMermaidSyntaxDeep(invalidHeader);
assert.strictEqual(invalidHeaderCheck.valid, false, "Wajib mendeteksi header diagram tidak valid");
console.log("  ✅ validateMermaidSyntaxDeep berhasil mendeteksi sintaks valid dan rusak!\n");

// Test 4: applyMermaidLayoutGuard pada input ekstrem pengguna
console.log("4. Pengujian applyMermaidLayoutGuard pada diagram dinamis...");
const rawSpec = {
  id: "test-diag-extreme",
  type: "flowchart" as const,
  title: "Diagram Uji Ekstrem",
  description: "Uji coba karakter pengguna",
  mermaidCode: `flowchart TD
    Start([Mulai: Rangkaian "Super" Baterai (DC) & v2.0 [Eksperimen]]) --> Batt[Sumber: Baterai 9V; Status: OK; Margin: 100%]
    Batt -->|Cek: Validasi & Test; Hasil OK| Switch{Saklar: Pemutus "Arus" Listrik [Aman]}
    Switch --> Done([Selesai: Uji Coba Berhasil])`,
  entities: [
    "Mulai: Rangkaian Baterai",
    "Sumber: Baterai 9V",
    "Saklar: Pemutus Arus",
    "Selesai: Berhasil",
  ],
};

const guarded = applyMermaidLayoutGuard(rawSpec, { maxLabelLength: 35 });
const guardedSyntaxCheck = validateMermaidSyntaxDeep(guarded.mermaidCode);
assert.strictEqual(guardedSyntaxCheck.valid, true, "Kode setelah di-guard wajib 100% valid");
assert.strictEqual(guarded.mermaidCode.includes('"'), false, "Tidak boleh ada double quote unescaped");
console.log("  Kode Mermaid setelah Layout Guard:\n" + guarded.mermaidCode);
console.log("  ✅ applyMermaidLayoutGuard berhasil mengamankan diagram dari karakter perusak!\n");

// Test 5: End-to-End synthesizeUniversalDiagrams dengan input prompt bertanda baca aneh
console.log("5. Pengujian End-to-End synthesizeUniversalDiagrams dengan prompt aneh...");
const diagrams = synthesizeUniversalDiagrams({
  domain: "software",
  primaryGoal: 'Rancang sistem "POS Kasir" (v1.0) & Toko Kue [Harga: Rp 25.000; Status: "Active"]',
});
assert.ok(diagrams.length >= 2, "Wajib menghasilkan minimal 2 diagram");
for (const diag of diagrams) {
  const check = validateMermaidSyntaxDeep(diag.mermaidCode);
  assert.strictEqual(check.valid, true, `Diagram ${diag.id} wajib memiliki sintaks valid`);
}
console.log("  ✅ Seluruh diagram end-to-end terbukti 100% aman dan valid!\n");

console.log("════════════════════════════════════════════════════════════════════");
console.log("🎉 LANGKAH 1 LULUS 100%: SANITASI & LAYOUT GUARD BERHASIL TOTAL!");
console.log("════════════════════════════════════════════════════════════════════\n");
