// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Bilingual Technical & Operational Dictionary
// Blueprint v1.0 Bagian 4.2 & ADR-003: English <-> Indonesian Domain Lexicon
// ──────────────────────────────────────────────────────────────────

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
  inventory: ["stok", "persediaan", "inventaris", "inventory", "gudang"],
  report: ["laporan", "report", "rekap", "analisis"],
  customer: ["pelanggan", "customer", "nasabah", "klien", "pembeli"],
  transaction: ["transaksi", "mutasi", "pencatatan", "invoice"],
  supplier: ["pemasok", "vendor", "supplier", "penyedia"],
  warehouse: ["gudang", "pergudangan", "storage", "depo"],
  contract: ["kontrak", "perjanjian", "smart contract", "akad"],
  database: ["basis data", "database", "penyimpanan", "db", "tabel"],
  server: ["peladen", "server", "backend", "komputer induk"],
};

/**
 * Mencari seluruh padanan bilingual untuk suatu entitas (termasuk membongkar PascalCase)
 */
export function lookupBilingualEquivalents(term: string): string[] {
  if (!term || typeof term !== "string") return [];
  const equivalents: string[] = [];

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
