export type FindingSeverity = "critical" | "warning" | "info" | "success";

export interface AnalysisFinding {
  id: string;
  type: string;
  severity: FindingSeverity;
  message: string;
  evidence?: string;
  recommendation?: string;
}

export interface PromptChange {
  type: string;
  description: string;
  reason: string;
}

export interface DetectedIntent {
  summary: string;
  confidence: number; // 0.0 - 1.0
  uncertainties: string[];
  targetAudience?: string;
  outputFormat?: string;
}

export interface PromptOptimizationResult {
  requestId: string;
  originalPrompt: string;
  optimizedPrompt: string;
  detectedIntent: DetectedIntent;
  analysis: {
    overallScore: number;
    status: "ready" | "needs_optimization" | "acceptable";
    findings: AnalysisFinding[];
  };
  changes: PromptChange[];
  metrics: {
    clarityScore: number;
    constraintCoverage: number;
    estimatedTokenDelta?: string;
    latencyMs?: number;
  };
  metadata: {
    modelTarget: string;
    engineVersion: string;
    timestamp: string;
  };
}
