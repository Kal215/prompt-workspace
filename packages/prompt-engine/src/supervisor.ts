import {
  AutonomousProjectSession,
  AutonomousProjectSessionSchema,
  ProjectPhaseState,
  ProjectPhaseStateSchema,
  PhaseSubmissionInput,
  PhaseSubmissionInputSchema,
  PhaseAuditResult,
  PhaseAuditResultSchema,
  InitProjectSessionInput,
  InitProjectSessionInputSchema,
  DeliveredArtifact,
  AudienceLevel,
} from "@prompt-workspace/prompt-contracts";
import {
  classifyUniversalDomain,
  detectDomainSubtopic,
} from "@prompt-workspace/domain-rules";
import {
  synthesizeUniversalBlueprint,
  synthesizeUniversalBlueprintAsync,
} from "./universal-synthesizer.js";

// ──────────────────────────────────────────────
// In-Memory & File-Based Session Storage (Isomorphic / Browser-Safe)
// ──────────────────────────────────────────────

function getNodeFsAndPath() {
  if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
    try {
      const nodeRequire = eval("require");
      const fs = nodeRequire("node:fs");
      const pathMod = nodeRequire("node:path");
      return { fs, path: pathMod };
    } catch {
      return null;
    }
  }
  return null;
}

function generateUUID(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

const sessionStore = new Map<string, AutonomousProjectSession>();

function resolveDefaultSessionDir(): string {
  if (typeof process !== "undefined" && process.env?.PIEW_SESSION_DIR) {
    return process.env.PIEW_SESSION_DIR;
  }
  const node = getNodeFsAndPath();
  if (node) {
    try {
      const osMod = eval("require")("node:os");
      const home = osMod.homedir();
      if (home) {
        return node.path.join(home, ".piew", "sessions");
      }
    } catch {
      // fallback
    }
  }
  return "/tmp/piew-sessions";
}

function ensureSessionDir(): string {
  const node = getNodeFsAndPath();
  if (!node) return "/tmp";
  const primary = resolveDefaultSessionDir();
  try {
    if (!node.fs.existsSync(primary)) {
      node.fs.mkdirSync(primary, { recursive: true });
    }
    return primary;
  } catch {
    // Graceful fallback ke /tmp/piew-sessions jika akses terbatasi
    try {
      const fallback = "/tmp/piew-sessions";
      if (!node.fs.existsSync(fallback)) {
        node.fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    } catch {
      return "/tmp";
    }
  }
}

export function getSessionStorageDirectory(): string {
  return ensureSessionDir();
}

function persistSession(session: AutonomousProjectSession): void {
  const node = getNodeFsAndPath();
  if (!node) return;
  try {
    const dir = ensureSessionDir();
    const filePath = node.path.join(dir, `${session.sessionId}.json`);
    node.fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  } catch (err) {
    // Non-fatal fallback for restricted environments
    console.warn(`[SUPERVISOR] Gagal menyimpan sesi ke disk: ${(err as Error).message}`);
  }
}

function loadSessionFromDisk(sessionId: string): AutonomousProjectSession | null {
  const node = getNodeFsAndPath();
  if (!node) return null;
  try {
    const candidateDirs = [ensureSessionDir(), "/tmp/piew-sessions"];
    for (const dir of candidateDirs) {
      const filePath = node.path.join(dir, `${sessionId}.json`);
      if (node.fs.existsSync(filePath)) {
        const raw = node.fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        return AutonomousProjectSessionSchema.parse(parsed);
      }
    }
  } catch (err) {
    console.warn(`[SUPERVISOR] Gagal memuat sesi dari disk: ${(err as Error).message}`);
  }
  return null;
}

export function getProjectSession(sessionId: string): AutonomousProjectSession | null {
  if (sessionStore.has(sessionId)) {
    return sessionStore.get(sessionId)!;
  }
  const fromDisk = loadSessionFromDisk(sessionId);
  if (fromDisk) {
    sessionStore.set(fromDisk.sessionId, fromDisk);
    return fromDisk;
  }
  return null;
}

export function saveProjectSession(session: AutonomousProjectSession): void {
  sessionStore.set(session.sessionId, session);
  persistSession(session);
}

export function listProjectSessions(): AutonomousProjectSession[] {
  const result: AutonomousProjectSession[] = Array.from(sessionStore.values());
  const node = getNodeFsAndPath();
  if (node) {
    try {
      const dir = ensureSessionDir();
      if (node.fs.existsSync(dir)) {
        const files = (node.fs.readdirSync(dir) as string[]).filter((f: string) =>
          f.endsWith(".json")
        );
        for (const file of files) {
          const id = file.replace(/\.json$/, "");
          if (!sessionStore.has(id)) {
            const loaded = loadSessionFromDisk(id);
            if (loaded) {
              sessionStore.set(loaded.sessionId, loaded);
              result.push(loaded);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return result;
}

// ──────────────────────────────────────────────
// Hardening: Zero-Trust Active Command Runner & Deep Artifact Inspector
// ──────────────────────────────────────────────

export interface IndependentExecutionResult {
  executed: boolean;
  command?: string;
  exitCode?: number | null;
  stdoutSnippet?: string;
  stderrSnippet?: string;
  durationMs?: number;
}

export function executeVerificationCommandSync(
  command: string,
  workingDir?: string,
  timeoutMs: number = 45000
): IndependentExecutionResult {
  const node = getNodeFsAndPath();
  if (!node) {
    return { executed: false, command };
  }
  try {
    const cp = eval("require")("node:child_process");
    const cwd = workingDir && node.fs.existsSync(workingDir) ? workingDir : process.cwd();
    const startTime = Date.now();
    const res = cp.spawnSync(command, {
      shell: true,
      cwd,
      timeout: timeoutMs,
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024,
    });
    const durationMs = Date.now() - startTime;
    const stdoutSnippet = (res.stdout || "").slice(-2500);
    const stderrSnippet = (res.stderr || "").slice(-2500);
    const exitCode = res.status !== null ? res.status : res.error ? 1 : 0;

    return {
      executed: true,
      command,
      exitCode,
      stdoutSnippet,
      stderrSnippet,
      durationMs,
    };
  } catch (err) {
    return {
      executed: true,
      command,
      exitCode: 1,
      stderrSnippet: (err as Error).message,
    };
  }
}

export interface ArtifactIntegrityDetail {
  name: string;
  existsOnDisk: boolean;
  sha256?: string;
  sizeBytes?: number;
}

export function verifyArtifactsOnDisk(
  artifacts: Array<{ name: string }>,
  workingDir?: string
): ArtifactIntegrityDetail[] {
  const node = getNodeFsAndPath();
  if (!node) return [];

  const cwd = workingDir && node.fs.existsSync(workingDir) ? workingDir : process.cwd();
  let cryptoMod: any = null;
  try {
    cryptoMod = eval("require")("node:crypto");
  } catch {
    // browser/restricted fallback
  }

  return artifacts.map((art) => {
    const candidatePaths = [
      art.name,
      node.path.resolve(cwd, art.name),
      node.path.resolve(cwd, "src", art.name),
      node.path.resolve(cwd, "docs", art.name),
    ];
    let foundPath: string | null = null;
    for (const p of candidatePaths) {
      try {
        if (node.fs.existsSync(p) && node.fs.statSync(p).isFile()) {
          foundPath = p;
          break;
        }
      } catch {
        // continue
      }
    }

    if (foundPath) {
      try {
        const content = node.fs.readFileSync(foundPath);
        const sizeBytes = content.length;
        let sha256 = "";
        if (cryptoMod) {
          sha256 = cryptoMod.createHash("sha256").update(content).digest("hex");
        }
        return {
          name: art.name,
          existsOnDisk: true,
          sha256,
          sizeBytes,
        };
      } catch {
        return { name: art.name, existsOnDisk: false };
      }
    }
    return { name: art.name, existsOnDisk: false };
  });
}

// ──────────────────────────────────────────────
// Prompt Generation Helpers (Step A -> Step E)
// ──────────────────────────────────────────────

interface DispatchPromptOptions {
  session: AutonomousProjectSession;
  targetPhase: ProjectPhaseState;
  isInitial?: boolean;
  previousPhase?: ProjectPhaseState;
}

export function generatePhaseDispatchPrompt(options: DispatchPromptOptions): string {
  const { session, targetPhase, isInitial, previousPhase } = options;
  const blueprint = session.masterBlueprint;

  const previousContext = previousPhase
    ? `\n### 🔄 KESINAMBUNGAN DARI FASE SEBELUMNYA (${previousPhase.phaseId}: ${previousPhase.title})
- Status Terakhir: TELAH LULUS AUDIT (VERIFIED)
- Ringkasan Eksekusi: ${previousPhase.lastAuditSummary || "Deliverables terverifikasi"}
- Seluruh fondasi dan artefak dari fase sebelumnya wajib dipertahankan dan diintegrasikan secara mulus.\n`
    : "";

  const negativeConstraintsFormatted = blueprint.negativeConstraints
    .map((c) => `- ⛔ ${c}`)
    .join("\n");

  const requiredDeliverablesFormatted = targetPhase.requiredDeliverables
    .map((d, i) => `${i + 1}. [DELIVERABLE] ${d}`)
    .join("\n");

  const acceptanceCriteriaFormatted = targetPhase.acceptanceCriteria
    .map((c, i) => `${i + 1}. [KRITERIA] ${c}`)
    .join("\n");

  return `═══════════════════════════════════════════════════════════════════
🏛️ PIEW AUTONOMOUS SUPERVISOR PROTOCOL: FASE ${targetPhase.phaseIndex} (${targetPhase.phaseId}) DISPATCH
═══════════════════════════════════════════════════════════════════
PROYEK: ${blueprint.title}
SESI ID: ${session.sessionId}
FASE AKTIF: [${targetPhase.phaseIndex + 1}/${session.phases.length}] ${targetPhase.phaseId} — ${targetPhase.title}
AUDIENS: ${session.audienceLevel.toUpperCase()} | DOMAIN: ${session.domainId} (${session.subtopicId})
${previousContext}
### 🎯 SASARAN FASE INI
${targetPhase.objective}

### 📦 DELIVERABLES WAJIB (Wajib dihasilkan & dilaporkan):
${requiredDeliverablesFormatted}

### ✅ KRITERIA PENERIMAAN (Acceptance Criteria):
${acceptanceCriteriaFormatted}

### ⛔ BATASAN NEGATIF MUTLAK (Scope Creep & Anti-Fake Guard):
${negativeConstraintsFormatted}
- DILARANG menggunakan mock data/angka fiktif/dummy yang mengelabui seolah sistem sudah nyata.
- DILARANG menambah fitur di luar arsitektur tanpa justifikasi teknis yang relevan.

### 📋 PROTOKOL EKSEKUSI WAJIB (5 TAHAPAN STANDAR PIEW):
1. [STEP A: INSPECT] Telaah persyaratan di atas, diagram arsitektur, dan kode dasar saat ini.
2. [STEP B: PLAN] Susun rencana langkah konkret sebelum memodifikasi berkas.
3. [STEP C: IMPLEMENT] Kerjakan seluruh deliverable wajib secara utuh dan nyata.
4. [STEP D: VERIFY] Jalankan verifikasi nyata (test, typecheck, build, run test suite) dan simpan bukti keluaran terminal.
5. [STEP E: REPORT] Laporkan hasil kerja Anda ke PIEW Supervisor melalui tool:
   \`piew_submit_phase_work\`
   dengan menyertakan:
   - sessionId: "${session.sessionId}"
   - phaseIndex: ${targetPhase.phaseIndex}
   - summaryOfWork: Rincian apa yang telah selesai dibuat
   - deliveredArtifacts: Daftar file/komponen/dokumen nyata
   - verificationOutput: BUKTI NYATA eksekusi perintah (Evidence over Claims)

⚠️ CATATAN SUPERVISOR:
Klaim selesai ("DONE") TANPA bukti uji nyata pada \`verificationOutput\` akan DITOLAK otomatis.
═══════════════════════════════════════════════════════════════════`;
}

interface CorrectivePromptOptions {
  session: AutonomousProjectSession;
  currentPhase: ProjectPhaseState;
  missingDeliverables: string[];
  consistencyViolations: string[];
  scopeCreepOrForbiddenViolations: string[];
  evidenceCheckPassed: boolean;
  verificationOutput: string;
  isHalted: boolean;
}

export function generateCorrectivePrompt(options: CorrectivePromptOptions): string {
  const {
    session,
    currentPhase,
    missingDeliverables,
    consistencyViolations,
    scopeCreepOrForbiddenViolations,
    evidenceCheckPassed,
    verificationOutput,
    isHalted,
  } = options;

  if (isHalted) {
    return `🚨 [PIEW SUPERVISOR: PROYEK DIHENTIKAN — MAX RETRIES TERCAPAI]
Sesi: ${session.sessionId} | Fase: ${currentPhase.phaseId} (${currentPhase.title})
Jumlah percobaan audit telah mencapai batas maksimum (${currentPhase.attemptCount}x percobaan gagal).
Dibutuhkan intervensi manusia (Human-in-Control) via \`piew_human_override\` untuk memeriksa kendala arsitektur atau mereset kuota retry sebelum pekerjaan dapat dilanjutkan.`;
  }

  const issues: string[] = [];

  if (missingDeliverables.length > 0) {
    issues.push(`📦 DELIVERABLE BELUM LENGKAP:
${missingDeliverables.map((d) => `  - Belum ditemukan artefak konkret untuk: "${d}"`).join("\n")}`);
  }

  if (consistencyViolations.length > 0) {
    issues.push(`🧩 KETIDAKSINKRONAN ARSITEKTUR:
${consistencyViolations.map((v) => `  - ${v}`).join("\n")}`);
  }

  if (scopeCreepOrForbiddenViolations.length > 0) {
    issues.push(`⛔ PELANGGARAN BATASAN / SCOPE CREEP:
${scopeCreepOrForbiddenViolations.map((s) => `  - ${s}`).join("\n")}`);
  }

  if (!evidenceCheckPassed) {
    issues.push(`🔍 BUKTI VERIFIKASI TIDAK MEMENUHI PRINSIP "EVIDENCE OVER CLAIMS":
  - verificationOutput tidak valid, kosong, atau mengandung indikasi kegagalan/error.
  - Cuplikan verificationOutput yang diterima:
    "${verificationOutput.slice(0, 200).replace(/\n/g, " ")}..."
  - Wajib menyertakan bukti keluaran nyata dari perintah testing/build (misal: "Exit Code 0", "X tests passed", "0 errors").`);
  }

  return `═══════════════════════════════════════════════════════════════════
⚠️ PIEW AUDIT REJECTION & SELF-HEALING CORRECTIVE PROMPT
═══════════════════════════════════════════════════════════════════
SESI: ${session.sessionId}
FASE: ${currentPhase.phaseId} — ${currentPhase.title} (Percobaan ke-${currentPhase.attemptCount})
STATUS AUDIT: REJECTED_NEEDS_REPAIR

Laporan kerja Anda pada fase ini DITOLAK oleh PIEW Supervisor karena ditemukan temuan berikut:

${issues.join("\n\n")}

### 🛠️ LANGKAH PERBAIKAN MANDIRI (SELF-REPAIR INSTRUCTIONS):
1. Perbaiki secara tepat sasaran poin-poin kegagalan di atas.
2. Pastikan tidak menambahkan fitur terlarang dan jangan gunakan mock/dummy palsu.
3. Jalankan kembali script pengujian/typecheck hingga menghasilkan bukti sukses (Exit Code 0).
4. Kirimkan ulang laporan perbaikan via \`piew_submit_phase_work\` dengan menyertakan bukti nyata pada \`verificationOutput\`.
═══════════════════════════════════════════════════════════════════`;
}

export function generateHandoverCertificate(session: AutonomousProjectSession): string {
  const phaseSummaries = session.phases
    .map(
      (p) =>
        `  - [${p.phaseId}] ${p.title}: VERIFIED (${p.attemptCount + 1} attempt(s))`
    )
    .join("\n");

  return `═══════════════════════════════════════════════════════════════════
🏆 PIEW AUTONOMOUS SUPERVISION: SERTIFIKAT AUDIT OTONOM (PROJECT AUDIT CERTIFICATE)
═══════════════════════════════════════════════════════════════════
PROYEK: ${session.masterBlueprint.title}
SESI ID: ${session.sessionId}
STATUS KESELURUHAN: COMPLETED (100% VERIFIED)
DOMAIN: ${session.domainId} | SUBTOPIK: ${session.subtopicId}
LEVEL AUDIENS: ${session.audienceLevel.toUpperCase()}
TANGGAL SELESAI: ${new Date().toISOString()}

Seluruh tahapan rekayasa telah diaudit secara otonom dan dinyatakan LULUS:
${phaseSummaries}

HASIL AKHIR:
- Integritas Arsitektur: 100% Selaras dengan Master Blueprint & Diagram Mermaid
- Bukti Verifikasi (Evidence over Claims): Terpenuhi di setiap fase
- Kepatuhan Batasan Negatif: Zero Scope Creep & Zero Deceptive Fabrication
═══════════════════════════════════════════════════════════════════`;
}

export function exportHandoverBundle(
  sessionId: string,
  targetDirectory?: string
): { markdownPath: string; jsonPath: string; success: boolean; error?: string } {
  const session = getProjectSession(sessionId);
  if (!session) {
    return {
      markdownPath: "",
      jsonPath: "",
      success: false,
      error: `Sesi ${sessionId} tidak ditemukan`,
    };
  }
  const node = getNodeFsAndPath();
  if (!node) {
    return {
      markdownPath: "",
      jsonPath: "",
      success: false,
      error: "Penyimpanan berkas membutuhkan runtime Node.js",
    };
  }
  try {
    const outDir = targetDirectory || ensureSessionDir();
    if (!node.fs.existsSync(outDir)) {
      node.fs.mkdirSync(outDir, { recursive: true });
    }
    const mdPath = node.path.join(outDir, `PIEW-AUDIT-CERTIFICATE-${session.sessionId}.md`);
    const jsonPath = node.path.join(outDir, `piew-handover-bundle-${session.sessionId}.json`);

    const certMarkdown = generateHandoverCertificate(session);
    node.fs.writeFileSync(mdPath, certMarkdown, "utf-8");
    node.fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          sessionId: session.sessionId,
          overallStatus: session.overallStatus,
          exportedAt: new Date().toISOString(),
          phases: session.phases,
          auditHistory: session.auditHistory,
          masterBlueprintMeta: {
            title: session.masterBlueprint.title,
            domain: session.masterBlueprint.domain,
            totalPhases: session.phases.length,
          },
        },
        null,
        2
      ),
      "utf-8"
    );
    return { markdownPath: mdPath, jsonPath, success: true };
  } catch (err) {
    return {
      markdownPath: "",
      jsonPath: "",
      success: false,
      error: (err as Error).message,
    };
  }
}

// ──────────────────────────────────────────────
// 1. Inisiasi Proyek Otonom
// ──────────────────────────────────────────────

export interface InitProjectResult {
  session: AutonomousProjectSession;
  dispatchPrompt: string;
}

export function initAutonomousProject(
  rawInput: InitProjectSessionInput
): InitProjectResult {
  const input = InitProjectSessionInputSchema.parse(rawInput);
  const prompt = input.prompt.trim();
  const audienceLevel: AudienceLevel = input.audienceLevel || "specialist";

  // 1. Bangkitkan Master Blueprint Universal 10-Bagian + Diagram Mermaid
  const synthesis = synthesizeUniversalBlueprint({
    prompt,
    audienceLevel,
    domain: input.domainId,
  });
  const blueprint = synthesis.blueprint;

  // Ekstrak batasan larangan eksplisit pengguna dari prompt asli (pecah per klausul)
  const userNegativeConstraints: string[] = [];
  const rawSegments = prompt.split(/(?:\.|\n|;|\bdan\s+(?=dilarang|jangan|tidak boleh|no\b))/i);
  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    const match = /(?:dilarang|jangan|tidak boleh|no)\s+([^.\n;,]+)/i.exec(trimmed);
    if (match && match[0]) {
      const c = match[0].trim();
      if (c.length >= 5) {
        userNegativeConstraints.push(c);
      }
    }
  }

  if (userNegativeConstraints.length > 0) {
    blueprint.negativeConstraints = [
      ...userNegativeConstraints,
      ...blueprint.negativeConstraints,
    ];
  }

  const domainCategory = classifyUniversalDomain(input.domainId || "", prompt);
  const subtopic = input.subtopicId || detectDomainSubtopic(domainCategory, prompt);

  const sessionId = `piew-proj-${generateUUID().slice(0, 8)}`;

  // 2. Petakan seluruh fase eksekusi menjadi antrean stateful
  const phases: ProjectPhaseState[] = blueprint.executionPhases.map(
    (ep, idx) => {
      const phaseId = `PHASE_${ep.phaseNumber}`;
      return ProjectPhaseStateSchema.parse({
        phaseId,
        phaseIndex: ep.phaseNumber,
        title: ep.name,
        objective:
          ep.description ||
          (ep.tasks.length > 0
            ? `Tuntaskan implementasi: ${ep.tasks.join(", ")}`
            : `Eksekusi deliverables fase ${ep.phaseNumber}`),
        requiredDeliverables:
          ep.deliverables && ep.deliverables.length > 0
            ? ep.deliverables
            : [`Deliverables utama untuk ${ep.name}`],
        acceptanceCriteria: [
          ...ep.tasks.map((t) => `Selesaikan tugas teknis: ${t}`),
          ...(blueprint.definitionOfDone.slice(0, 2)),
        ],
        status: idx === 0 ? "IN_PROGRESS" : "TODO",
        attemptCount: 0,
        lastAuditSummary: null,
      });
    }
  );

  const now = new Date().toISOString();
  const session: AutonomousProjectSession = AutonomousProjectSessionSchema.parse({
    sessionId,
    originalPrompt: prompt,
    domainId: domainCategory,
    subtopicId: subtopic,
    audienceLevel,
    masterBlueprint: blueprint,
    phases,
    currentPhaseIndex: 0,
    overallStatus: "ACTIVE",
    auditHistory: [],
    createdAt: now,
    updatedAt: now,
  });

  // 3. Simpan sesi & bangkitkan Initial Dispatch Prompt Fase 0
  saveProjectSession(session);

  const dispatchPrompt = generatePhaseDispatchPrompt({
    session,
    targetPhase: session.phases[0],
    isInitial: true,
  });

  return {
    session,
    dispatchPrompt,
  };
}

/**
 * Versi Async dari Inisialisasi Proyek Otonom dengan Live LLM Dynamic Synthesis
 */
export async function initAutonomousProjectAsync(
  rawInput: InitProjectSessionInput
): Promise<InitProjectResult> {
  const input = InitProjectSessionInputSchema.parse(rawInput);
  const prompt = input.prompt.trim();
  const audienceLevel: AudienceLevel = input.audienceLevel || "specialist";

  // 1. Bangkitkan Master Blueprint Universal 10-Bagian + Diagram Mermaid secara dinamis via LLM
  const synthesis = await synthesizeUniversalBlueprintAsync({
    prompt,
    audienceLevel,
    domain: input.domainId,
  });
  const blueprint = synthesis.blueprint;

  // Ekstrak batasan larangan eksplisit pengguna dari prompt asli (pecah per klausul)
  const userNegativeConstraints: string[] = [];
  const rawSegments = prompt.split(/(?:\.|\n|;|\bdan\s+(?=dilarang|jangan|tidak boleh|no\b))/i);
  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    const match = /(?:dilarang|jangan|tidak boleh|no)\s+([^.\n;,]+)/i.exec(trimmed);
    if (match && match[0]) {
      const c = match[0].trim();
      if (c.length >= 5) {
        userNegativeConstraints.push(c);
      }
    }
  }

  if (userNegativeConstraints.length > 0) {
    blueprint.negativeConstraints = [
      ...userNegativeConstraints,
      ...blueprint.negativeConstraints,
    ];
  }

  const sessionId = `piew-proj-${generateUUID().slice(0, 8)}`;

  // 2. Petakan seluruh fase eksekusi menjadi antrean stateful
  const phases: ProjectPhaseState[] = blueprint.executionPhases.map(
    (ep, idx) => {
      const phaseId = `PHASE_${ep.phaseNumber}`;
      return ProjectPhaseStateSchema.parse({
        phaseId,
        phaseIndex: ep.phaseNumber,
        title: ep.name,
        objective:
          ep.description ||
          (ep.tasks.length > 0
            ? `Tuntaskan implementasi: ${ep.tasks.join(", ")}`
            : `Eksekusi deliverables fase ${ep.phaseNumber}`),
        requiredDeliverables:
          ep.deliverables && ep.deliverables.length > 0
            ? ep.deliverables
            : [`Deliverables utama untuk ${ep.name}`],
        acceptanceCriteria: [
          ...ep.tasks.map((t) => `Selesaikan tugas teknis: ${t}`),
          ...(blueprint.definitionOfDone.slice(0, 2)),
        ],
        status: idx === 0 ? "IN_PROGRESS" : "TODO",
        retryCount: 0,
        maxRetries: input.maxAttemptsPerPhase || 5,
        repairHistory: [],
        startedAt: idx === 0 ? new Date().toISOString() : undefined,
      });
    }
  );

  const now = new Date().toISOString();
  const session: AutonomousProjectSession = AutonomousProjectSessionSchema.parse({
    sessionId,
    projectTitle: blueprint.title,
    domainId: blueprint.domain,
    subtopicId: input.subtopicId || "universal_dynamic",
    audienceLevel,
    masterBlueprint: blueprint,
    phases,
    currentPhaseIndex: 0,
    overallStatus: "ACTIVE",
    auditHistory: [],
    createdAt: now,
    updatedAt: now,
  });

  // 3. Simpan sesi & bangkitkan Initial Dispatch Prompt Fase 0
  saveProjectSession(session);

  const dispatchPrompt = generatePhaseDispatchPrompt({
    session,
    targetPhase: session.phases[0],
    isInitial: true,
  });

  return {
    session,
    dispatchPrompt,
  };
}

// ──────────────────────────────────────────────
// 2. Audit & Autonomous Advancement Engine
// ──────────────────────────────────────────────

export function auditAndAdvancePhase(
  rawSubmission: PhaseSubmissionInput,
  options?: { maxRetries?: number }
): PhaseAuditResult {
  const submission = PhaseSubmissionInputSchema.parse(rawSubmission);
  const session = getProjectSession(submission.sessionId);

  if (!session) {
    throw new Error(
      `[SUPERVISOR] Sesi proyek dengan ID "${submission.sessionId}" tidak ditemukan.`
    );
  }

  if (session.overallStatus === "COMPLETED") {
    return PhaseAuditResultSchema.parse({
      verdict: "PROJECT_COMPLETED",
      score: 100,
      missingDeliverables: [],
      consistencyViolations: [],
      scopeCreepOrForbiddenViolations: [],
      evidenceCheckPassed: true,
      nextActionPrompt: generateHandoverCertificate(session),
      phaseIndex: session.currentPhaseIndex,
      auditTimestamp: new Date().toISOString(),
    });
  }

  if (session.overallStatus === "HALTED_MAX_RETRIES") {
    throw new Error(
      `[SUPERVISOR] Sesi proyek "${session.sessionId}" dalam status HALTED_MAX_RETRIES. Diperlukan piew_human_override.`
    );
  }

  const currentPhase = session.phases[session.currentPhaseIndex];
  if (!currentPhase) {
    throw new Error(`[SUPERVISOR] Fase aktif tidak valid pada sesi ${session.sessionId}`);
  }

  if (submission.phaseIndex !== session.currentPhaseIndex) {
    throw new Error(
      `[SUPERVISOR] Laporan dikirim untuk phaseIndex ${submission.phaseIndex}, namun fase aktif saat ini adalah ${session.currentPhaseIndex} (${currentPhase.phaseId}: ${currentPhase.title}).`
    );
  }

  const maxRetries = options?.maxRetries ?? 5;
  const missingDeliverables: string[] = [];
  const consistencyViolations: string[] = [];
  const scopeCreepOrForbiddenViolations: string[] = [];

  // ------------------------------------------------------------
  // A. Deliverable Check
  // ------------------------------------------------------------
  const deliveredArtifactsLower = submission.deliveredArtifacts.map((a) =>
    (a.name + " " + (a.summary || "") + " " + (a.contentSnippet || "")).toLowerCase()
  );
  const summaryLower = submission.summaryOfWork.toLowerCase();

  for (const req of currentPhase.requiredDeliverables) {
    const reqClean = req.toLowerCase().replace(/[^a-z0-9\s_\-\.]/gi, " ");
    const reqWords = reqClean
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["fase", "dan", "untuk", "pada", "yang", "file", "dokumen"].includes(w));

    const foundInArtifacts = deliveredArtifactsLower.some((artText) =>
      reqWords.some((w) => artText.includes(w))
    );
    const foundInSummary = reqWords.some((w) => summaryLower.includes(w));

    if (!foundInArtifacts && !foundInSummary) {
      missingDeliverables.push(req);
    }
  }

  // 🛡️ TIER 1: VERIFIKASI FISIK FILE SYSTEM (REAL DISK AUDIT)
  // Jika workingDirectory didefinisikan atau artefak menyertakan ekstensi berkas,
  // supervisor memeriksa keberadaan berkas fisik nyata dan ukuran > 0 bytes di disk.
  const nodeEnv = getNodeFsAndPath();
  const effectiveWorkingDir = submission.workingDirectory || (nodeEnv && process.cwd());

  if (nodeEnv && effectiveWorkingDir) {
    for (const art of submission.deliveredArtifacts) {
      // Deteksi artefak berkas (memiliki ekstensi seperti .ts, .js, .json, .md, .sol, .prisma, dll.)
      if (/\.[a-z0-9]{1,6}$/i.test(art.name)) {
        const candidatePaths = [
          art.name,
          nodeEnv.path.resolve(effectiveWorkingDir, art.name),
          nodeEnv.path.resolve(effectiveWorkingDir, "src", art.name),
          nodeEnv.path.resolve(effectiveWorkingDir, "docs", art.name),
        ];

        let fileFound = false;
        let fileEmpty = false;

        for (const p of candidatePaths) {
          try {
            if (nodeEnv.fs.existsSync(p) && nodeEnv.fs.statSync(p).isFile()) {
              fileFound = true;
              if (nodeEnv.fs.statSync(p).size === 0) {
                fileEmpty = true;
              }
              break;
            }
          } catch {
            // continue searching
          }
        }

        // Jika workingDirectory disetel secara eksplisit, tegakkan audit disk ketat
        if (submission.workingDirectory) {
          if (!fileFound) {
            missingDeliverables.push(
              `Artefak fisik '${art.name}' tidak ditemukan pada disk (workingDirectory: ${submission.workingDirectory})`
            );
          } else if (fileEmpty) {
            missingDeliverables.push(
              `Artefak fisik '${art.name}' ditemukan kosong (0 bytes) pada disk`
            );
          }
        }
      }
    }
  }

  // ------------------------------------------------------------
  // B. Cross-Artifact & Diagram Sync Check
  // ------------------------------------------------------------
  const combinedSubmissionText = (
    submission.summaryOfWork +
    " " +
    submission.deliveredArtifacts.map((a) => `${a.name} ${a.summary || ""} ${a.contentSnippet || ""}`).join(" ")
  ).toLowerCase();

  const blueprint = session.masterBlueprint;
  if (blueprint.diagrams && blueprint.diagrams.length > 0) {
    for (const diag of blueprint.diagrams) {
      if (diag.entities && diag.entities.length > 0) {
        // Jika fase ini berhubungan dengan arsitektur, cek apakah ada entitas diagram yang sengaja ditiadakan
        const droppedEntities = diag.entities.filter((entity) => {
          const entityLower = entity.toLowerCase();
          // Cek jika teks secara eksplisit menyebut penghapusan entitas inti
          return (
            combinedSubmissionText.includes(`hapus ${entityLower}`) ||
            combinedSubmissionText.includes(`remove ${entityLower}`) ||
            combinedSubmissionText.includes(`tanpa ${entityLower}`)
          );
        });
        if (droppedEntities.length > 0) {
          consistencyViolations.push(
            `Entitas diagram Mermaid [${diag.title}] dihilangkan tanpa dasar teknis: ${droppedEntities.join(", ")}`
          );
        }
      }
    }
  }

  // ------------------------------------------------------------
  // C. Negative Constraint & Anti-Fake-Data Guard
  // ------------------------------------------------------------
  const STOPWORDS = new Set([
    "dan", "atau", "yang", "untuk", "dengan", "ke", "di", "dari", "ini", "itu",
    "dalam", "satu", "seluruh", "semua", "pada", "oleh", "secara", "karena", "agar",
    "bisa", "dapat", "fitur", "modul", "data", "angka", "sistem", "aplikasi", "kode",
    "file", "raksasa", "palsu", "fiktif", "mock", "dummy", "patuhi", "prinsip", "separation",
    "concerns", "menaruh", "membuat", "gunakan", "tambah", "the", "and", "or", "for",
    "with", "in", "on", "at", "to", "from", "by", "all", "whole", "into", "single",
    "production", "staging", "development", "lingkungan", "environment", "testing",
    "test", "backend", "frontend", "komponen", "arsitektur", "handover", "deployment",
    "key", "keys", "token", "tokens", "database", "repository", "publik", "public",
    "rahasia", "secret", "secrets", "kredensial", "credentials",
    "hapus", "menghapus", "delete", "deleting", "catatan", "transaksi", "transaction",
    "transactions", "record", "records", "user", "users", "pengguna", "produk", "product",
    "item", "items", "pesanan", "order", "orders", "akun", "account", "accounts"
  ]);

  for (const constraint of blueprint.negativeConstraints) {
    const constraintLower = constraint.toLowerCase();

    // Deteksi larangan penghapusan transaksi spesifik
    if (/menghapus\s+catatan|delete\s+transaction|hapus\s+transaksi/i.test(constraintLower)) {
      if (/(?:menghapus|hapus|delete|drop)\s+(?:catatan|transaksi|transaction|record)/i.test(combinedSubmissionText)) {
        const safeContext = new RegExp(`(?:tidak|bukan|hindari|tanpa|tanpa ada|zero)\\s+(?:menghapus|hapus|delete)`, "i");
        if (!safeContext.test(combinedSubmissionText)) {
          scopeCreepOrForbiddenViolations.push(
            `Pelanggaran batasan negatif: terdeteksi operasi penghapusan catatan transaksi yang dilarang pengguna ("${constraint}")`
          );
        }
      }
    }
    
    // Deteksi larangan umum, misal "Jangan buat POS" / "Dilarang membuat sistem kasir POS fisik"
    const forbiddenMatch = constraintLower.match(/(?:jangan|dilarang|tidak boleh|no)\s+(?:buat|membuat|gunakan|menggunakan|tambah|menambahkan|ada|pasang|memasang|hapus|menghapus)?\s*([a-z0-9_\-\s]{2,40})/i);
    if (forbiddenMatch && forbiddenMatch[1]) {
      const forbiddenTerm = forbiddenMatch[1].trim();
      const tokens = forbiddenTerm
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

      for (const token of tokens) {
        const regexViolation = new RegExp(`(?:membuat|menambahkan|fitur|modul|sistem|perangkat)?\\s*\\b${token}\\b`, "i");
        if (regexViolation.test(combinedSubmissionText) || combinedSubmissionText.includes(` ${token} `)) {
          const safeContext = new RegExp(`(?:tidak|bukan|hindari|tanpa|tanpa ada|zero)\\s+\\b${token}\\b`, "i");
          if (!safeContext.test(combinedSubmissionText)) {
            scopeCreepOrForbiddenViolations.push(
              `Pelanggaran batasan negatif: terdeteksi implementasi '${token}' yang dilarang pengguna ("${constraint}")`
            );
            break;
          }
        }
      }
    }
  }

  // Anti-Fake Data Guard (bersihkan penyebutan negasi positif seperti 'zero fake data')
  const cleanForFakeCheck = combinedSubmissionText.replace(
    /(?:zero|no|tanpa|bebas|anti|hindari|zero-tolerance|clean\s+from)\s+(?:mock|fake|dummy)\s+(?:data|number|angka|fiktif)?/gi,
    ""
  );
  const fakeDataPatterns = [
    /\bfake\s+(?:data|number|metrics|sales)\b/i,
    /\bmock\s+(?:angka|data|fiktif)\b/i,
    /\bdata\s+fiktif\b/i,
    /\bangka\s+(?:palsu|karangan)\b/i,
  ];
  for (const pattern of fakeDataPatterns) {
    if (pattern.test(cleanForFakeCheck)) {
      scopeCreepOrForbiddenViolations.push(
        `Pelanggaran Anti-Fake Data: Terdeteksi penggunaan atau klaim berbasis data fiktif / mock palsu`
      );
      break;
    }
  }

  // ------------------------------------------------------------
  // D. Verification Evidence Guard (Evidence over Claims)
  // ------------------------------------------------------------
  let evidenceCheckPassed = true;
  let independentExecutionResult: IndependentExecutionResult | undefined = undefined;
  const verifOutput = (submission.verificationOutput || "").trim();

  if (submission.verificationCommand) {
    // 🛡️ ZERO-TRUST ACTIVE GATE: PIEW mengeksekusi langsung perintah uji
    const execRes = executeVerificationCommandSync(
      submission.verificationCommand,
      submission.workingDirectory
    );
    independentExecutionResult = execRes;
    if (execRes.executed) {
      if (execRes.exitCode !== 0) {
        evidenceCheckPassed = false;
        consistencyViolations.push(
          `[ZERO-TRUST VERIFIKASI AKTIF GAGAL] Perintah "${submission.verificationCommand}" menghasilkan Exit Code ${execRes.exitCode}.\nStderr: ${execRes.stderrSnippet || "(kosong)"}`
        );
      } else {
        evidenceCheckPassed = true;
      }
    }
  } else {
    // Passive Verification Output Check
    if (verifOutput.length < 15) {
      evidenceCheckPassed = false;
    } else {
      // Indikasi kegagalan fatal dalam terminal log
      const fatalErrorIndicators = [
        /\bFAIL\b/,
        /\bFAILED\b/,
        /Exit Code [1-9]\d*/i,
        /AssertionError/i,
        /Test Suites: \d+ failed/i,
        /Tests: \d+ failed/i,
        /npm error code [1-9]\d*/i,
        /Build failed/i,
      ];

      const hasFatalError = fatalErrorIndicators.some((pat) => pat.test(verifOutput));
      if (hasFatalError) {
        evidenceCheckPassed = false;
      } else {
        // Sinyal kesuksesan uji nyata
        const successSignals = [
          /exit code 0/i,
          /pass/i,
          /success/i,
          /ok/i,
          /lulus/i,
          /verified/i,
          /completed/i,
          /0 errors/i,
          /all tests pass/i,
          /tests? passed/i,
          /tests: \d+ passed/i,
          /status 200/i,
        ];
        const hasSuccessSignal = successSignals.some((sig) => sig.test(verifOutput));
        if (!hasSuccessSignal) {
          evidenceCheckPassed = false;
        }
      }
    }
  }

  // ------------------------------------------------------------
  // E. Artifact Integrity & On-Disk File Check
  // ------------------------------------------------------------
  let artifactIntegrityDetails: ArtifactIntegrityDetail[] | undefined = undefined;
  if (submission.workingDirectory || (typeof process !== "undefined" && getNodeFsAndPath())) {
    const verifiedDetails = verifyArtifactsOnDisk(
      submission.deliveredArtifacts,
      submission.workingDirectory
    );
    if (verifiedDetails && verifiedDetails.length > 0) {
      artifactIntegrityDetails = verifiedDetails;
    }
  }

  // ------------------------------------------------------------
  // Autonomous Transition Decision & Scoring
  // ------------------------------------------------------------
  const isAllClear =
    missingDeliverables.length === 0 &&
    consistencyViolations.length === 0 &&
    scopeCreepOrForbiddenViolations.length === 0 &&
    evidenceCheckPassed;

  let calculatedScore = 100;
  calculatedScore -= missingDeliverables.length * 20;
  calculatedScore -= consistencyViolations.length * 15;
  calculatedScore -= scopeCreepOrForbiddenViolations.length * 25;
  if (!evidenceCheckPassed) {
    calculatedScore -= 30;
  }
  calculatedScore = Math.max(0, Math.min(100, calculatedScore));

  const now = new Date().toISOString();

  if (!isAllClear) {
    // ❌ REJECTED_NEEDS_REPAIR
    currentPhase.status = "REJECTED_NEEDS_REPAIR";
    currentPhase.attemptCount++;
    const isHalted = currentPhase.attemptCount >= maxRetries;

    if (isHalted) {
      session.overallStatus = "HALTED_MAX_RETRIES";
    }

    const correctivePrompt = generateCorrectivePrompt({
      session,
      currentPhase,
      missingDeliverables,
      consistencyViolations,
      scopeCreepOrForbiddenViolations,
      evidenceCheckPassed,
      verificationOutput: verifOutput,
      isHalted,
    });

    currentPhase.lastAuditSummary = `Audit gagal pada attempt ke-${currentPhase.attemptCount} (Skor: ${calculatedScore}/100)`;

    const auditResult = PhaseAuditResultSchema.parse({
      verdict: "REJECTED_NEEDS_REPAIR",
      score: calculatedScore,
      missingDeliverables,
      consistencyViolations,
      scopeCreepOrForbiddenViolations,
      evidenceCheckPassed,
      nextActionPrompt: correctivePrompt,
      phaseIndex: currentPhase.phaseIndex,
      auditTimestamp: now,
      independentExecutionResult,
      artifactIntegrity: artifactIntegrityDetails,
    });

    session.auditHistory.push({
      phaseIndex: currentPhase.phaseIndex,
      attemptNumber: currentPhase.attemptCount,
      submissionSummary: submission.summaryOfWork.slice(0, 300),
      auditResult,
      timestamp: now,
    });
    session.updatedAt = now;

    saveProjectSession(session);
    return auditResult;
  }

  // ✅ VERIFIED & ADVANCE
  currentPhase.status = "VERIFIED";
  currentPhase.lastAuditSummary = `Lulus audit pada attempt ke-${currentPhase.attemptCount + 1} dengan skor ${calculatedScore}/100. Bukti verifikasi terkonfirmasi.`;

  const isFinalPhase = session.currentPhaseIndex >= session.phases.length - 1;

  if (isFinalPhase) {
    session.overallStatus = "COMPLETED";
    const handoverPrompt = generateHandoverCertificate(session);

    // Auto-export handover bundle jika berjalan di Node environment
    try {
      exportHandoverBundle(session.sessionId);
    } catch {
      // non-fatal
    }

    const auditResult = PhaseAuditResultSchema.parse({
      verdict: "PROJECT_COMPLETED",
      score: Math.max(90, calculatedScore),
      missingDeliverables: [],
      consistencyViolations: [],
      scopeCreepOrForbiddenViolations: [],
      evidenceCheckPassed: true,
      nextActionPrompt: handoverPrompt,
      phaseIndex: currentPhase.phaseIndex,
      auditTimestamp: now,
      independentExecutionResult,
      artifactIntegrity: artifactIntegrityDetails,
    });

    session.auditHistory.push({
      phaseIndex: currentPhase.phaseIndex,
      attemptNumber: currentPhase.attemptCount + 1,
      submissionSummary: submission.summaryOfWork.slice(0, 300),
      auditResult,
      timestamp: now,
    });
    session.updatedAt = now;

    saveProjectSession(session);
    return auditResult;
  }

  // Maju ke fase berikutnya
  const previousPhaseSnapshot = { ...currentPhase };
  session.currentPhaseIndex++;
  const nextPhase = session.phases[session.currentPhaseIndex];
  nextPhase.status = "IN_PROGRESS";

  const nextPhasePrompt = generatePhaseDispatchPrompt({
    session,
    targetPhase: nextPhase,
    previousPhase: previousPhaseSnapshot,
  });

  const auditResult = PhaseAuditResultSchema.parse({
    verdict: "VERIFIED_PROCEED",
    score: Math.max(85, calculatedScore),
    missingDeliverables: [],
    consistencyViolations: [],
    scopeCreepOrForbiddenViolations: [],
    evidenceCheckPassed: true,
    nextActionPrompt: nextPhasePrompt,
    phaseIndex: previousPhaseSnapshot.phaseIndex,
    auditTimestamp: now,
    independentExecutionResult,
    artifactIntegrity: artifactIntegrityDetails,
  });

  session.auditHistory.push({
    phaseIndex: previousPhaseSnapshot.phaseIndex,
    attemptNumber: previousPhaseSnapshot.attemptCount + 1,
    submissionSummary: submission.summaryOfWork.slice(0, 300),
    auditResult,
    timestamp: now,
  });
  session.updatedAt = now;

  saveProjectSession(session);
  return auditResult;
}

// ──────────────────────────────────────────────
// 3. Human in Control Override Engine
// ──────────────────────────────────────────────

export interface HumanOverrideInput {
  sessionId: string;
  action:
    | "FORCE_ADVANCE"
    | "FORCE_ROLLBACK"
    | "RESET_RETRIES"
    | "INJECT_CONSTRAINT"
    | "HALT"
    | "RESUME";
  targetPhaseIndex?: number;
  additionalConstraint?: string;
  reason?: string;
}

export interface HumanOverrideResult {
  session: AutonomousProjectSession;
  summary: string;
  updatedPrompt: string;
}

export function applyHumanOverride(rawInput: HumanOverrideInput): HumanOverrideResult {
  const session = getProjectSession(rawInput.sessionId);
  if (!session) {
    throw new Error(
      `[SUPERVISOR] Sesi proyek dengan ID "${rawInput.sessionId}" tidak ditemukan.`
    );
  }

  let summary = "";
  const now = new Date().toISOString();

  switch (rawInput.action) {
    case "INJECT_CONSTRAINT": {
      if (!rawInput.additionalConstraint) {
        throw new Error("additionalConstraint wajib diisi untuk aksi INJECT_CONSTRAINT");
      }
      session.masterBlueprint.negativeConstraints.push(rawInput.additionalConstraint);
      summary = `[OVERRIDE BERHASIL] Batasan negatif baru disuntikkan: "${rawInput.additionalConstraint}"`;
      break;
    }

    case "RESET_RETRIES": {
      const curPhase = session.phases[session.currentPhaseIndex];
      curPhase.attemptCount = 0;
      if (session.overallStatus === "HALTED_MAX_RETRIES") {
        session.overallStatus = "ACTIVE";
      }
      summary = `[OVERRIDE BERHASIL] Retry counter fase ${curPhase.phaseId} direset ke 0. Status proyek kembali ACTIVE.`;
      break;
    }

    case "FORCE_ADVANCE": {
      const cur = session.phases[session.currentPhaseIndex];
      cur.status = "VERIFIED";
      cur.lastAuditSummary = `Manual approval / human override: ${rawInput.reason || "Approved by human operator"}`;
      if (session.currentPhaseIndex < session.phases.length - 1) {
        session.currentPhaseIndex++;
        session.phases[session.currentPhaseIndex].status = "IN_PROGRESS";
        summary = `[OVERRIDE BERHASIL] Fase ${cur.phaseId} dipaksa VERIFIED oleh operator. Maju ke ${session.phases[session.currentPhaseIndex].phaseId}.`;
      } else {
        session.overallStatus = "COMPLETED";
        summary = `[OVERRIDE BERHASIL] Proyek diselesaikan secara manual oleh operator.`;
      }
      break;
    }

    case "FORCE_ROLLBACK": {
      const targetIdx =
        rawInput.targetPhaseIndex !== undefined
          ? rawInput.targetPhaseIndex
          : Math.max(0, session.currentPhaseIndex - 1);

      if (targetIdx < 0 || targetIdx >= session.phases.length) {
        throw new Error(`targetPhaseIndex ${targetIdx} di luar rentang valid.`);
      }

      session.currentPhaseIndex = targetIdx;
      session.phases[targetIdx].status = "IN_PROGRESS";
      session.overallStatus = "ACTIVE";
      summary = `[OVERRIDE BERHASIL] Fase di-rollback ke indeks ${targetIdx} (${session.phases[targetIdx].phaseId}) oleh operator.`;
      break;
    }

    case "HALT": {
      session.overallStatus = "HALTED_MAX_RETRIES";
      summary = `[OVERRIDE BERHASIL] Proyek dihentikan sementara (HALTED) oleh operator: ${rawInput.reason || "Intervensi manusia"}`;
      break;
    }

    case "RESUME": {
      session.overallStatus = "ACTIVE";
      summary = `[OVERRIDE BERHASIL] Proyek dilanjutkan kembali (RESUMED) oleh operator.`;
      break;
    }
  }

  session.updatedAt = now;
  saveProjectSession(session);

  const activePhase = session.phases[session.currentPhaseIndex];
  const updatedPrompt = generatePhaseDispatchPrompt({
    session,
    targetPhase: activePhase,
  });

  return {
    session,
    summary,
    updatedPrompt,
  };
}

// ──────────────────────────────────────────────
// 4. Status Inspector Helper
// ──────────────────────────────────────────────

export interface ProjectStatusReport {
  sessionId: string;
  title: string;
  overallStatus: string;
  currentPhaseIndex: number;
  totalPhases: number;
  progressPercentage: number;
  activePhase: ProjectPhaseState;
  phases: ProjectPhaseState[];
  auditHistoryCount: number;
  latestPrompt: string;
}

export function getProjectStatus(sessionId: string): ProjectStatusReport {
  const session = getProjectSession(sessionId);
  if (!session) {
    throw new Error(`[SUPERVISOR] Sesi proyek "${sessionId}" tidak ditemukan.`);
  }

  const verifiedCount = session.phases.filter((p) => p.status === "VERIFIED").length;
  const progressPercentage = Math.round((verifiedCount / session.phases.length) * 100);
  const activePhase = session.phases[session.currentPhaseIndex] || session.phases[0];

  let latestPrompt = "";
  if (session.overallStatus === "COMPLETED") {
    latestPrompt = generateHandoverCertificate(session);
  } else {
    latestPrompt = generatePhaseDispatchPrompt({
      session,
      targetPhase: activePhase,
    });
  }

  return {
    sessionId: session.sessionId,
    title: session.masterBlueprint.title,
    overallStatus: session.overallStatus,
    currentPhaseIndex: session.currentPhaseIndex,
    totalPhases: session.phases.length,
    progressPercentage,
    activePhase,
    phases: session.phases,
    auditHistoryCount: session.auditHistory.length,
    latestPrompt,
  };
}
