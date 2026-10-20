import {
  AutonomousProjectSession,
  AutonomousVerificationConfig,
  AutonomousVerificationConfigSchema,
  PhaseAuditResult,
  PhaseAuditResultSchema,
  PhaseSubmissionInput,
  PhaseSubmissionInputSchema,
  EmpiricalAuditDetail,
  SteeringDirective,
  AuditDefectItem,
} from "@prompt-workspace/prompt-contracts";
import {
  getProjectSession,
  saveProjectSession,
} from "../supervisor.js";
import { inspectGitDiff } from "./git-diff-inspector.js";
import { executeVerificationCommand } from "./terminal-verifier.js";
import { inspectDockerHealth } from "./docker-health-checker.js";
import { evaluateNegativeConstraints } from "./negative-constraint-guard.js";
import { buildSteeringDirective } from "./steering-director.js";

export interface EmpiricalAuditExecutionResult {
  session: AutonomousProjectSession;
  auditResult: PhaseAuditResult;
  empiricalDetail: EmpiricalAuditDetail;
  steeringDirective: SteeringDirective;
}

/**
 * runAutonomousEmpiricalAudit: Menjalankan audit fisik komprehensif (Evidence over Claims)
 * menggabungkan Git inspection, eksekusi terminal, Docker health, dan batasan negatif.
 */
export function runAutonomousEmpiricalAudit(
  rawSubmission: PhaseSubmissionInput,
  rawConfig: AutonomousVerificationConfig
): EmpiricalAuditExecutionResult {
  const submission = PhaseSubmissionInputSchema.parse(rawSubmission);
  const config = AutonomousVerificationConfigSchema.parse(rawConfig);
  const startTime = Date.now();

  const session = getProjectSession(submission.sessionId);
  if (!session) {
    throw new Error(
      `[SUPERVISOR] Sesi proyek dengan ID "${submission.sessionId}" tidak ditemukan.`
    );
  }

  const currentPhase = session.phases[session.currentPhaseIndex];
  if (!currentPhase) {
    throw new Error(
      `[SUPERVISOR] Fase aktif indeks ${session.currentPhaseIndex} tidak valid pada sesi ${session.sessionId}.`
    );
  }

  const allDefects: AuditDefectItem[] = [];
  const requiredActions: string[] = [];

  // ──────────────────────────────────────────────
  // 1. ACT: Inspeksi Fisik Git
  // ──────────────────────────────────────────────
  const gitInspect = inspectGitDiff({
    workingDirectory: config.workingDirectory,
  });

  if (gitInspect.deletionsDetected) {
    allDefects.push({
      severity: "CRITICAL",
      category: "UNAUTHORIZED_FILE_DELETION",
      failureMessage: `Terdeteksi penghapusan berkas di git: ${gitInspect.deletedFiles.join(", ")}`,
      rawOutputSnippet: gitInspect.diffSummary,
    });
    requiredActions.push(
      `Pulihkan berkas yang terhapus (${gitInspect.deletedFiles.join(", ")}) atau berikan justifikasi arsitektur.`
    );
  }

  // ──────────────────────────────────────────────
  // 2. ACT: Eksekusi Kompilasi / Build Terminal
  // ──────────────────────────────────────────────
  const buildResult = executeVerificationCommand({
    workingDirectory: config.workingDirectory,
    command: config.buildCommand || "npm run build",
    timeoutMs: config.timeoutMs,
  });

  if (!buildResult.passed) {
    allDefects.push(...buildResult.defects);
    requiredActions.push(
      `Perbaiki galat kompilasi terminal pada perintah [${config.buildCommand}].`
    );
  }

  // ──────────────────────────────────────────────
  // 3. ACT: Eksekusi Test Suite (Jika Ada)
  // ──────────────────────────────────────────────
  let testResultExitCode: number | null = null;
  if (config.testCommand && config.testCommand.trim().length > 0) {
    const testExec = executeVerificationCommand({
      workingDirectory: config.workingDirectory,
      command: config.testCommand,
      timeoutMs: config.timeoutMs,
    });
    testResultExitCode = testExec.exitCode;
    if (!testExec.passed) {
      allDefects.push(...testExec.defects);
      requiredActions.push(
        `Perbaiki kegagalan pengujian otomatis pada perintah [${config.testCommand}].`
      );
    }
  }

  // ──────────────────────────────────────────────
  // 4. ACT: Docker Health Check (Jika Diaktifkan)
  // ──────────────────────────────────────────────
  const dockerResult = inspectDockerHealth({
    enabled: config.enableDockerCheck,
    containerNameOrId: config.containerName,
    expectedPorts: config.expectedPorts,
  });
  if (dockerResult.defects.length > 0) {
    allDefects.push(...dockerResult.defects);
  }

  // ──────────────────────────────────────────────
  // 5. ACT: Negative Constraints Guard
  // ──────────────────────────────────────────────
  const constraintCheck = evaluateNegativeConstraints({
    negativeConstraints: session.masterBlueprint.negativeConstraints || [],
    submissionText: submission.summaryOfWork,
    gitDiffSnippet: gitInspect.rawDiffSnippet,
    changedFiles: gitInspect.changedFiles,
  });
  if (!constraintCheck.passed) {
    allDefects.push(...constraintCheck.defects);
    for (const v of constraintCheck.violations) {
      requiredActions.push(`Hapus kode yang melanggar batasan larangan pengguna: ${v}`);
    }
  }

  // ──────────────────────────────────────────────
  // 6. OBSERVE: Evaluasi Deliverables Wajib
  // ──────────────────────────────────────────────
  const missingDeliverables: string[] = [];
  const deliveredNamesLower = submission.deliveredArtifacts.map((a) =>
    (a.name + " " + (a.summary || "")).toLowerCase()
  );
  const summaryLower = submission.summaryOfWork.toLowerCase();

  for (const req of currentPhase.requiredDeliverables) {
    const reqClean = req.toLowerCase().replace(/[^a-z0-9\s_\-\.]/gi, " ");
    const reqWords = reqClean
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["fase", "dan", "untuk", "pada", "yang", "file", "dokumen"].includes(w));

    const found =
      deliveredNamesLower.some((name) => reqWords.some((w) => name.includes(w))) ||
      reqWords.some((w) => summaryLower.includes(w));

    if (!found) {
      missingDeliverables.push(req);
      allDefects.push({
        severity: "MAJOR",
        category: "MISSING_DELIVERABLE",
        failureMessage: `Deliverable wajib belum dilaporkan: "${req}"`,
      });
      requiredActions.push(`Lengkapi deliverable yang belum ada: ${req}`);
    }
  }

  // ──────────────────────────────────────────────
  // 7. REFLECT: Kalkulasi Skor & Penentuan Keputusan
  // ──────────────────────────────────────────────
  const criticalDefects = allDefects.filter((d) => d.severity === "CRITICAL");
  const majorDefects = allDefects.filter((d) => d.severity === "MAJOR");

  let score = 100;
  score -= criticalDefects.length * 35;
  score -= majorDefects.length * 15;
  if (missingDeliverables.length > 0) {
    score -= missingDeliverables.length * 15;
  }
  score = Math.max(0, Math.min(100, score));

  const evidenceCheckPassed =
    buildResult.passed &&
    !gitInspect.deletionsDetected &&
    criticalDefects.length === 0;

  const currentAttempt = (currentPhase.attemptCount || 0) + 1;
  currentPhase.attemptCount = currentAttempt;

  let verdict: "VERIFIED_PROCEED" | "REJECTED_NEEDS_REPAIR" | "PROJECT_COMPLETED" =
    "REJECTED_NEEDS_REPAIR";

  const isFinalPhase = session.currentPhaseIndex === session.phases.length - 1;

  if (evidenceCheckPassed && score >= 80 && missingDeliverables.length === 0) {
    if (isFinalPhase) {
      verdict = "PROJECT_COMPLETED";
      currentPhase.status = "VERIFIED";
      session.overallStatus = "COMPLETED";
    } else {
      verdict = "VERIFIED_PROCEED";
      currentPhase.status = "VERIFIED";
      // Naikkan ke fase berikutnya
      session.currentPhaseIndex += 1;
      session.phases[session.currentPhaseIndex].status = "IN_PROGRESS";
    }
  } else {
    verdict = "REJECTED_NEEDS_REPAIR";
    currentPhase.status = "REJECTED_NEEDS_REPAIR";

    // Cek batas sirkuit retries
    if (currentAttempt >= config.maxRetriesPerPhase) {
      session.overallStatus = "HALTED_MAX_RETRIES";
    }
  }

  const durationMs = Date.now() - startTime;

  const empiricalDetail: EmpiricalAuditDetail = {
    gitDiffVerified: gitInspect.isGitRepo,
    gitChangedFiles: gitInspect.changedFiles,
    gitDeletionsDetected: gitInspect.deletionsDetected,
    gitSummary: gitInspect.diffSummary,
    terminalBuildExitCode: buildResult.exitCode,
    terminalTestExitCode: testResultExitCode,
    terminalOutputSnippet: buildResult.combinedSnippet,
    dockerStatus: dockerResult.status,
    dockerSummary: dockerResult.summary,
    negativeConstraintsViolations: constraintCheck.violations,
    defects: allDefects,
    auditDurationMs: durationMs,
  };

  const summaryDiagnosis =
    verdict === "VERIFIED_PROCEED" || verdict === "PROJECT_COMPLETED"
      ? `Audit fisik berhasil. Kompilasi build lulus (Exit code 0), git diff terverifikasi (${gitInspect.changedFiles.length} berkas), dan seluruh kriteria terpenuhi.`
      : `Audit fisik gagal dengan skor ${score}/100. Ditemukan ${criticalDefects.length} cacat kritis, ${majorDefects.length} cacat mayor, dan ${missingDeliverables.length} deliverable yang belum lengkap.`;

  currentPhase.lastAuditSummary = summaryDiagnosis;

  // Bangun Steering Directive
  const steeringDirective = buildSteeringDirective({
    phaseIndex: currentPhase.phaseIndex,
    phaseId: currentPhase.phaseId,
    phaseTitle: currentPhase.title,
    retryCount: currentAttempt,
    maxRetries: config.maxRetriesPerPhase,
    verdict,
    summaryDiagnosis,
    defects: allDefects,
    negativeViolations: constraintCheck.violations,
    missingDeliverables,
    requiredActions,
  });

  const auditResult: PhaseAuditResult = PhaseAuditResultSchema.parse({
    verdict,
    score,
    missingDeliverables,
    consistencyViolations: [],
    scopeCreepOrForbiddenViolations: constraintCheck.violations,
    evidenceCheckPassed,
    nextActionPrompt: steeringDirective.fullSteeringPrompt,
    phaseIndex: currentPhase.phaseIndex,
    auditTimestamp: new Date().toISOString(),
    independentExecutionResult: {
      executed: buildResult.executed,
      command: buildResult.command,
      exitCode: buildResult.exitCode,
      stdoutSnippet: buildResult.stdoutSnippet,
      stderrSnippet: buildResult.stderrSnippet,
      durationMs: buildResult.durationMs,
    },
  });

  // Catat riwayat audit
  session.auditHistory.push({
    phaseIndex: currentPhase.phaseIndex,
    attemptNumber: currentAttempt,
    submissionSummary: submission.summaryOfWork,
    auditResult,
    timestamp: new Date().toISOString(),
  });

  session.updatedAt = new Date().toISOString();
  saveProjectSession(session);

  return {
    session,
    auditResult,
    empiricalDetail,
    steeringDirective,
  };
}
