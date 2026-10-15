import {
  Finding,
  TaskSpecificationMap,
} from "@prompt-workspace/prompt-contracts";
import {
  DomainSynthesisBlueprint,
  getSynthesisBlueprint,
} from "@prompt-workspace/domain-rules";

export interface MasterSynthesisOutput {
  masterPrompt: string;
  changes: string[];
  warnings: string[];
}

/**
 * Generator Deterministik Master Prompt Synthesis (Mega Task #44)
 * Menghasilkan Master Prompt komprehensif berstandar emas sesuai arketipe domain.
 */
export function synthesizeMasterPrompt(
  originalPrompt: string,
  taskSpec: TaskSpecificationMap,
  blueprintInput?: DomainSynthesisBlueprint,
  findings: Finding[] = []
): MasterSynthesisOutput {
  const blueprint =
    blueprintInput || getSynthesisBlueprint(taskSpec.detectedArchetype);

  const changes: string[] = [
    `Transformasi arsitektur tugas ke standar Master Prompt Synthesis (${blueprint.name})`,
    "Menetapkan peran profesional, persyaratan terukur, dan batasan operasional mutlak",
    "Menyuntikkan tahapan kerja adaptif (inspeksi fondasi repositori aktual) tanpa deceptive certainty",
    "Menyertakan skenario pengujian perilaku nyata dan kriteria Definition of Done",
  ];

  const warnings: string[] = [];

  if (taskSpec.negativeConstraints.length > 0) {
    changes.push(
      `Menegakkan batasan larangan mutlak: ${taskSpec.negativeConstraints.join(", ")}`
    );
  }
  if (taskSpec.logicalTensions.length > 0) {
    changes.push(
      `Menyelesaikan ketegangan desain antara kebutuhan pelaporan dan batasan non-POS`
    );
  }

  let promptText = "";

  switch (taskSpec.detectedArchetype) {
    case "software_engineering": {
      promptText = [
        `# MASTER PROMPT: PENGEMBANGAN SISTEM & APLIKASI PERANGKAT LUNAK`,
        ``,
        `## 1. Peran dan Tujuan`,
        `Bertindaklah sebagai Senior Fullstack Software Engineer & Systems Architect.`,
        `Tujuan utama: ${taskSpec.primaryGoal}`,
        `Bangun solusi perangkat lunak yang andal, aman, modular, dan siap digunakan sesuai kebutuhan operasional nyata.`,
        ``,
        `## 2. Persyaratan Utama`,
        ...taskSpec.explicitRequirements.map(
          (req, idx) =>
            `${idx + 1}. **${req}**: Implementasikan fungsionalitas ini secara menyeluruh, terukur, dan saling terintegrasi.`
        ),
        ``,
        `## 3. Batasan Mutlak`,
        ...(taskSpec.negativeConstraints.length > 0
          ? taskSpec.negativeConstraints.map(
              (nc, idx) =>
                `${idx + 1}. **Larangan Keras**: ${nc}. Dilarang membangun modul, alur, atau antarmuka kasir/POS yang melanggar batasan ini.`
            )
          : [
              `1. Dilarang menambah kompleksitas atau modul liar di luar spesifikasi fungsional yang diminta.`,
            ]),
        ...(taskSpec.logicalTensions.length > 0
          ? [
              ``,
              `**Resolusi Ketegangan Desain**:`,
              ...taskSpec.logicalTensions.map(
                (lt) =>
                  `- Kebutuhan: "${lt.tension}"\n  -> Solusi: ${lt.resolutionStrategy}`
              ),
            ]
          : []),
        ``,
        `## 4. Tahap Pertama: Pemeriksaan Proyek dan Perencanaan`,
        `1. **Inspeksi Lingkungan & Repositori Aktual**: Periksa struktur direktori, berkas konfigurasi dependensi (package.json/requirements), model basis data, dan modul yang sudah ada sebelum mulai menulis kode.`,
        `2. **Pemanfaatan Fondasi Existing**: Gunakan arsitektur, pola penamaan, dan library yang sudah tersedia. Dilarang merombak stack teknologi tanpa persetujuan eksplisit.`,
        `3. **Pengelolaan Keputusan Terbuka**:`,
        ...taskSpec.openDecisions.map(
          (od) =>
            `   - **${od.topic}**: ${od.guidance} (Strategi: ${od.handlingStrategy})`
        ),
        ``,
        `## 5. Tahap Perancangan Modul dan Data Inti`,
        `1. Definisikan model data atau skema basis data relasional yang bersih dengan relasi yang konsisten.`,
        `2. Terapkan validasi input ketat pada setiap mutasi data (pencegahan nilai negatif, desimal tidak valid, dan karakter terlarang).`,
        `3. Pastikan transaksi basis data memenuhi kriteria ACID saat memperbarui saldo stok atau mencatat transaksi.`,
        ``,
        `## 6. Tahap Mekanisme Pendukung dan Integrasi Antar-Fitur`,
        `1. ${
          taskSpec.logicalTensions.length > 0
            ? taskSpec.logicalTensions[0].resolutionStrategy
            : "Bangun alur data antar-modul yang kohesif dan terisolasi dengan rapi."
        }`,
        `2. Sediakan pencatatan jejak audit (audit trail/log) otomatis untuk setiap penambahan atau pengurangan stok barang.`,
        `3. Terapkan penanganan error (try-catch, validation errors, error boundaries) yang informatif pada setiap lapisan modul.`,
        ``,
        `## 7. Tahap Pelaporan dan Perhitungan Aktual`,
        `1. Bangun mekanisme pelaporan dinamis berdasarkan agregasi data transaksi aktual.`,
        `2. DILARANG KERAS menggunakan data statis/hardcoded atau angka mockup pada hasil perhitungan laporan.`,
        `3. Sediakan fitur penyaringan berdasarkan rentang tanggal (harian, mingguan, bulanan, kustom).`,
        `4. Pisahkan secara tegas perhitungan antara total omzet kotor (gross revenue) dan estimasi laba keuntungan (net profit).`,
        `5. Sediakan penanganan visual informatif untuk kondisi ketiadaan data transaksi (empty-state).`,
        ``,
        `## 8. Tahap Antarmuka dan Pengalaman Pengguna`,
        `1. Rancang antarmuka pengguna yang bersih, responsif, dan mudah dioperasikan di perangkat desktop maupun mobile.`,
        `2. Tampilkan indikator visual yang jelas untuk status stok (stok aman, menipis, habis).`,
        `3. Berikan umpan balik interaktif (loading indicator, konfirmasi tindakan, notifikasi sukses/gagal).`,
        ``,
        `## 9. Tahap Pengujian dan Verifikasi Perilaku`,
        `Verifikasi keandalan sistem dengan menguji minimal skenario perilaku konkret berikut:`,
        ...taskSpec.verificationScenarios.map(
          (sc, idx) => `${idx + 1}. ${sc}`
        ),
        ``,
        `## 10. Deliverables`,
        ...taskSpec.requiredDeliverables.map(
          (del, idx) => `${idx + 1}. ${del}`
        ),
        `- Catatan: Seluruh artefak harus berupa kode implementasi nyata dan fungsional, bukan pseudocode atau mockup statis.`,
        ``,
        `## 11. Definition of Done`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }

    case "debugging_investigation": {
      promptText = [
        `# MASTER PROMPT: INVESTIGASI AKAR MASALAH & PERBAIKAN BUG`,
        ``,
        `## 1. Peran dan Sasaran Investigasi`,
        `Bertindaklah sebagai Senior Debugging Specialist & Reliability Engineer.`,
        `Sasaran investigasi: ${taskSpec.primaryGoal}`,
        `Lakukan investigasi berbasis bukti untuk mengisolasi dan memperbaiki bug tanpa menimbulkan efek samping (regresi).`,
        ``,
        `## 2. Ruang Lingkup Masalah dan Gejala`,
        ...taskSpec.explicitRequirements.map(
          (req, idx) => `${idx + 1}. ${req}`
        ),
        ``,
        `## 3. Batasan Mutlak`,
        `1. Dilarang menebak akar penyebab tanpa bukti log eksekusi, jejak stack trace, atau reproduksi terverifikasi.`,
        `2. Dilarang merombak seluruh modul autentikasi atau dependensi utama secara membabi buta.`,
        ...(taskSpec.negativeConstraints.length > 0
          ? taskSpec.negativeConstraints.map((nc) => `- ${nc}`)
          : []),
        ``,
        `## 4. Tahap 1: Pemeriksaan Implementasi dan Penelusuran Jalur Eksekusi/Log`,
        `1. Periksa alur kode aktual pada rute/fungsi yang mengalami kegagalan.`,
        `2. Telusuri siklus hidup token/sesi, validasi payload, dan log error sistem pada saat kegagalan terjadi.`,
        ``,
        `## 5. Tahap 2: Reproduksi Masalah dan Isolasi Kondisi Pemicu`,
        `1. Buat skenario reproduksi terisolasi untuk mereplikasi bug secara konsisten.`,
        `2. Periksa kemungkinan kondisi pacu (race conditions), batas kedaluwarsa sesi (token expiry), input batas ekstrim, atau ketidaksesuaian lingkungan runtime.`,
        ``,
        `## 6. Tahap 3: Pembuktian Akar Penyebab (Root Cause Analysis)`,
        `1. Dokumentasikan bukti konkret mekanisme kegagalan yang ditemukan.`,
        `2. Konfirmasikan bahwa anomali yang ditemukan adalah akar masalah sesungguhnya, bukan sekadar gejala ikutan.`,
        ``,
        `## 7. Tahap 4: Perbaikan Terarah Minimal (Minimal Targeted Fix)`,
        `1. Terapkan perubahan kode paling minimal dan terfokus untuk menuntaskan akar masalah.`,
        `2. Hindari refactoring besar-besaran yang tidak terkait langsung dengan perbaikan bug.`,
        ``,
        `## 8. Tahap 5: Pengujian Regresi dan Verifikasi`,
        `1. Jalankan kembali skenario reproduksi: pastikan kegagalan tidak lagi terjadi.`,
        `2. Jalankan rangkaian pengujian otomatis pada alur kerja di sekitarnya untuk memastikan tidak ada regresi fungsi lain.`,
        ``,
        `## 9. Deliverables dan Definition of Done`,
        `### Deliverables:`,
        ...taskSpec.requiredDeliverables.map((del) => `- ${del}`),
        `### Definition of Done:`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }

    case "research_comparison": {
      promptText = [
        `# MASTER PROMPT: KAJIAN RISET & PERBANDINGAN TEKNIS`,
        ``,
        `## 1. Tujuan Kajian dan Konteks Penggunaan`,
        `Tujuan: ${taskSpec.primaryGoal}`,
        `Susun kajian komparatif berbasis fakta teknis objektif untuk membantu pengambilan keputusan yang tepat.`,
        ``,
        `## 2. Kriteria Perbandingan Terstruktur`,
        `Lakukan evaluasi komparatif berdasarkan dimensi kriteria berikut:`,
        `1. **Karakteristik & Arsitektur Data**: Model penyimpanan, dukungan query, konsistensi data.`,
        `2. **Kinerja & Efisiensi Sumber Daya**: Throughput, latensi pembacaan/penulisan, jejak memori pada skala kecil.`,
        `3. **Kompleksitas Operasional & Kemudahan Pemeliharaan**: Kemudahan setup lokal, overhead manajemen, backup, dan migrasi.`,
        `4. **Skalabilitas & Ekosistem**: Dukungan library/driver, komunitas, kesiapan eskalasi jika beban meningkat.`,
        `5. **Biaya, Lisensi & Kepatuhan**: Biaya operasional/infrastruktur dan model lisensi open-source vs berbayar.`,
        ``,
        `## 3. Batasan Kejujuran Epistemik`,
        `1. Dilarang mengarang angka benchmark atau estimasi biaya/harga tanpa dasar data atau rujukan resmi.`,
        `2. Pisahkan secara tegas antara fakta terverifikasi, karakteristik inheren, dan opini/asumsi subjektif.`,
        ``,
        `## 4. Analisis Kompromi (Trade-offs) per Kandidat`,
        `Analisis keunggulan dan kelemahan spesifik dari masing-masing kandidat dalam konteks aplikasi berskala kecil.`,
        ``,
        `## 5. Matriks Rekomendasi Berdasarkan Skenario Kebutuhan`,
        `Sajikan matriks pengambilan keputusan yang memetakan kandidat terbaik berdasarkan profil beban kerja (workload profile).`,
        ``,
        `## 6. Deliverables dan Kriteria Kelengkapan`,
        `### Deliverables:`,
        ...taskSpec.requiredDeliverables.map((del) => `- ${del}`),
        `### Definition of Done:`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }

    case "education_curriculum": {
      promptText = [
        `# MASTER PROMPT: PANDUAN PEMBELAJARAN & KURIKULUM BERTAHAP`,
        ``,
        `## 1. Tujuan Pembelajaran dan Pemetaan Tingkat Awal`,
        `Sasaran pembelajaran: ${taskSpec.primaryGoal}`,
        `Bangun materi pembelajaran yang terstruktur dari pemula tanpa lompatan konsep yang membingungkan.`,
        ``,
        `## 2. Peta Urutan Materi Bertahap`,
        `1. **Fase 1: Intuisi Dasar & Paradigma Inti** (Memahami mengapa dan apa konsep dasarnya).`,
        `2. **Fase 2: Komponen Utama & Alur Kerja Standar** (Mengenal elemen kunci dan proses kerja).`,
        `3. **Fase 3: Praktik Terbimbing & Studi Kasus Minimal** (Mencoba implementasi langsung langkah demi langkah).`,
        `4. **Fase 4: Evaluasi Hasil & Kesalahan Umum Pemula** (Memahami cara mengukur keberhasilan dan hal yang perlu dihindari).`,
        ``,
        `## 3. Penjelasan Konsep, Analogi dan Contoh Konkret`,
        `Gunakan analogi dunia nyata dan contoh visual/kode sederhana yang mudah dicerna sebelum masuk ke peristilahan teknis.`,
        ``,
        `## 4. Latihan Praktis dan Studi Kasus Kecil`,
        `Sediakan latihan aplikatif yang dapat langsung dicoba secara mandiri beserta petunjuk penyelesaian.`,
        ``,
        `## 5. Tahap Verifikasi Pemahaman (Checkpoints) dan Kesalahan Umum`,
        `Sediakan rangkaian skenario pemeriksaan pemahaman dan pertanyaan refleksi/kuis singkat di setiap fase untuk menguji pemahaman konsep sebelum melanjutkan.`,
        ``,
        `## 6. Kriteria Kemajuan Belajar dan Definition of Done`,
        `### Deliverables:`,
        ...taskSpec.requiredDeliverables.map((del) => `- ${del}`),
        `### Definition of Done:`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }

    case "data_analysis": {
      promptText = [
        `# MASTER PROMPT: ANALISIS DATA & IDENTIFIKASI POLA FAKTUAL`,
        ``,
        `## 1. Tujuan Analisis dan Pertanyaan Utama`,
        `Tujuan: ${taskSpec.primaryGoal}`,
        `Lakukan investigasi data yang sistematis untuk menjawab pertanyaan bisnis utama secara berbasis bukti.`,
        ``,
        `## 2. Tahap 1: Pemeriksaan Kualitas, Skema Kolom dan Kelengkapan Data`,
        `1. Audit struktur kolom, tipe data, dan kelengkapan baris (deteksi missing values, duplikasi, anomali).`,
        `2. Tentukan langkah pembersihan data yang proporsional tanpa memanipulasi distribusi alami data.`,
        ``,
        `## 3. Tahap 2: Pemilihan Metode Eksplorasi dan Agregasi yang Tepat`,
        `1. Tentukan formula dan metrik agregasi statistik yang relevan (sum, mean, median, kuartil, tren berkala).`,
        `2. Periksa distribusi metrik kunci untuk menghindari kesimpulan bias dari pencilan (outliers).`,
        ``,
        `## 4. Tahap 3: Identifikasi Pola Berbasis Bukti Data Nyata`,
        `1. Temukan pola penjualan, tren waktu, korelasi antar-kategori produk, dan perilaku pelanggan dari data faktual.`,
        `2. Sajikan angka dan perbandingan persentase aktual untuk mendukung setiap temuan.`,
        ``,
        `## 5. Batasan Metodologis`,
        `1. Dilarang mengarang angka ringkasan atau mensintesis data tanpa dasar dataset aktual.`,
        `2. Dilarang mengklaim korelasi sebagai hubungan sebab-akibat (kausalitas) tanpa pengujian kausal formal.`,
        ``,
        `## 6. Penyajian Temuan, Keterbatasan Data dan Rekomendasi`,
        `### Deliverables:`,
        ...taskSpec.requiredDeliverables.map((del) => `- ${del}`),
        `### Definition of Done:`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }

    case "ui_ux_design": {
      promptText = [
        `# MASTER PROMPT: DESAIN ANTARMUKA & PENGALAMAN PENGGUNA (UI/UX)`,
        ``,
        `## 1. Tujuan Produk dan Kebutuhan Pengguna`,
        `Sasaran desain: ${taskSpec.primaryGoal}`,
        `Rancang antarmuka visual yang modern, efisien, dan berpusat pada kenyamanan pengguna.`,
        ``,
        `## 2. Arsitektur dan Hierarki Informasi`,
        `1. Terjemahkan konsep "modern" menjadi prinsip terukur: kejelasan tipografi, hierarki visual yang tegas, spacing proporsional, dan tata letak modular yang bersih.`,
        `2. Tentukan alur navigasi utama dan organisasi modul informasi agar pengguna dapat menemukan data penting dalam 1-2 klik.`,
        ``,
        `## 3. Spesifikasi Komponen dan Interaksi Utama`,
        `1. Rancang komponen kartu metrik (KPI cards), bagan visualisasi data, tabel interaktif, dan kontrol filter.`,
        `2. Definisikan perilaku interaksi setiap komponen pada keadaan default, hover, active, dan focus.`,
        ``,
        `## 4. Penanganan Keadaan Sistem (System States)`,
        `Sediakan rancangan visual eksplisit untuk 4 keadaan sistem:`,
        `- **Default State**: Tampilan ketika data normal tersedia.`,
        `- **Empty State**: Tampilan informatif ketika belum ada proyek atau data tercatat (beserta call-to-action).`,
        `- **Loading State**: Indikator skeleton/spinner saat data sedang dimuat.`,
        `- **Error State**: Pesan visual yang ramah saat terjadi kegagalan pemuatan data beserta tombol coba lagi.`,
        ``,
        `## 5. Responsivitas dan Aksesibilitas`,
        `1. Pastikan tata letak beradaptasi mulus dari layar mobile, tablet, hingga desktop lebar.`,
        `2. Patuhi standar kontras WCAG AA untuk keterbacaan teks dan sediakan navigasi keyboard yang bersahabat.`,
        ``,
        `## 6. Kriteria Evaluasi Visual dan Fungsional (Definition of Done)`,
        `### Deliverables:`,
        ...taskSpec.requiredDeliverables.map((del) => `- ${del}`),
        `### Definition of Done:`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }

    default: {
      promptText = [
        `# MASTER PROMPT: EKSEKUSI TUGAS OPERASIONAL SISTEMATIS`,
        ``,
        `## 1. Peran dan Tujuan`,
        `Tujuan utama: ${taskSpec.primaryGoal}`,
        `Jalankan tugas operasional secara sistematis dengan standar kualitas tinggi dan kejelasan langkah kerja.`,
        ``,
        `## 2. Persyaratan Utama dan Batasan Mutlak`,
        `### Persyaratan:`,
        ...taskSpec.explicitRequirements.map((r, i) => `${i + 1}. ${r}`),
        `### Batasan Mutlak:`,
        ...(taskSpec.negativeConstraints.length > 0
          ? taskSpec.negativeConstraints.map((nc) => `- ${nc}`)
          : [`- Patuhi seluruh batasan operasional yang ditetapkan pengguna.`]),
        ``,
        `## 3. Tahap 1: Analisis Kebutuhan dan Konteks Awal`,
        `Periksa informasi, lingkungan, dan batasan sebelum memulai eksekusi.`,
        ``,
        `## 4. Tahap 2: Langkah Eksekusi Sistematis`,
        `Jalankan pengerjaan secara bertahap dan terukur sesuai spesifikasi kebutuhan.`,
        ``,
        `## 5. Tahap 3: Pengujian dan Verifikasi Hasil`,
        ...taskSpec.verificationScenarios.map((vs, i) => `${i + 1}. ${vs}`),
        ``,
        `## 6. Deliverables dan Definition of Done`,
        `### Deliverables:`,
        ...taskSpec.requiredDeliverables.map((del) => `- ${del}`),
        `### Definition of Done:`,
        ...taskSpec.definitionOfDone.map((dod) => `- [ ] ${dod}`),
      ].join("\n");
      break;
    }
  }

  return {
    masterPrompt: promptText,
    changes,
    warnings,
  };
}
