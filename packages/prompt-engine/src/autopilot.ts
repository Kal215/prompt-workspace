import {
  AutoPilotRequest,
  AutoPilotRequestSchema,
  AutoPilotResult,
  AutoPilotResultSchema,
  SynthesisStylePreset,
  TokenBudgetMode,
  TaskSpecificationMap,
  MasterPromptValidationResult,
  SpiderReport,
} from "@prompt-workspace/prompt-contracts";
import {
  detectTaskArchetypeAndDomain,
  getSynthesisBlueprint,
} from "@prompt-workspace/domain-rules";
import { extractTaskSpecification } from "./task-extractor.js";
import { synthesizeMasterPrompt } from "./master-synthesizer.js";
import { validateMasterPromptSynthesis } from "./validator.js";
import { buildClosedLoopOptimizationContext } from "./closed-loop.js";
import {
  globalPromptEngineCache,
  DeterministicContentCache,
} from "./cache.js";
import { loadPiewConfig } from "./config.js";
import { synthesizeUniversalBlueprint } from "./universal-synthesizer.js";
import { runPromptCrawler } from "@prompt-workspace/prompt-crawler";
import { runPromptSpider } from "@prompt-workspace/prompt-spider";
import { LLMProviderAdapter } from "@prompt-workspace/provider-adapters";

export interface AutoPilotPipelineOptions {
  adapter?: LLMProviderAdapter;
  cache?: DeterministicContentCache;
  skipSpider?: boolean;
}

/**
 * Mesin Orkestrator 1-Klik Auto-Pilot (Mega Task #48 - Engine v2.2)
 *
 * Menggabungkan seluruh tahapan:
 * 1. Check Smart SHA-256 Cache (0 token jika hit)
 * 2. Auto-Crawl Reference URLs (ekstraksi fakta grounding jika diberikan)
 * 3. Ekstraksi TaskSpecificationMap & Domain Blueprint
 * 4. Sintesis Master Prompt dengan preset gaya (Comprehensive / Tactical / Conversational)
 * 5. Validasi Deterministik Anti-Scope-Creep & 1x Bounded Self-Repair
 * 6. Auto-Spider Verification (pada deep_audit atau bila diminta)
 * 7. Penyimpanan ke Smart Cache & Return Satu Objek Utuh AutoPilotResult
 */
export async function runAutoPilotMasterPipeline(
  input: AutoPilotRequest,
  options: AutoPilotPipelineOptions = {}
): Promise<AutoPilotResult> {
  const startTime = Date.now();
  const validatedInput = AutoPilotRequestSchema.parse(input);
  const config = loadPiewConfig();

  const stylePreset: SynthesisStylePreset =
    validatedInput.stylePreset || config.defaultStylePreset || "comprehensive_blueprint";
  const budgetMode: TokenBudgetMode =
    validatedInput.budgetMode || config.defaultBudgetMode || "balanced";

  const cache = options.cache || globalPromptEngineCache;

  // 1. Cek Smart Deterministic SHA-256 Cache
  const cacheKeyParams = {
    prompt: validatedInput.prompt,
    context: validatedInput.context,
    taskType: validatedInput.taskType,
    stylePreset,
    budgetMode,
    audienceLevel: validatedInput.audienceLevel,
    referenceUrls: validatedInput.referenceUrls?.slice(0, 2).sort(),
  };

  const cached = cache.get<AutoPilotResult>(cacheKeyParams);
  if (cached) {
    return {
      ...cached,
      cacheHit: true,
      processingTimeMs: Date.now() - startTime,
    };
  }

  const changes: string[] = [
    "Orkestrator Auto-Pilot v2.2: Eksekusi pipeline terpadu 1-klik aktif",
  ];
  const warnings: string[] = [];
  const groundingFacts: any[] = [];
  let effectiveContext = validatedInput.context || "";

  // 2. Auto-Crawl Reference URLs jika diberikan (maks 2 URL)
  if (validatedInput.referenceUrls && validatedInput.referenceUrls.length > 0) {
    const urlsToCrawl = validatedInput.referenceUrls.slice(0, 2);
    for (const url of urlsToCrawl) {
      try {
        const crawlResult = await runPromptCrawler(
          {
            targetUrl: url,
            mode: "EXTRACT_GROUNDING_CONTEXT",
            sourceType: "DOCUMENTATION_PAGE",
          },
          {
            adapter: options.adapter,
          }
        );

        if (crawlResult.items && crawlResult.items.length > 0) {
          const facts = crawlResult.items.filter(
            (item) => item.itemType === "GROUNDING_FACT"
          );
          groundingFacts.push(...facts);
          changes.push(
            `Menyerap ${facts.length} fakta grounding dari dokumentasi terpercaya (${url})`
          );
        }
      } catch (err: any) {
        warnings.push(
          `Gagal mengambil grounding context dari ${url}: ${err.message}`
        );
      }
    }

    if (groundingFacts.length > 0) {
      effectiveContext = buildClosedLoopOptimizationContext({
        userContext: effectiveContext,
        groundingFacts: groundingFacts.map((f) => f.content),
      });
    }
  }

  // 3. Routing & Ekstraksi TaskSpecificationMap
  const route = detectTaskArchetypeAndDomain(
    validatedInput.prompt,
    effectiveContext,
    validatedInput.taskType
  );
  const blueprint = getSynthesisBlueprint(route.archetype);
  const taskSpec: TaskSpecificationMap = extractTaskSpecification(
    validatedInput.prompt,
    effectiveContext,
    route
  );

  changes.push(
    `Deteksi otomatis arketipe: ${route.archetype} (${blueprint.name}) dengan preset ${stylePreset}`
  );

  // 4. Sintesis Master Prompt
  let synthesisOutput = synthesizeMasterPrompt(
    validatedInput.prompt,
    taskSpec,
    blueprint,
    [],
    stylePreset
  );
  changes.push(...synthesisOutput.changes);
  warnings.push(...synthesisOutput.warnings);

  // 5. Validasi Deterministik & Self-Repair Pass
  let validationResult: MasterPromptValidationResult =
    validateMasterPromptSynthesis(
      validatedInput.prompt,
      synthesisOutput.masterPrompt,
      taskSpec,
      0,
      stylePreset
    );

  if (!validationResult.passed) {
    warnings.push(
      "Master prompt awal memerlukan perbaikan mandiri (Self-Repair Pass)"
    );
    synthesisOutput = synthesizeMasterPrompt(
      validatedInput.prompt,
      taskSpec,
      blueprint,
      [],
      stylePreset
    );
    validationResult = validateMasterPromptSynthesis(
      validatedInput.prompt,
      synthesisOutput.masterPrompt,
      taskSpec,
      1,
      stylePreset
    );
    changes.push("Self-Repair Pass: Mengunci struktur dan validasi mutu 100%");
  }

  // 6. Evaluasi Spider jika budgetMode === 'deep_audit'
  let spiderReport: SpiderReport | null = null;
  if (budgetMode === "deep_audit" && !options.skipSpider) {
    try {
      spiderReport = await runPromptSpider(synthesisOutput.masterPrompt, {
        adapter: options.adapter,
        budgetMode: "deep_audit",
        concurrencyLimit: 2,
      });
      changes.push(
        `Spider Deep Audit selesai (Critical Gate: ${spiderReport.criticalGatePassed ? "PASSED" : "FAILED"}, Lulus: ${spiderReport.coverageSummary.passedCases}/${spiderReport.coverageSummary.totalCases})`
      );
    } catch (err: any) {
      warnings.push(`Evaluasi Spider gagal dijalankan: ${err.message}`);
    }
  }

  // 6b. Sintesis Universal Meta-Blueprint & Diagram Polimorfik
  const audienceLevel = validatedInput.audienceLevel || "specialist";
  const universalResult = synthesizeUniversalBlueprint({
    prompt: validatedInput.prompt,
    context: validatedInput.context,
    audienceLevel,
    domain: route.domainId,
  });

  if (universalResult.consistencyValid) {
    changes.push(
      `Universal Meta-Blueprint 10-Bagian terpasang (Konsistensi Diagram vs Fase: ${universalResult.consistencyScore}%)`
    );
  } else {
    warnings.push(...universalResult.warnings);
  }

  const result: AutoPilotResult = {
    optimizedPrompt: synthesisOutput.masterPrompt,
    taskSpec,
    synthesisValidation: validationResult,
    stylePreset,
    budgetMode,
    groundingFacts,
    spiderReport,
    changes,
    warnings,
    cacheHit: false,
    processingTimeMs: Date.now() - startTime,
    metadata: {
      archetype: route.archetype,
      domainId: route.domainId,
      complexity: taskSpec.complexity,
    },
    audienceLevel,
    universalBlueprint: universalResult.blueprint,
  };

  const parsedResult = AutoPilotResultSchema.parse(result);

  // 7. Simpan ke Cache
  cache.set(cacheKeyParams, parsedResult);

  return parsedResult;
}
