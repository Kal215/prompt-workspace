export type FindingSeverity =
  | "critical"
  | "major"
  | "warning"
  | "minor"
  | "info"
  | "success"
  | "pass";

export interface AnalysisFinding {
  id?: string;
  category?: string;
  type?: string;
  severity: FindingSeverity | string;
  message?: string;
  evidence?: string;
  recommendation?: string;
}

export interface PromptChange {
  type?: string;
  description: string;
  reason?: string;
}

export interface DetectedIntent {
  summary: string;
  confidence?: number; // 0.0 - 1.0
  uncertainties?: string[];
  targetAudience?: string;
  outputFormat?: string;
}

export interface AppliedDomainRuleInfo {
  domainId: string;
  ruleVersion: string;
  name: string;
}

export interface PromptOptimizationResult {
  requestId: string;
  originalPrompt: string;
  optimizedPrompt: string;
  detectedIntent: string | DetectedIntent;
  analysis: {
    score?: number;
    overallScore?: number;
    status?: string;
    findings: AnalysisFinding[];
  };
  changes: (string | PromptChange)[];
  warnings?: string[];
  appliedDomainRule?: AppliedDomainRuleInfo;
  metrics?: {
    clarityScore?: number;
    constraintCoverage?: number;
    estimatedTokenDelta?: string;
    latencyMs?: number;
  };
  metadata?: {
    modelTarget?: string;
    engineVersion?: string;
    timestamp?: string;
    processingTimeMs?: number;
    confidenceScore?: number;
    estimatedTokenSavings?: string;
    appliedDomainRule?: AppliedDomainRuleInfo;
    [key: string]: unknown;
  };
}
