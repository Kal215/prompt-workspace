export interface AnalysisFinding {
  type: string;
  severity: "warning" | "info" | "success" | "error";
  message: string;
}

export interface PromptOptimizationResult {
  requestId: string;
  originalPrompt: string;
  optimizedPrompt: string;
  analysis: {
    score: number;
    status: string;
    findings: AnalysisFinding[];
  };
  metadata: {
    modelTarget: string;
    estimatedTokenSavings: string;
    confidenceScore: number;
    processingTimeMs: number;
  };
}
