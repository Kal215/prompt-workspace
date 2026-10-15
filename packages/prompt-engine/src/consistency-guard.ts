import {
  DiagramSpecification,
  ExecutionPhase,
} from "@prompt-workspace/prompt-contracts";
import {
  BILINGUAL_DICTIONARY,
  lookupBilingualEquivalents,
} from "@prompt-workspace/domain-rules";
import { validateMermaidSyntaxDeep } from "./diagram-synthesizer.js";

// Re-export for 100% backward compatibility
export { BILINGUAL_DICTIONARY, lookupBilingualEquivalents };

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
