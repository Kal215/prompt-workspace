import {
  DiagramSpecification,
  ExecutionPhase,
} from "@prompt-workspace/prompt-contracts";

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
 * Memvalidasi apakah kode Mermaid memiliki sintaks deklarasi header yang valid
 */
export function validateMermaidSyntaxHeader(code: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = code.trim();
  const validHeaders = ["erDiagram", "flowchart", "graph", "gantt", "mindmap", "classDiagram", "sequenceDiagram"];

  const firstLine = trimmed.split("\n")[0].trim();
  const hasValidHeader = validHeaders.some((header) => firstLine.startsWith(header));

  if (!hasValidHeader) {
    return {
      valid: false,
      error: `Header diagram Mermaid tidak valid atau tidak dikenali: '${firstLine}'. Wajib diawali salah satu: ${validHeaders.join(", ")}`,
    };
  }

  // Cek keseimbangan kurung kurawal/siku dasar
  // Pada erDiagram, kardinalitas relasi seperti ||--o{ atau }|--|| menggunakan karakter kurung kurawal
  let sanitizedForBraceCheck = trimmed;
  if (firstLine.startsWith("erDiagram")) {
    sanitizedForBraceCheck = trimmed
      .split("\n")
      .filter((line) => !line.includes("--") && !line.includes(".."))
      .join("\n");
  }

  const openBraces = (sanitizedForBraceCheck.match(/\{/g) || []).length;
  const closeBraces = (sanitizedForBraceCheck.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return {
      valid: false,
      error: `Ketidakseimbangan kurung kurawal '{' (${openBraces}) vs '}' (${closeBraces}) pada diagram Mermaid.`,
    };
  }

  return { valid: true };
}

/**
 * Cross-Artifact Consistency Guard: Memeriksa sinkronisasi 100% antara entitas diagram Mermaid
 * dan rincian fase eksekusi / spesifikasi dokumen. Mencegah entitas fiktif / halusinasi.
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

  for (const diag of diagrams) {
    // 1. Cek sintaks Mermaid
    const syntaxCheck = validateMermaidSyntaxHeader(diag.mermaidCode);
    if (!syntaxCheck.valid && syntaxCheck.error) {
      syntaxErrors.push(`[${diag.id}] ${syntaxCheck.error}`);
    }

    // 2. Cek konsistensi entitas
    for (const entity of diag.entities) {
      totalEntities++;
      const normalizedEntity = entity.toLowerCase();

      // Cek apakah entitas atau kata dasarnya ditemukan dalam teks
      const foundInCorpus = combinedCorpus.includes(normalizedEntity);

      if (foundInCorpus) {
        matchedEntities.push(entity);
      } else {
        // Coba pecah PascalCase jika ada (misal "Pengguna" atau "Pesanan")
        const entityWords = entity
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .toLowerCase()
          .split(" ");
        const partialMatch = entityWords.some((word) => word.length > 3 && combinedCorpus.includes(word));

        if (partialMatch) {
          matchedEntities.push(entity);
        } else {
          missingInText.push(entity);
        }
      }
    }
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
  const score = Math.round((matchRate * 0.7) + (syntaxValid ? 30 : 0));

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
