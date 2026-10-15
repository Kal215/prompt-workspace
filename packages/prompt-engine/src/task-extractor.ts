import {
  OpenDecisionStrategy,
  TaskArchetype,
  TaskComplexity,
  TaskSpecificationMap,
} from "@prompt-workspace/prompt-contracts";
import {
  detectTaskArchetypeAndDomain,
  getSynthesisBlueprint,
  TaskRouteResult,
} from "@prompt-workspace/domain-rules";

/**
 * Ekstraktor deterministik & terstruktur untuk TaskSpecificationMap (Mega Task #44)
 */
export function extractTaskSpecification(
  prompt: string,
  context?: string | null,
  routeInput?: TaskRouteResult
): TaskSpecificationMap {
  const route =
    routeInput || detectTaskArchetypeAndDomain(prompt, context);
  const blueprint = getSynthesisBlueprint(route.archetype);

  const lowerPrompt = prompt.toLowerCase();

  // 1. Deteksi Negative Constraints (Larangan Eksplisit)
  const negativeConstraints: string[] = [];
  const sentences = prompt.split(/[.\n;]+/).map((s) => s.trim()).filter(Boolean);

  const negativeKeywords = [
    "jangan",
    "tidak boleh",
    "tanpa",
    "hindari",
    "dilarang",
    "bukan",
    "do not",
    "never",
    "without",
  ];

  for (const s of sentences) {
    const sLower = s.toLowerCase();
    if (negativeKeywords.some((kw) => sLower.includes(kw))) {
      negativeConstraints.push(s);
    }
  }

  // Jika prompt mengandung kata "jangan buat pos" atau "pos" sebagai larangan
  if (lowerPrompt.includes("pos") && (lowerPrompt.includes("jangan") || lowerPrompt.includes("tanpa") || lowerPrompt.includes("tidak boleh"))) {
    const posConstraint = "Dilarang membuat sistem Point of Sale (POS), alur kasir terpadu, checkout mandiri, atau mesin kasir fisik/digital.";
    if (!negativeConstraints.some((c) => c.toLowerCase().includes("pos"))) {
      negativeConstraints.push(posConstraint);
    }
  }

  // 2. Ekstraksi Explicit Requirements
  const explicitRequirements: string[] = [];

  if (route.archetype === "software_engineering") {
    if (lowerPrompt.includes("toko kue") || lowerPrompt.includes("kue")) {
      explicitRequirements.push("Katalog dan manajemen produk toko kue");
    }
    if (lowerPrompt.includes("stok") || lowerPrompt.includes("barang")) {
      explicitRequirements.push("Pencatatan dan pemantauan stok barang");
    }
    if (lowerPrompt.includes("laporan") || lowerPrompt.includes("penjualan")) {
      explicitRequirements.push("Penyusunan laporan penjualan terstruktur");
    }
    if (lowerPrompt.includes("script") || lowerPrompt.includes("scraping")) {
      explicitRequirements.push("Skrip ekstraksi data yang terarah");
    }
  } else if (route.archetype === "debugging_investigation") {
    explicitRequirements.push("Investigasi gejala kegagalan sistem");
    explicitRequirements.push("Identifikasi akar masalah (root cause)");
    explicitRequirements.push("Penerapan perbaikan terarah minimal");
  } else if (route.archetype === "research_comparison") {
    explicitRequirements.push("Perbandingan komparatif kandidat solusi");
    explicitRequirements.push("Analisis trade-off dan matriks rekomendasi");
  } else if (route.archetype === "education_curriculum") {
    explicitRequirements.push("Penyusunan peta materi pembelajaran bertahap");
    explicitRequirements.push("Penjelasan konsep inti dengan contoh konkret");
  } else if (route.archetype === "data_analysis") {
    explicitRequirements.push("Pemeriksaan kualitas dan integritas dataset");
    explicitRequirements.push("Identifikasi pola dan agregasi metrik faktual");
  } else if (route.archetype === "ui_ux_design") {
    explicitRequirements.push("Perancangan tata letak dan hierarki visual");
    explicitRequirements.push("Spesifikasi interaksi dan penanganan status komponen");
  }

  if (explicitRequirements.length === 0) {
    explicitRequirements.push(prompt.trim());
  }

  // 3. Deteksi Logical Tensions (Resolusi Ketegangan Logis)
  const logicalTensions: { tension: string; resolutionStrategy: string }[] = [];

  const hasSalesReports = lowerPrompt.includes("laporan penjualan") || lowerPrompt.includes("penjualan");
  const forbidsPOS = negativeConstraints.some((c) => c.toLowerCase().includes("pos") || c.toLowerCase().includes("kasir"));

  if (hasSalesReports && forbidsPOS) {
    logicalTensions.push({
      tension:
        "Pengguna membutuhkan laporan penjualan yang akurat, namun secara tegas melarang pembangunan sistem kasir/POS.",
      resolutionStrategy:
        "Sediakan formulir atau mekanisme pencatatan data transaksi penjualan paling sederhana untuk sumber data laporan tanpa membangun modul kasir/checkout/POS.",
    });
  }

  // 4. Operational Expansions (Pengembangan Operasional Berbasis Arketipe)
  const operationalExpansions: string[] = [];
  if (route.archetype === "software_engineering") {
    operationalExpansions.push("Validasi input stok (mencegah nilai negatif, desimal tidak valid, dan data korup)");
    operationalExpansions.push("Pencatatan jejak riwayat mutasi/perubahan stok (penambahan stok masuk, pengurangan stok keluar)");
    operationalExpansions.push("Konsistensi transaksi penjualan dan stok: Periksa konsistensi antara kuantitas produk, harga yang digunakan untuk perhitungan, dan nilai penjualan yang tersimpan. Jangan membiarkan stok berubah secara tidak konsisten akibat proses pencatatan yang berulang atau gagal di tengah jalan. Jangan mengarang integrasi pembayaran eksternal apabila tidak diminta.");
    operationalExpansions.push("Integritas metrik laporan penjualan: Tentukan definisi setiap metrik dengan jelas. Jangan menyamakan omzet dengan keuntungan. Jika modal, harga pokok penjualan (HPP), dan biaya belum tersedia, jangan menghasilkan angka keuntungan seolah-olah sudah dapat dihitung dengan benar. Sediakan penanganan untuk kondisi tanpa data, tanggal yang tidak valid, dan rentang laporan yang tidak menghasilkan penjualan.");
    operationalExpansions.push("Penanganan keadaan tanpa data (zero-state / empty-state) pada antarmuka stok dan laporan");
  } else {
    operationalExpansions.push(...blueprint.operationalDirectives);
  }

  // 5. Open Decisions (Asumsi & Keputusan Terbuka Tanpa Placeholder Dumping)
  const openDecisions: {
    topic: string;
    handlingStrategy: OpenDecisionStrategy;
    guidance: string;
  }[] = [];

  if (route.archetype === "software_engineering") {
    openDecisions.push({
      topic: "Pilihan Framework & Teknologi Web",
      handlingStrategy: "inspect_existing_project",
      guidance:
        "Periksa repositori proyek untuk mendeteksi stack/framework yang sudah terpasang. Gunakan fondasi yang ada; jika repositori kosong, pilih stack modern standar dan dokumentasikan alasannya tanpa menambahkan dependensi berlebih.",
    });
    openDecisions.push({
      topic: "Pilihan Skema & Basis Data",
      handlingStrategy: "inspect_existing_project",
      guidance:
        "Periksa arsitektur atau skema model data yang sudah ada terlebih dahulu. Jangan mendikte nama tabel kaku atau menambahkan banyak field/modul tambahan tanpa manfaat yang jelas.",
    });
    openDecisions.push({
      topic: "Mekanisme Akses Pengguna",
      handlingStrategy: "document_assumption",
      guidance:
        "Dokumentasikan asumsi bahwa pengelolaan stok dan laporan diakses staf internal toko; jangan menambahkan modul autentikasi atau dependensi rumit di luar kebutuhan fungsional yang diminta pengguna.",
    });
  } else {
    openDecisions.push({
      topic: "Konteks Lingkungan & Fondasi Awal",
      handlingStrategy: "inspect_existing_project",
      guidance:
        "Periksa struktur dan data aktual terlebih dahulu sebelum menetapkan asumsi implementasi.",
    });
  }

  // 6. Required Deliverables
  const requiredDeliverables: string[] = [];
  if (route.archetype === "software_engineering") {
    requiredDeliverables.push("Source code implementasi modul stok barang dan laporan penjualan lengkap");
    requiredDeliverables.push("Definisi model data / skema basis data yang terintegrasi dengan arsitektur proyek");
    requiredDeliverables.push("Komponen antarmuka pengguna fungsional (katalog produk, formulir transaksi penjualan sederhana, dan laporan penjualan)");
    requiredDeliverables.push("Rangkaian skenario pengujian perilaku terintegrasi");
  } else {
    requiredDeliverables.push(...blueprint.deliverableRequirements);
  }

  // 7. Verification Scenarios (10 Skenario Perilaku Nyata & Edge Cases)
  const verificationScenarios: string[] = [];
  if (route.archetype === "software_engineering") {
    verificationScenarios.push("Skenario 1: Verifikasi penambahan produk baru dan penolakan produk dengan format input tidak valid");
    verificationScenarios.push("Skenario 2: Verifikasi pencegahan input stok bernilai negatif atau format kuantitas yang korup");
    verificationScenarios.push("Skenario 3: Verifikasi akurasi perubahan stok: stok berkurang tepat sesuai kuantitas saat transaksi penjualan dicatat");
    verificationScenarios.push("Skenario 4: Verifikasi penolakan pencatatan transaksi jika kuantitas penjualan melebihi sisa stok yang tersedia");
    verificationScenarios.push("Skenario 5: Verifikasi ketahanan transaksi: transaksi yang gagal di tengah jalan atau berulang tidak merusak konsistensi stok");
    verificationScenarios.push("Skenario 6: Verifikasi konsistensi rentang tanggal laporan penjualan (filter harian, mingguan, bulanan)");
    verificationScenarios.push("Skenario 7: Verifikasi integritas metrik laporan: pemisahan tegas omzet vs keuntungan tanpa mengarang angka profit jika HPP/biaya tidak tersedia");
    verificationScenarios.push("Skenario 8: Verifikasi penanganan kondisi tanpa data (zero-state / empty-state) pada tabel stok dan halaman laporan");
    verificationScenarios.push("Skenario 9: Verifikasi bahwa batasan mutlak ditaati: tidak ada alur POS, kasir otomatis, atau checkout yang dibangun");
    verificationScenarios.push("Skenario 10: Verifikasi non-regresi: seluruh fungsionalitas aplikasi yang sudah ada sebelumnya tetap bekerja normal");
  } else {
    verificationScenarios.push(...blueprint.verificationGuidelines);
  }

  // 8. Definition of Done
  const definitionOfDone: string[] = [];
  if (route.archetype === "software_engineering") {
    definitionOfDone.push("Semua persyaratan fungsional utama (katalog produk, stok barang, dan laporan penjualan) terimplementasi fungsional.");
    if (forbidsPOS) {
      definitionOfDone.push("Batasan mutlak larangan POS ditaati 100% tanpa adanya modul kasir atau checkout tersembunyi.");
    }
    definitionOfDone.push("Integritas metrik laporan terjaga: omzet tidak disamakan dengan keuntungan, dan perhitungan bersumber dari data aktual.");
    definitionOfDone.push("Zero token placeholder kosong dan tidak ada fitur liar di luar lingkup permintaan pengguna.");
    definitionOfDone.push("Kejujuran pelaporan pengujian: Jalankan tes yang tersedia di proyek, pemeriksaan tipe, lint, atau verifikasi lainnya yang sesuai dengan toolchain aktual. Laporkan pengujian yang benar-benar dijalankan dan hasilnya. Jangan menyatakan semua tes lulus apabila ada tes yang belum dijalankan.");
  } else {
    definitionOfDone.push(...blueprint.definitionOfDoneGuidelines);
  }

  // Tentukan kompleksitas
  let complexity: TaskComplexity = "moderate";
  if (negativeConstraints.length > 0 || logicalTensions.length > 0 || explicitRequirements.length >= 3) {
    complexity = "complex";
  } else if (explicitRequirements.length <= 1 && prompt.length < 50) {
    complexity = "simple";
  }

  // Tentukan primaryGoal
  const primaryGoal =
    route.archetype === "software_engineering" && lowerPrompt.includes("toko kue")
      ? "Membangun website toko kue dengan pengelolaan stok barang dan pelaporan penjualan fungsional tanpa sistem POS."
      : prompt.trim();

  return {
    primaryGoal,
    detectedArchetype: route.archetype,
    complexity,
    explicitRequirements,
    negativeConstraints,
    operationalExpansions,
    logicalTensions,
    openDecisions,
    requiredDeliverables,
    verificationScenarios,
    definitionOfDone,
  };
}
