import { AuditDefectItem } from "@prompt-workspace/prompt-contracts";

export interface NegativeConstraintEvaluationResult {
  passed: boolean;
  violations: string[];
  defects: AuditDefectItem[];
}

export interface NegativeConstraintEvaluationOptions {
  negativeConstraints: string[];
  submissionText: string;
  gitDiffSnippet?: string;
  changedFiles?: string[];
}

/**
 * evaluateNegativeConstraints: Memastikan tidak ada batasan larangan pengguna
 * (negative constraints) yang dilanggar oleh kode atau laporan agen pelaksana.
 */
export function evaluateNegativeConstraints(
  options: NegativeConstraintEvaluationOptions
): NegativeConstraintEvaluationResult {
  const { negativeConstraints, submissionText, gitDiffSnippet = "", changedFiles = [] } = options;

  const violations: string[] = [];
  const defects: AuditDefectItem[] = [];

  if (!negativeConstraints || negativeConstraints.length === 0) {
    return { passed: true, violations: [], defects: [] };
  }

  const combinedContent = (
    submissionText +
    "\n" +
    gitDiffSnippet +
    "\n" +
    changedFiles.join(" ")
  ).toLowerCase();

  for (const constraint of negativeConstraints) {
    const constraintLower = constraint.toLowerCase().trim();
    if (constraintLower.length < 4) continue;

    // 1. Deteksi larangan penghapusan transaksi / rekaman data
    if (/menghapus\s+catatan|delete\s+transaction|hapus\s+transaksi|drop\s+table/i.test(constraintLower)) {
      if (
        /(?:menghapus|hapus|delete\s+from|drop\s+table)\s+(?:catatan|transaksi|transaction|record)/i.test(combinedContent)
      ) {
        const safeContext = /(?:tidak|bukan|hindari|tanpa|zero|prevent)\s+(?:menghapus|hapus|delete)/i;
        if (!safeContext.test(combinedContent)) {
          const msg = `Terdeteksi operasi penghapusan data transaksi yang dilarang pengguna: "${constraint}"`;
          violations.push(msg);
          defects.push({
            severity: "CRITICAL",
            category: "FORBIDDEN_DATA_MUTATION",
            failureMessage: msg,
          });
        }
      }
    }

    // 2. Deteksi data fiktif / fake mock data saat dilarang
    if (/dilarang\s+(?:data\s+palsu|mock|fake|dummy)|no\s+(?:mock|fake)\s+data/i.test(constraintLower)) {
      if (/(?:faker|mockdata|dummydata|sampledata|fake_data)\s*=/i.test(combinedContent)) {
        const msg = `Terdeteksi pembuatan mock/dummy data pada kode produksi: "${constraint}"`;
        violations.push(msg);
        defects.push({
          severity: "CRITICAL",
          category: "FORBIDDEN_MOCK_DATA",
          failureMessage: msg,
        });
      }
    }

    // 3. Deteksi larangan modul atau teknologi tertentu (misal: "Jangan gunakan jQuery" / "Dilarang membuat backend PHP")
    const techMatch = constraintLower.match(/(?:jangan|dilarang|tidak boleh|no)\s+(?:gunakan|pakai|buat|membuat)?\s*([a-z0-9_\-\.]{3,30})/i);
    if (techMatch && techMatch[1]) {
      const forbiddenTech = techMatch[1].trim();
      const forbiddenRegex = new RegExp(`\\b${forbiddenTech}\\b`, "i");

      // Cek apakah teknologi terlarang muncul di dependensi atau nama file yang diubah
      const isMentionedInFiles = changedFiles.some(f => forbiddenRegex.test(f));
      if (isMentionedInFiles) {
        const msg = `Terdeteksi penambahan modul/teknologi terlarang [${forbiddenTech}] pada berkas proyek: "${constraint}"`;
        violations.push(msg);
        defects.push({
          severity: "CRITICAL",
          category: "FORBIDDEN_TECHNOLOGY_USAGE",
          failureMessage: msg,
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    defects,
  };
}
