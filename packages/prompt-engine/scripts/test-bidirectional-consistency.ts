import assert from "node:assert";
import {
  auditCrossArtifactConsistency,
  lookupBilingualEquivalents,
} from "../src/consistency-guard.js";
import { DiagramSpecification, ExecutionPhase } from "@prompt-workspace/prompt-contracts";

console.log("=== RUNNING TEST SUITE: BIDIRECTIONAL CONSISTENCY & BILINGUAL GUARD ===");

// 1. Uji Kamus Padanan Bilingual
console.log("-> 1. Pengujian Padanan Bilingual EN <-> ID...");
const userEquivs = lookupBilingualEquivalents("UserAccount");
console.log("   Padanan untuk UserAccount:", userEquivs);
assert(userEquivs.includes("pengguna") || userEquivs.includes("akun"), "Harus menemukan padanan akun/pengguna");

const deviceEquivs = lookupBilingualEquivalents("DeviceNode");
console.log("   Padanan untuk DeviceNode:", deviceEquivs);
assert(deviceEquivs.includes("perangkat") || deviceEquivs.includes("sensor"), "Harus menemukan padanan perangkat/sensor");

// 2. Uji Konsistensi Lintas Bahasa (Diagram EN, Teks ID)
console.log("-> 2. Pengujian Sinkronisasi Lintas Bahasa (Diagram EN, Teks ID)...");
const diagramsEN: DiagramSpecification[] = [
  {
    id: "diag-sample",
    type: "flowchart",
    title: "User Onboarding Flow",
    mermaidCode: `flowchart TD
    UserAccount[UserAccount: Registrasi Akun] --> PaymentGateway[PaymentGateway: Proses Pembayaran]`,
    entities: ["UserAccount", "PaymentGateway"],
  },
];

const phasesID: ExecutionPhase[] = [
  {
    phaseNumber: 0,
    name: "Registrasi dan Otentikasi",
    tasks: [
      "Implementasikan pendaftaran akun pengguna baru dengan verifikasi email.",
      "Integrasikan modul transaksi pembayaran dengan penyedia pembayaran eksternal.",
    ],
    deliverables: ["PENGGUNA.prisma", "PEMBAYARAN.ts"],
  },
];

const reportBilingual = auditCrossArtifactConsistency({
  diagrams: diagramsEN,
  coreSpecification: "Sistem mengelola akun pengguna dan verifikasi transaksi pembayaran secara aman.",
  executionPhases: phasesID,
});

console.log(`   Skor Konsistensi Bilingual: ${reportBilingual.score}% (Pass: ${reportBilingual.isConsistent})`);
assert(reportBilingual.isConsistent, "Harus lolos konsistensi meskipun diagram berbahasa Inggris dan teks berbahasa Indonesia");
assert.strictEqual(reportBilingual.missingInText.length, 0, "Tidak boleh ada entitas yang dianggap hilang");

// 3. Uji Deteksi Dua Arah (Bidirectional: Model Teks Tanpa Diagram)
console.log("-> 3. Pengujian Deteksi Dua Arah (Artefak Teks yang Hilang dari Diagram)...");
const reportBidirectional = auditCrossArtifactConsistency({
  diagrams: diagramsEN,
  coreSpecification: "Model database meliputi tabel Pengguna, Pembayaran, serta LogAuditPermanen.",
  executionPhases: [
    {
      phaseNumber: 1,
      name: "Modeling",
      tasks: ["Rancang skema tabel UserAccount, PaymentGateway, dan LogAuditPermanen."],
      deliverables: ["DATABASE.prisma"],
    },
  ],
});
console.log("   Peringatan Audit:", reportBidirectional.warnings);
assert(
  reportBidirectional.warnings.some((w) => w.toLowerCase().includes("logauditpermanen") || w.toLowerCase().includes("diagram")),
  "Harus memberikan peringatan jika ada model penting di teks yang belum digambarkan dalam diagram"
);

console.log("\n✅ SEMUA PENGUJIAN BIDIRECTIONAL & BILINGUAL GUARD LULUS 100%!");
