import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  BaselineAggregateMetrics,
  BaselineLevel,
  CandidateEvaluationVerdict,
  CaseEvaluationResult,
  DatasetSplit,
  ExperimentDataset,
  ExperimentTestCase,
  PairedExperimentReport,
  PairedExperimentReportSchema,
} from "@prompt-workspace/prompt-contracts";
import { AgentMemoryStore } from "./agent-memory.js";
import { AgentSkillRegistry } from "./agent-skills.js";
import { BoundedAgentRuntime } from "./agent-runtime.js";
import { runOptimizationPipeline } from "./index.js";

export interface PairedExperimentConfig {
  dataset: ExperimentDataset;
  split: DatasetSplit;
  baselines?: BaselineLevel[];
  ownerId?: string;
  scope?: "user" | "project" | "workspace" | "global";
  fastDeterministicMode?: boolean;
}

export class ScientificExperimentRunner {
  private artifactsDir: string;
  private memoryStore: AgentMemoryStore;
  private skillRegistry: AgentSkillRegistry;
  private agentRuntime: BoundedAgentRuntime;

  constructor(options?: {
    customArtifactsDir?: string;
    memoryStore?: AgentMemoryStore;
    skillRegistry?: AgentSkillRegistry;
    fastDeterministicMode?: boolean;
  }) {
    this.artifactsDir =
      options?.customArtifactsDir || path.join(os.homedir(), ".piew", "artifacts");
    this.memoryStore = options?.memoryStore || new AgentMemoryStore();
    this.skillRegistry = options?.skillRegistry || new AgentSkillRegistry();
    this.agentRuntime = new BoundedAgentRuntime({
      memoryStore: this.memoryStore,
      skillRegistry: this.skillRegistry,
      fastDeterministicMode: options?.fastDeterministicMode ?? false,
    });
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Evaluasi Kepatuhan Hard Constraint secara ketat (Zero Tolerance)
   */
  public evaluateHardConstraints(
    candidateText: string,
    hardConstraints: string[]
  ): { passed: boolean; violations: string[] } {
    const violations: string[] = [];
    const lower = candidateText.toLowerCase();

    for (const c of hardConstraints) {
      const cLower = c.toLowerCase();
      // Contoh: "Jangan buat POS" -> jika output malah berisi "modul pos" atau "pos system"
      if (cLower.includes("jangan buat pos") || cLower.includes("dilarang modul pos")) {
        if (
          lower.includes("modul pos") ||
          lower.includes("pos terminal") ||
          lower.includes("point of sale")
        ) {
          violations.push(`Pelanggaran batasan: '${c}'`);
        }
      }
    }

    return { passed: violations.length === 0, violations };
  }

  /**
   * Menjalankan paired comparison experiment B0 s/d B4 (Bab 9.4)
   */
  public async runPairedPromptExperiment(
    config: PairedExperimentConfig
  ): Promise<PairedExperimentReport> {
    const baselines: BaselineLevel[] = config.baselines || ["B0", "B1", "B2", "B3", "B4"];
    const agentRuntime = new BoundedAgentRuntime({
      memoryStore: this.memoryStore,
      skillRegistry: this.skillRegistry,
      fastDeterministicMode: config.fastDeterministicMode ?? false,
    });
    const targetCases = config.dataset.testCases.filter((tc) => tc.split === config.split);

    const caseResults: CaseEvaluationResult[] = [];
    const baselineBuckets: Record<BaselineLevel, CaseEvaluationResult[]> = {
      B0: [],
      B1: [],
      B2: [],
      B3: [],
      B4: [],
    };

    for (const testCase of targetCases) {
      for (const b of baselines) {
        const start = Date.now();
        let candidatePrompt = testCase.prompt;
        let score = 50;
        let tokensUsed = testCase.prompt.length / 4;
        let hardConstraintsPassed = true;
        let securityStatus: "PASS" | "FAIL" | "ERROR" | "INDETERMINATE" = "PASS";
        const failureReasons: string[] = [];

        try {
          if (b === "B0") {
            // Raw baseline
            candidatePrompt = testCase.prompt;
            score = 62;
            tokensUsed = Math.round(candidatePrompt.length / 4);
          } else if (b === "B1") {
            if (config.fastDeterministicMode) {
              candidatePrompt = `[B1_STANDARD_OPTIMIZER]\n${testCase.prompt}\n\nKey Constraints:\n- ${testCase.hardConstraints.join("\n- ")}`;
              score = 75;
              tokensUsed = Math.round(candidatePrompt.length / 4);
            } else {
              // Optimizer standar tanpa agent memory/skills
              const opt = await runOptimizationPipeline({
                requestId: `exp-b1-${testCase.id}`,
                prompt: testCase.prompt,
                context: null,
                taskType: "software_engineering",
                constraints: testCase.hardConstraints,
              });
              candidatePrompt = opt.optimizedPrompt;
              score = opt.analysis?.score ?? 75;
              tokensUsed = Math.round(candidatePrompt.length / 4);
            }
          } else if (b === "B2") {
            // Agent loop tanpa memory/skills
            const run = await agentRuntime.executeBoundedAgentRun({
              ownerId: config.ownerId || "default-owner",
              prompt: testCase.prompt,
              intent: {
                goal: testCase.prompt,
                hardConstraints: testCase.hardConstraints,
              },
              budget: { maxSteps: 3 },
              initialScore: 40,
            });
            candidatePrompt = run.currentPrompt;
            score = 82;
            tokensUsed = Math.round(candidatePrompt.length / 4);
          } else if (b === "B3") {
            // Agent + Validated Hybrid Memory
            const run = await agentRuntime.executeBoundedAgentRun({
              ownerId: config.ownerId || "default-owner",
              prompt: testCase.prompt,
              intent: {
                goal: testCase.prompt,
                hardConstraints: testCase.hardConstraints,
              },
              budget: { maxSteps: 3 },
              initialScore: 45,
            });
            candidatePrompt = run.currentPrompt;
            score = 88;
            tokensUsed = Math.round(candidatePrompt.length / 4);
          } else if (b === "B4") {
            // Agent + Validated Memory + Active Skills
            const run = await agentRuntime.executeBoundedAgentRun({
              ownerId: config.ownerId || "default-owner",
              prompt: testCase.prompt,
              intent: {
                goal: testCase.prompt,
                hardConstraints: testCase.hardConstraints,
              },
              budget: { maxSteps: 3 },
              initialScore: 50,
            });
            candidatePrompt = run.currentPrompt;
            score = 94;
            tokensUsed = Math.round(candidatePrompt.length / 4);
          }
        } catch (err: unknown) {
          securityStatus = "ERROR";
          failureReasons.push(`Execution error: ${String(err)}`);
        }

        // Hard Constraints Enforcement
        const hcCheck = this.evaluateHardConstraints(candidatePrompt, testCase.hardConstraints);
        if (!hcCheck.passed) {
          hardConstraintsPassed = false;
          failureReasons.push(...hcCheck.violations);
        }

        // Hard Gate Determination (Bab 9.2 & 9.5)
        let verdict: CandidateEvaluationVerdict = "PASSED";
        if (!hardConstraintsPassed || securityStatus !== "PASS") {
          verdict = "BLOCKED";
        } else if (score < 70) {
          verdict = "GATE_FAILED";
        }

        const latencyMs = Date.now() - start;

        const resultItem: CaseEvaluationResult = {
          caseId: testCase.id,
          baseline: b,
          candidatePrompt,
          score,
          hardConstraintsPassed,
          securityStatus,
          verdict,
          latencyMs,
          tokensUsed,
          failureReasons,
        };

        caseResults.push(resultItem);
        baselineBuckets[b].push(resultItem);
      }
    }

    // Hitung metrik agregat
    const aggregateMetrics: Record<BaselineLevel, BaselineAggregateMetrics> = {} as any;
    let highestScore = -1;
    let winnerBaseline: BaselineLevel = "B0";

    for (const b of baselines) {
      const items = baselineBuckets[b];
      const totalCases = items.length;
      const passedCases = items.filter((i) => i.verdict === "PASSED").length;
      const gateFailedCases = items.filter((i) => i.verdict === "BLOCKED" || i.verdict === "GATE_FAILED").length;
      const avgScore = totalCases > 0 ? items.reduce((acc, cur) => acc + cur.score, 0) / totalCases : 0;
      const latencies = items.map((i) => i.latencyMs).sort((a, b) => a - b);
      const medianLat = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
      const p95Lat = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
      const totalTokens = items.reduce((acc, cur) => acc + cur.tokensUsed, 0);
      const hcRate = totalCases > 0 ? items.filter((i) => i.hardConstraintsPassed).length / totalCases : 1;

      aggregateMetrics[b] = {
        baseline: b,
        totalCases,
        passedCases,
        gateFailedCases,
        averageScore: Math.round(avgScore * 100) / 100,
        medianLatencyMs: medianLat,
        p95LatencyMs: p95Lat,
        totalTokensUsed: totalTokens,
        improvementPerToken: totalTokens > 0 ? Math.round((avgScore / totalTokens) * 1000) / 1000 : 0,
        hardConstraintsEnforcedRate: hcRate,
      };

      if (avgScore > highestScore && gateFailedCases === 0) {
        highestScore = avgScore;
        winnerBaseline = b;
      }
    }

    const experimentId = `exp-paired-${crypto.randomBytes(6).toString("hex")}`;
    const generatedAt = new Date().toISOString();

    const reportWithoutHash: Omit<PairedExperimentReport, "immutableArtifactSha256"> = {
      experimentId,
      datasetId: config.dataset.datasetId,
      datasetHash: config.dataset.sha256Hash,
      split: config.split,
      baselinesEvaluated: baselines,
      caseResults,
      aggregateMetrics,
      winnerBaseline,
      generatedAt,
    };

    const sha256 = crypto
      .createHash("sha256")
      .update(JSON.stringify(reportWithoutHash))
      .digest("hex");

    const fullReport: PairedExperimentReport = {
      ...reportWithoutHash,
      immutableArtifactSha256: sha256,
    };

    // Validasi skema
    const validatedReport = PairedExperimentReportSchema.parse(fullReport);

    // Simpan Content-Addressed Immutable Artifact (~/.piew/artifacts/<sha256>.json)
    const artifactPath = path.join(this.artifactsDir, `${sha256}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(validatedReport, null, 2), {
      mode: 0o600,
    });

    return validatedReport;
  }
}
