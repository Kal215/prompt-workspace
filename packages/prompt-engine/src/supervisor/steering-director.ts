import {
  AuditDefectItem,
  PhaseAuditVerdict,
  SteeringDirective,
} from "@prompt-workspace/prompt-contracts";

export interface SteeringPromptBuildOptions {
  phaseIndex: number;
  phaseId: string;
  phaseTitle: string;
  retryCount: number;
  maxRetries: number;
  verdict: PhaseAuditVerdict;
  summaryDiagnosis: string;
  defects: AuditDefectItem[];
  negativeViolations: string[];
  missingDeliverables: string[];
  requiredActions: string[];
}

/**
 * generateSteeringPrompt: Merumuskan naskah instruksi perbaikan taktis terarah (Steering Directive)
 * untuk agen pelaksana (Cursor, Claude Code, Windsurf) berdasarkan temuan audit fisik.
 */
export function buildSteeringDirective(
  options: SteeringPromptBuildOptions
): SteeringDirective {
  const {
    phaseIndex,
    phaseId,
    phaseTitle,
    retryCount,
    maxRetries,
    verdict,
    summaryDiagnosis,
    defects,
    negativeViolations,
    missingDeliverables,
    requiredActions,
  } = options;

  const canRetry = retryCount < maxRetries;
  const humanEscalationRequired = !canRetry && verdict === "REJECTED_NEEDS_REPAIR";

  const criticalDefects = defects.filter((d) => d.severity === "CRITICAL");

  // Susun template prompt terarah
  const promptLines: string[] = [];

  if (verdict === "VERIFIED_PROCEED") {
    promptLines.push(
      `[PIEW SUPERVISOR: AUDIT MUTU LULUS 100%]`,
      `Fase aktif [${phaseId}: ${phaseTitle}] telah berhasil diverifikasi secara empiris.`,
      `Seluruh kriteria penerimaan, kompilasi build, dan pengujian unit dinyatakan lulus.`,
      `Silakan lanjutkan ke fase pekerjaan berikutnya sesuai rencana arsitektur.`
    );
  } else if (verdict === "PROJECT_COMPLETED") {
    promptLines.push(
      `[PIEW SUPERVISOR: SELURUH PROYEK TUNTAS & TERVERIFIKASI]`,
      `Selamat! Seluruh fase proyek telah diverifikasi 100% dan memenuhi seluruh Definition of Done.`,
      `Sistem siap diserahkan (handover) kepada pengguna tanpa cacat teknis tertunda.`
    );
  } else if (humanEscalationRequired) {
    promptLines.push(
      `================================================================================`,
      `[PIEW SUPERVISOR: SIRKUIT PENGHENTIAN OTOMATIS (CIRCUIT BREAKER TRIGGERED)]`,
      `STATUS: HALTED_MAX_RETRIES (Percobaan ${retryCount}/${maxRetries} Telah Habis)`,
      `================================================================================`,
      `Agen koding telah mencoba perbaikan sebanyak ${retryCount} kali namun masih mengalami galat berulang.`,
      `Untuk mencegah pemborosan token dan perulangan tanpa akhir, proses otomatis DIHENTIKAN.`,
      ``,
      `RINGKASAN AKAR MASALAH (ROOT CAUSE DIAGNOSIS):`,
      `• ${summaryDiagnosis}`,
      ``,
      `DAFTAR CACAT KRITIS YANG BELUM TERSELESAIKAN:`,
      ...defects.map(
        (d, idx) =>
          `  ${idx + 1}. [${d.category}] ${d.fileLocation ? `Berkas: ${d.fileLocation} | ` : ""}${d.failureMessage}`
      ),
      ``,
      `TINDAKAN DIPERLUKAN DARI PENGGUNA (HUMAN-IN-THE-LOOP):`,
      `Mohon periksa konfigurasi dependensi atau arsitektur dasar secara manual, kemudian jalankan perintah "piew override --resume" untuk melanjutkan.`
    );
  } else {
    // REJECTED_NEEDS_REPAIR (Aktif Revisi)
    promptLines.push(
      `================================================================================`,
      `[PIEW SUPERVISOR: DIREKTIF REVISI TEKNIS WAJIB (STEERING DIRECTIVE)]`,
      `FASE: ${phaseId} - ${phaseTitle} | REVISI KE: ${retryCount + 1} DARI MAKSIMAL ${maxRetries}`,
      `================================================================================`,
      ``,
      `1. DIAGNOSIS AUDIT MUTU:`,
      `   ${summaryDiagnosis}`,
      ``
    );

    if (criticalDefects.length > 0) {
      promptLines.push(`2. RINCIAN CACAT KRITIS BERKAS & KOMPILASI:`);
      for (const [idx, cd] of criticalDefects.entries()) {
        promptLines.push(
          `   [Cacat ${idx + 1}] Kategori: ${cd.category}`,
          `   • Lokasi: ${cd.fileLocation || "Tidak terlokalisir"}${cd.lineRange ? ` (${cd.lineRange})` : ""}`,
          `   • Deskripsi Galat: ${cd.failureMessage}`
        );
        if (cd.rawOutputSnippet) {
          promptLines.push(`   • Bukti Output: ${cd.rawOutputSnippet}`);
        }
      }
      promptLines.push(``);
    }

    if (missingDeliverables.length > 0) {
      promptLines.push(
        `3. DELIVERABLES WAJIB YANG HILANG/BELUM LENGKAP:`,
        ...missingDeliverables.map((md, idx) => `   • [Missing ${idx + 1}] ${md}`),
        ``
      );
    }

    if (negativeViolations.length > 0) {
      promptLines.push(
        `4. PELANGGARAN BATASAN NEGATIF MUTLAK (DILARANG PENGGUNA):`,
        ...negativeViolations.map((nv, idx) => `   • [Pelanggaran ${idx + 1}] ${nv}`),
        ``
      );
    }

    promptLines.push(`5. INSTRUKSI PERBAIKAN WAJIB (ACTION ITEMS):`);
    if (requiredActions.length > 0) {
      for (const [idx, action] of requiredActions.entries()) {
        promptLines.push(`   ${idx + 1}. ${action}`);
      }
    } else {
      promptLines.push(
        `   1. Perbaiki kesalahan sintaksis/tipe pada berkas yang disebutkan di atas.`,
        `   2. Jalankan perintah kompilasi (misal tsc / build) untuk memastikan Exit Code = 0.`,
        `   3. Pastikan tidak ada berkas penting yang terhapus secara sepihak.`
      );
    }

    promptLines.push(
      ``,
      `PENTING: Tuntaskan seluruh poin di atas sebelum mengajukan laporan fase kembali. PIEW Supervisor akan memverifikasi ulang hasil eksekusi kompilasi di terminal.`
    );
  }

  const fullSteeringPrompt = promptLines.join("\n");

  return {
    phaseIndex,
    phaseId,
    phaseTitle,
    retryCount,
    maxRetries,
    canRetry,
    verdict,
    summaryDiagnosis,
    criticalDefects,
    negativeViolations,
    requiredActions,
    fullSteeringPrompt,
    humanEscalationRequired,
  };
}
