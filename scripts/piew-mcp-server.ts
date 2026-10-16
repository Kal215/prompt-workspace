#!/usr/bin/env node
/**
 * PIEW MCP Server — Model Context Protocol Server (Stdio JSON-RPC 2.0 & HTTP/SSE)
 *
 * Menghubungkan mesin PIEW langsung ke AI Coding Agents (Cursor, Claude Code, Windsurf)
 * Menyediakan 4 MCP Tools:
 *   1. piew_autopilot (Orkestrator 1-klik alur penuh: Crawl -> Spec -> Synthesize -> Repair -> Spider)
 *   2. piew_synthesize_master_prompt (Sintesis Master Prompt berstruktur tinggi dengan 3 preset gaya)
 *   3. piew_crawl_grounding_context (Ekstraksi fakta grounding dari dokumentasi resmi berproteksi SSRF)
 *   4. piew_verify_prompt_spider (Pengujian matriks adversarial 5-cabang dengan mode budget hemat)
 *
 * Mode Transport:
 *   - Stdio (Default): Kompatibel dengan Cursor local command, Claude Code CLI, Windsurf.
 *     Mendukung sanitasi Windows CRLF (\r\n -> \n) secara otomatis.
 *   - HTTP/SSE (--sse atau --port=<port>): Memungkinkan IDE di komputer remote (misal Cursor di Windows
 *     menembak VPS Linux via IP Tailscale) untuk terhubung langsung via transport SSE.
 */

import readline from "node:readline";
import http from "node:http";
import crypto from "node:crypto";
import { URL } from "node:url";
import {
  runAutoPilotMasterPipeline,
  loadPiewConfig,
  initAutonomousProject,
  auditAndAdvancePhase,
  applyHumanOverride,
  getProjectStatus,
  exportHandoverBundle,
} from "@prompt-workspace/prompt-engine";
import {
  SynthesisStylePreset,
  TokenBudgetMode,
} from "@prompt-workspace/prompt-contracts";
import { runPromptCrawler } from "@prompt-workspace/prompt-crawler";
import { runPromptSpider } from "@prompt-workspace/prompt-spider";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "piew-mcp-server";
const SERVER_VERSION = "2.4.0";

const TOOLS = [
  {
    name: "piew_autopilot",
    description:
      "Full 1-click autonomous master prompt pipeline: automatically crawls reference URLs (if provided), extracts task specs, synthesizes operational master prompt with anti-scope-creep validation, validates with self-repair, and optionally audits with prompt spider.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The raw task or feature description",
        },
        context: {
          type: "string",
          description: "Optional codebase or technical context",
        },
        referenceUrls: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional documentation or GitHub URLs to crawl for grounding context",
        },
        taskType: {
          type: "string",
          description: "Optional task type override",
        },
        stylePreset: {
          type: "string",
          enum: [
            "comprehensive_blueprint",
            "concise_tactical",
            "conversational_expert",
          ],
          description:
            "Output formatting style (default: comprehensive_blueprint)",
        },
        budgetMode: {
          type: "string",
          enum: ["eco", "balanced", "deep_audit"],
          description: "Token budget mode (default: balanced)",
        },
        audienceLevel: {
          type: "string",
          enum: ["student", "academic", "professional", "specialist"],
          description: "Target audience calibration level (default: specialist)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "piew_synthesize_master_prompt",
    description:
      "Transform a raw prompt or feature idea into an operational, battle-tested Master Prompt with strict anti-scope-creep validation and structured execution stages.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The raw task description or prompt to synthesize",
        },
        context: {
          type: "string",
          description: "Optional repository or technical context",
        },
        taskType: {
          type: "string",
          description: "Optional task type or domain override",
        },
        stylePreset: {
          type: "string",
          enum: [
            "comprehensive_blueprint",
            "concise_tactical",
            "conversational_expert",
          ],
          description:
            "Output formatting style (default: comprehensive_blueprint)",
        },
        budgetMode: {
          type: "string",
          enum: ["eco", "balanced", "deep_audit"],
          description: "Token budget mode (default: balanced)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "piew_crawl_grounding_context",
    description:
      "Crawl and extract technical grounding facts and schemas from trusted documentation pages or GitHub repositories with full SSRF protection.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "Target URL from allowed documentation or GitHub domain (e.g. nextjs.org, docs.stripe.com, github.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "piew_verify_prompt_spider",
    description:
      "Execute adversarial stress-testing matrix on a prompt to verify critical gate pass and security robustness.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt to test",
        },
        budgetMode: {
          type: "string",
          enum: ["eco", "balanced", "deep_audit"],
          description:
            "Token budget mode ('eco' runs only 2 critical branches, saving >60% tokens)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "piew_start_project",
    description:
      "Start a new autonomous supervised engineering project. Generates a 10-part Universal Meta-Blueprint with Mermaid diagrams, establishes stateful execution phases, and returns Phase 0 dispatch instructions.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Raw task or project description with negative constraints",
        },
        context: {
          type: "string",
          description: "Optional codebase or domain context",
        },
        domainId: {
          type: "string",
          description: "Optional domain category override",
        },
        subtopicId: {
          type: "string",
          description: "Optional subtopic ID override",
        },
        audienceLevel: {
          type: "string",
          enum: ["student", "academic", "professional", "specialist"],
          description: "Target audience calibration level (default: specialist)",
        },
        maxAttemptsPerPhase: {
          type: "number",
          description: "Maximum repair retry attempts per phase before halting (default: 5)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "piew_submit_phase_work",
    description:
      "Submit an agent's completed phase deliverables and real verification evidence for strict audit by the PIEW Supervisor. Returns VERIFIED_PROCEED (with next phase prompt) or REJECTED_NEEDS_REPAIR (with self-healing corrective prompt).",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The autonomous project session ID",
        },
        phaseIndex: {
          type: "number",
          description: "0-based index of the phase being reported",
        },
        summaryOfWork: {
          type: "string",
          description: "Concrete description of the work completed in this phase",
        },
        deliveredArtifacts: {
          type: "array",
          items: {
            anyOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  summary: { type: "string" },
                  contentSnippet: { type: "string" },
                },
                required: ["name"],
              },
            ],
          },
          description: "List of delivered files, documents, or components",
        },
        verificationOutput: {
          type: "string",
          description:
            "REAL execution proof from terminal commands (test logs, build output, exit codes). Evidence over claims is strictly enforced.",
        },
        verificationCommand: {
          type: "string",
          description:
            "Optional independent test/build command (e.g. 'npm test', 'npm run typecheck') executed directly by PIEW for Zero-Trust verification.",
        },
        workingDirectory: {
          type: "string",
          description:
            "Optional working directory path for executing verificationCommand and inspecting physical delivered artifacts on disk.",
        },
        knownIssues: {
          type: "array",
          items: { type: "string" },
          description: "Optional known issues or deferred items",
        },
      },
      required: [
        "sessionId",
        "phaseIndex",
        "summaryOfWork",
        "deliveredArtifacts",
        "verificationOutput",
      ],
    },
  },
  {
    name: "piew_get_project_status",
    description:
      "Query the real-time supervision status of an autonomous project session: overall state, phase progress, audit history, and active phase dispatch prompt.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The autonomous project session ID",
        },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "piew_human_override",
    description:
      "Apply Human-in-Control intervention: inject negative constraints, force phase advance/rollback, reset retries, or halt/resume the project session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The autonomous project session ID",
        },
        action: {
          type: "string",
          enum: [
            "FORCE_ADVANCE",
            "FORCE_ROLLBACK",
            "RESET_RETRIES",
            "INJECT_CONSTRAINT",
            "HALT",
            "RESUME",
          ],
          description: "The override action to execute",
        },
        targetPhaseIndex: {
          type: "number",
          description: "Target phase index (for FORCE_ROLLBACK)",
        },
        additionalConstraint: {
          type: "string",
          description: "New negative constraint to inject (for INJECT_CONSTRAINT)",
        },
        reason: {
          type: "string",
          description: "Operator reason for audit logging",
        },
      },
      required: ["sessionId", "action"],
    },
  },
  {
    name: "piew_export_handover_bundle",
    description:
      "Export the official PIEW Audit Certificate and Handover Bundle (Markdown and JSON formats) to disk for client delivery or CI/CD compliance archives.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The autonomous project session ID to export",
        },
        targetDirectory: {
          type: "string",
          description: "Optional custom directory path to save the certificate and JSON bundle",
        },
      },
      required: ["sessionId"],
    },
  },
];

type ResponseSender = (
  id: string | number | null,
  result?: any,
  error?: any
) => void;

function formatJsonRpcResponse(
  id: string | number | null,
  result?: any,
  error?: any
) {
  if (id === null || id === undefined) return null;
  const message: Record<string, any> = {
    jsonrpc: "2.0",
    id,
  };
  if (error) {
    message.error = error;
  } else {
    message.result = result;
  }
  return message;
}

const sendStdioResponse: ResponseSender = (id, result, error) => {
  const message = formatJsonRpcResponse(id, result, error);
  if (message) {
    process.stdout.write(JSON.stringify(message) + "\n");
  }
};

async function handleToolCall(name: string, args: Record<string, any>) {
  switch (name) {
    case "piew_autopilot": {
      const result = await runAutoPilotMasterPipeline({
        prompt: args.prompt,
        context: args.context,
        referenceUrls: Array.isArray(args.referenceUrls)
          ? args.referenceUrls
          : undefined,
        taskType: args.taskType,
        stylePreset: args.stylePreset as SynthesisStylePreset,
        budgetMode: args.budgetMode as TokenBudgetMode,
        audienceLevel: args.audienceLevel,
      });

      return {
        content: [
          {
            type: "text",
            text: result.universalBlueprint?.renderedMasterPrompt || result.optimizedPrompt,
          },
        ],
        isError: false,
        _meta: {
          score: result.synthesisValidation.overallSynthesisScore,
          stylePreset: result.stylePreset,
          budgetMode: result.budgetMode,
          audienceLevel: result.audienceLevel,
          cacheHit: result.cacheHit,
          changes: result.changes,
          groundingFactsCount: result.groundingFacts?.length ?? 0,
          universalBlueprint: result.universalBlueprint,
        },
      };
    }

    case "piew_synthesize_master_prompt": {
      const result = await runAutoPilotMasterPipeline({
        prompt: args.prompt,
        context: args.context,
        taskType: args.taskType,
        stylePreset: args.stylePreset as SynthesisStylePreset,
        budgetMode: args.budgetMode as TokenBudgetMode,
      });

      return {
        content: [
          {
            type: "text",
            text: result.optimizedPrompt,
          },
        ],
        isError: false,
        _meta: {
          score: result.synthesisValidation.overallSynthesisScore,
          stylePreset: result.stylePreset,
          budgetMode: result.budgetMode,
          cacheHit: result.cacheHit,
          changes: result.changes,
        },
      };
    }

    case "piew_crawl_grounding_context": {
      const crawlResult = await runPromptCrawler({
        targetUrl: args.url,
        mode: "EXTRACT_GROUNDING_CONTEXT",
        sourceType: "DOCUMENTATION_PAGE",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                targetUrl: args.url,
                itemCount: crawlResult.items.length,
                items: crawlResult.items,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    }

    case "piew_verify_prompt_spider": {
      const budgetMode =
        (args.budgetMode as "eco" | "balanced" | "deep_audit") || "eco";
      const spiderReport = await runPromptSpider(args.prompt, {
        budgetMode,
        concurrencyLimit: 2,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                criticalGatePassed: spiderReport.criticalGatePassed,
                executedBranches: spiderReport.branches.length,
                passedCases: spiderReport.coverageSummary.passedCases,
                totalCases: spiderReport.coverageSummary.totalCases,
                qualityMetrics: spiderReport.qualityMetrics,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    }

    case "piew_start_project": {
      const initRes = initAutonomousProject({
        prompt: args.prompt,
        context: args.context,
        domainId: args.domainId,
        subtopicId: args.subtopicId,
        audienceLevel: args.audienceLevel,
        maxAttemptsPerPhase: args.maxAttemptsPerPhase,
      });

      return {
        content: [
          {
            type: "text",
            text: initRes.dispatchPrompt,
          },
        ],
        isError: false,
        _meta: {
          sessionId: initRes.session.sessionId,
          title: initRes.session.masterBlueprint.title,
          domain: initRes.session.domainId,
          subtopic: initRes.session.subtopicId,
          totalPhases: initRes.session.phases.length,
          currentPhaseIndex: initRes.session.currentPhaseIndex,
          overallStatus: initRes.session.overallStatus,
          activePhase: initRes.session.phases[0],
          phases: initRes.session.phases,
        },
      };
    }

    case "piew_submit_phase_work": {
      const auditRes = auditAndAdvancePhase({
        sessionId: args.sessionId,
        phaseIndex: args.phaseIndex,
        summaryOfWork: args.summaryOfWork,
        deliveredArtifacts: args.deliveredArtifacts,
        verificationOutput: args.verificationOutput,
        verificationCommand: args.verificationCommand,
        workingDirectory: args.workingDirectory,
        knownIssues: args.knownIssues,
      });

      return {
        content: [
          {
            type: "text",
            text: auditRes.nextActionPrompt,
          },
        ],
        isError: false,
        _meta: {
          verdict: auditRes.verdict,
          score: auditRes.score,
          evidenceCheckPassed: auditRes.evidenceCheckPassed,
          missingDeliverables: auditRes.missingDeliverables,
          consistencyViolations: auditRes.consistencyViolations,
          scopeCreepOrForbiddenViolations: auditRes.scopeCreepOrForbiddenViolations,
          independentExecutionResult: auditRes.independentExecutionResult,
          artifactIntegrity: auditRes.artifactIntegrity,
        },
      };
    }

    case "piew_get_project_status": {
      const statusRes = getProjectStatus(args.sessionId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(statusRes, null, 2),
          },
        ],
        isError: false,
        _meta: {
          sessionId: statusRes.sessionId,
          overallStatus: statusRes.overallStatus,
          progressPercentage: statusRes.progressPercentage,
          currentPhaseIndex: statusRes.currentPhaseIndex,
          activePhase: statusRes.activePhase,
          phases: statusRes.phases,
        },
      };
    }

    case "piew_human_override": {
      const overrideRes = applyHumanOverride({
        sessionId: args.sessionId,
        action: args.action,
        targetPhaseIndex: args.targetPhaseIndex,
        additionalConstraint: args.additionalConstraint,
        reason: args.reason,
      });

      return {
        content: [
          {
            type: "text",
            text: `${overrideRes.summary}\n\n${overrideRes.updatedPrompt}`,
          },
        ],
        isError: false,
        _meta: {
          sessionId: overrideRes.session.sessionId,
          overallStatus: overrideRes.session.overallStatus,
          currentPhaseIndex: overrideRes.session.currentPhaseIndex,
          summary: overrideRes.summary,
        },
      };
    }

    case "piew_export_handover_bundle": {
      const exportRes = exportHandoverBundle(
        args.sessionId,
        args.targetDirectory
      );
      if (!exportRes.success) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Gagal mengekspor bundel serah terima: ${exportRes.error}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `✅ Bundel serah terima dan sertifikat audit otonom berhasil diekspor!\n- Markdown: ${exportRes.markdownPath}\n- JSON: ${exportRes.jsonPath}`,
          },
        ],
        isError: false,
        _meta: {
          sessionId: args.sessionId,
          markdownPath: exportRes.markdownPath,
          jsonPath: exportRes.jsonPath,
        },
      };
    }

    default:
      throw new Error(`Tool "${name}" tidak ditemukan pada PIEW MCP Server.`);
  }
}

async function handleMessage(
  rawMessage: string,
  sendResponse: ResponseSender = sendStdioResponse
) {
  // Sanitasi Windows CRLF (\r\n -> \n)
  const trimmed = rawMessage.replace(/\r$/, "").trim();
  if (!trimmed) return;

  let request: any;
  try {
    request = JSON.parse(trimmed);
  } catch (err: any) {
    sendResponse(null, undefined, {
      code: -32700,
      message: "Parse error: format JSON tidak valid.",
    });
    return;
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      case "initialize":
        sendResponse(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
        });
        break;

      case "notifications/initialized":
      case "initialized":
        // Notification, no reply needed
        break;

      case "ping":
        sendResponse(id, {});
        break;

      case "tools/list":
        sendResponse(id, {
          tools: TOOLS,
        });
        break;

      case "tools/call": {
        const { name, arguments: toolArgs = {} } = params || {};
        const callResult = await handleToolCall(name, toolArgs);
        sendResponse(id, callResult);
        break;
      }

      default:
        if (id !== undefined && id !== null) {
          sendResponse(id, undefined, {
            code: -32601,
            message: `Method "${method}" tidak didukung oleh PIEW MCP Server.`,
          });
        }
        break;
    }
  } catch (err: any) {
    process.stderr.write(`[PIEW-MCP-ERROR] ${err.message}\n`);
    sendResponse(id, undefined, {
      code: -32000,
      message: err.message,
    });
  }
}

let pendingRequests = 0;
let isStdinClosed = false;
let activeHttpServer: http.Server | null = null;

function checkExitCondition() {
  // Jika HTTP/SSE server sedang aktif, jangan exit otomatis saat stdin tertutup
  if (activeHttpServer) {
    return;
  }
  if (isStdinClosed && pendingRequests === 0) {
    process.exit(0);
  }
}

async function processStdioLine(line: string) {
  pendingRequests++;
  try {
    await handleMessage(line, sendStdioResponse);
  } finally {
    pendingRequests--;
    checkExitCondition();
  }
}

/**
 * Menjalankan server HTTP/SSE opsional jika diminta via flag --sse atau --port=<num>
 */
function startSseServer(port: number) {
  const sseSessions = new Map<string, http.ServerResponse>();

  const server = http.createServer(async (req, res) => {
    req.on("error", () => {});
    res.on("error", () => {});

    // Enable CORS for universal IDE and browser access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || "/", `http://localhost:${port}`);

    // GET /health or /: Status check
    if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          server: SERVER_NAME,
          version: SERVER_VERSION,
          toolsCount: TOOLS.length,
          activeSseSessions: sseSessions.size,
        })
      );
      return;
    }

    // GET /sse: Establish Server-Sent Events stream
    if (req.method === "GET" && parsedUrl.pathname === "/sse") {
      const sessionId = crypto.randomUUID();
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      sseSessions.set(sessionId, res);
      process.stderr.write(`[PIEW-MCP-SSE] Session tersambung: ${sessionId}\n`);

      // Send initial endpoint announcement as per MCP SSE spec
      res.write(`event: endpoint\ndata: /message?sessionId=${sessionId}\n\n`);

      req.on("close", () => {
        sseSessions.delete(sessionId);
        process.stderr.write(`[PIEW-MCP-SSE] Session ditutup: ${sessionId}\n`);
      });
      return;
    }

    // POST /message: Receive JSON-RPC messages and send back via SSE
    if (req.method === "POST" && parsedUrl.pathname === "/message") {
      const sessionId = parsedUrl.searchParams.get("sessionId");
      const clientRes = sessionId ? sseSessions.get(sessionId) : null;

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        if (!body.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Empty request body" }));
          return;
        }

        const sendSseResponse: ResponseSender = (id, result, error) => {
          const message = formatJsonRpcResponse(id, result, error);
          if (message && clientRes) {
            clientRes.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
          }
        };

        // Acknowledge receipt of POST message
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accepted: true }));

        // Process message and stream response back to client SSE connection
        await handleMessage(body, sendSseResponse);
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  });

  server.on("error", (err) => {
    process.stderr.write(`[PIEW-MCP-SSE] HTTP Server Error: ${err.message}\n`);
  });

  server.listen(port, "0.0.0.0", () => {
    process.stderr.write(
      `[PIEW MCP Server v${SERVER_VERSION}] SSE Transport aktif di http://0.0.0.0:${port}/sse\n`
    );
  });

  activeHttpServer = server;
  return server;
}

function main() {
  const args = process.argv.slice(2);
  let ssePort: number | null = null;

  for (const arg of args) {
    if (arg === "--sse") {
      ssePort = 3125;
    } else if (arg.startsWith("--port=")) {
      ssePort = parseInt(arg.split("=")[1], 10);
    }
  }

  if (process.env.PIEW_MCP_PORT) {
    ssePort = parseInt(process.env.PIEW_MCP_PORT, 10);
  }

  if (ssePort) {
    startSseServer(ssePort);
  }

  // Tetap aktifkan listener Stdio JSON-RPC kecuali mode standalone SSE eksplisit
  if (!args.includes("--sse-only")) {
    process.stderr.write(
      `[PIEW MCP Server v${SERVER_VERSION}] Menunggu koneksi JSON-RPC di stdio...\n`
    );

    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    rl.on("line", (line) => {
      processStdioLine(line);
    });

    rl.on("close", () => {
      isStdinClosed = true;
      checkExitCondition();
    });
  }
}

main();
