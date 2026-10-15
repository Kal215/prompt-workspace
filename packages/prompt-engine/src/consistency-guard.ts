import {
  DiagramSpecification,
  ExecutionPhase,
} from "@prompt-workspace/prompt-contracts";
import { validateMermaidSyntaxDeep } from "./diagram-synthesizer.js";

export interface ConsistencyAuditReport {
  isConsistent: boolean;
  score: number;
  totalEntities: number;
  matchedEntities: string[];
  missingInText: string[];
  syntaxValid: boolean;
  syntaxErrors: string[];
  warnings: string[];
}

/**
 * Kamus Padanan Dwibahasa Teknis & Operasional (English <-> Indonesia)
 * Memastikan tidak terjadi false alarm jika diagram menggunakan istilah teknis Inggris
 * sementara fase eksekusi atau spesifikasi menggunakan istilah bahasa Indonesia (atau sebaliknya).
 */
export const BILINGUAL_DICTIONARY: Record<string, string[]> = {
  user: ["pengguna", "pemakai", "akun", "klien", "pelanggan"],
  account: ["akun", "rekening", "pengguna", "profil"],
  order: ["pesanan", "pemesanan", "order", "transaksi", "item"],
  product: ["produk", "barang", "item", "komoditas", "katalog"],
  payment: ["pembayaran", "bayar", "transaksi", "checkout", "kas"],
  gateway: ["gerbang", "gateway", "penyedia", "saluran", "kanal"],
  device: ["perangkat", "alat", "instrumen", "mesin", "node", "sensor"],
  sensor: ["sensor", "pendeteksi", "alat ukur", "telemetri"],
  telemetry: ["telemetri", "sinyal", "metrik", "aliran data", "stream"],
  node: ["node", "titik", "perangkat", "sensor"],
  patient: ["pasien", "klien", "pengunjung", "rekam medis"],
  doctor: ["dokter", "tenaga medis", "praktisi", "pemeriksa"],
  clinic: ["klinik", "rumah sakit", "fasilitas kesehatan", "poli"],
  prescription: ["resep", "obat", "dosis", "apotek"],
  medicine: ["obat", "farmasi", "ramuan", "dosis"],
  alert: ["peringatan", "sinyal bahaya", "anomali", "notifikasi", "alarm"],
  log: ["log", "catatan", "riwayat", "audit", "rekam"],
  factory: ["pabrik", "kilang", "manufaktur", "industri", "pengolahan"],
  mill: ["pabrik", "pengolahan", "kilang", "rebusan"],
  harvest: ["panen", "pemungutan hasil", "petik", "sortir"],
  fish: ["ikan", "lele", "biota", "kolam"],
  pond: ["kolam", "tambak", "waduk", "bioflok"],
  sterilization: ["sterilisasi", "rebusan", "sanitasi", "uap"],
  extraction: ["ekstraksi", "pengepresan", "pemisahan", "press"],
  clarification: ["klarifikasi", "pemurnian", "penyaringan", "separator"],
  storage: ["penyimpanan", "tangki", "gudang", "timbun"],
  experiment: ["eksperimen", "praktikum", "percobaan", "uji coba"],
  laboratory: ["laboratorium", "lab", "bengkel kerja", "k3"],
  protocol: ["protokol", "sop", "prosedur", "tata cara", "panduan"],
  safety: ["keselamatan", "keamanan", "k3", "proteksi"],
  hypothesis: ["hipotesis", "dugaan sementara", "asumsi ilmiah"],
  method: ["metode", "metodologi", "prosedur", "teknik"],
  staker: ["staker", "penstoking", "penyimpan dana", "investor"],
  staking: ["staking", "penyimpanan token", "simpanan", "deposito"],
  vault: ["brankas", "vault", "penyimpanan", "kontrak brankas"],
  pool: ["pool", "wadah dana", "kumpulan", "saldo"],
  token: ["token", "aset kripto", "koin"],
  penalty: ["penalti", "denda", "potongan", "early exit"],
  reward: ["imbalan", "hadiah", "bunga", "keuntungan"],
};

/**
 * Mencari seluruh padanan bilingual untuk suatu entitas (termasuk membongkar PascalCase)
 */
export function lookupBilingualEquivalents(term: string): string[] {
  if (!term || typeof term !== "string") return [];
  const equivalents: string[] = [];
  const lowerTerm = term.toLowerCase();

  // 1. Pecah kata berdasarkan PascalCase atau underscore (misal "UserAccount" -> ["user", "account"])
  const words = term
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const word of words) {
    equivalents.push(word);
    // Cari di kamus EN -> ID
    if (BILINGUAL_DICTIONARY[word]) {
      equivalents.push(...BILINGUAL_DICTIONARY[word]);
    }
    // Cari di kamus ID -> EN
    for (const [enKey, idValues] of Object.entries(BILINGUAL_DICTIONARY)) {
      if (idValues.includes(word)) {
        equivalents.push(enKey);
        equivalents.push(...idValues);
      }
    }
  }

  // Hapus duplikasi
  return Array.from(new Set(equivalents));
}

/**
 * Memvalidasi apakah kode Mermaid memiliki sintaks deklarasi header dan struktur kurung yang valid
 */
export function validateMermaidSyntaxHeader(code: string): {
  valid: boolean;
  error?: string;
} {
  const result = validateMermaidSyntaxDeep(code);
  return {
    valid: result.valid,
    error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
  };
}

/**
 * Cross-Artifact Consistency Guard: Memeriksa sinkronisasi dua arah (Bidirectional)
 * antara diagram Mermaid dan rincian fase eksekusi / spesifikasi dokumen.
 * Mencegah entitas fiktif (phantom entities) sekaligus mendeteksi model penting yang belum digambar.
 */
export function auditCrossArtifactConsistency(params: {
  diagrams: DiagramSpecification[];
  coreSpecification: string;
  executionPhases: ExecutionPhase[];
  additionalTextContext?: string;
}): ConsistencyAuditReport {
  const { diagrams, coreSpecification, executionPhases, additionalTextContext = "" } = params;

  // Gabungkan seluruh teks representatif dokumen
  const allTasksText = executionPhases.flatMap((p) => p.tasks).join(" ");
  const allDeliverablesText = executionPhases.flatMap((p) => p.deliverables).join(" ");
  const combinedCorpus = (
    coreSpecification +
    " " +
    allTasksText +
    " " +
    allDeliverablesText +
    " " +
    additionalTextContext
  ).toLowerCase();

  const matchedEntities: string[] = [];
  const missingInText: string[] = [];
  const syntaxErrors: string[] = [];
  const warnings: string[] = [];

  let totalEntities = 0;

  // Kumpulkan seluruh teks entitas diagram untuk audit arah kedua (Teks -> Diagram)
  const allDiagramEntitiesLower = new Set<string>();
  const allDiagramCodeLower = diagrams.map((d) => d.mermaidCode.toLowerCase()).join(" ");

  // 1. AUDIT ARAH PERTAMA: Diagram -> Teks (Memastikan setiap elemen visual berakar di spesifikasi)
  for (const diag of diagrams) {
    // 1a. Cek sintaks Mermaid mendalam
    const syntaxCheck = validateMermaidSyntaxHeader(diag.mermaidCode);
    if (!syntaxCheck.valid && syntaxCheck.error) {
      syntaxErrors.push(`[${diag.id}] ${syntaxCheck.error}`);
    }

    // 1b. Cek konsistensi entitas dengan dukungan Padanan Bilingual
    for (const entity of diag.entities) {
      totalEntities++;
      const normalizedEntity = entity.toLowerCase();
      allDiagramEntitiesLower.add(normalizedEntity);

      // Cek apakah entitas leksikal langsung ditemukan dalam teks
      const directMatch = combinedCorpus.includes(normalizedEntity);

      if (directMatch) {
        matchedEntities.push(entity);
      } else {
        // Coba periksa menggunakan kamus padanan dwibahasa (Bilingual Dictionary)
        const equivalents = lookupBilingualEquivalents(entity);
        const bilingualMatch = equivalents.some(
          (eq) => eq.length > 2 && combinedCorpus.includes(eq)
        );

        if (bilingualMatch) {
          matchedEntities.push(entity);
        } else {
          missingInText.push(entity);
        }
      }
    }
  }

  // 2. AUDIT ARAH KEDUA: Teks -> Diagram (Mendeteksi entitas model database / arsitektur di teks yang belum digambar)
  // Ekstrak kandidat nama model tabel/entitas dari spesifikasi dan fase eksekusi
  const modelMatches = Array.from(
    combinedCorpus.matchAll(/\b(?:tabel|model|skema|entitas)\s+([a-zA-Z0-9_]+)\b/gi)
  ).map((m) => m[1]);

  // Tambahkan juga kata yang diawali huruf kapital tebal jika ada di coreSpecification
  const specPascalMatches = Array.from(
    coreSpecification.matchAll(/\b([A-Z][a-zA-Z0-9_]{3,})\b/g)
  )
    .map((m) => m[1].toLowerCase())
    .filter((word) => !["spesifikasi", "arsitektur", "diagram", "daftar", "tahapan"].includes(word));

  const candidateModels = Array.from(new Set([...modelMatches, ...specPascalMatches]));

  const missingInDiagram: string[] = [];
  for (const model of candidateModels) {
    const isDrawn =
      allDiagramEntitiesLower.has(model) ||
      allDiagramCodeLower.includes(model) ||
      lookupBilingualEquivalents(model).some((eq) => allDiagramCodeLower.includes(eq));

    if (!isDrawn && model.length > 4) {
      missingInDiagram.push(model);
    }
  }

  if (missingInDiagram.length > 0) {
    warnings.push(
      `Peringatan Dua Arah (Bidirectional): Ditemukan ${missingInDiagram.length} istilah arsitektur di dokumen yang belum memiliki visualisasi eksplisit di diagram: ${missingInDiagram.slice(0, 5).join(", ")}`
    );
  }

  const syntaxValid = syntaxErrors.length === 0;
  if (!syntaxValid) {
    warnings.push(...syntaxErrors);
  }

  const matchRate = totalEntities > 0 ? (matchedEntities.length / totalEntities) * 100 : 100;

  if (missingInText.length > 0) {
    warnings.push(
      `Ditemukan ${missingInText.length} entitas diagram yang tidak dijelaskan dalam fase eksekusi atau spesifikasi inti: ${missingInText.join(", ")}`
    );
  }

  const isConsistent = syntaxValid && missingInText.length === 0;
  const score = Math.round(matchRate * 0.7 + (syntaxValid ? 30 : 0));

  return {
    isConsistent,
    score,
    totalEntities,
    matchedEntities,
    missingInText,
    syntaxValid,
    syntaxErrors,
    warnings,
  };
}
