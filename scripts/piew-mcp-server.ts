#!/usr/bin/env node
/**
 * PIEW MCP Server — Model Context Protocol Server (Stdio JSON-RPC 2.0)
 *
 * Menghubungkan mesin PIEW langsung ke AI Coding Agents (Cursor, Claude Code, Windsurf)
 * Menyediakan 3 MCP Tools:
 *   1. piew_synthesize_master_prompt
 *   2. piew_crawl_grounding_context
 *   3. piew_verify_prompt_spider
 */

import readline from "node:readline";
import {
  runAutoPilotMasterPipeline,
  SynthesisStylePreset,
  TokenBudgetMode,
} from "@prompt-workspace/prompt-engine";
import { runPromptCrawler } from "@prompt-workspace/prompt-crawler";
import { runPromptSpider } from "@prompt-workspace/prompt-spider";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "piew-mcp-server";
const SERVER_VERSION = "2.2.0";

const TOOLS = [
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
];

function sendResponse(id: string | number | null, result?: any, error?: any) {
  if (id === null || id === undefined) return;
  const message: Record<string, any> = {
    jsonrpc: "2.0",
    id,
  };
  if (error) {
    message.error = error;
  } else {
    message.result = result;
  }
  process.stdout.write(JSON.stringify(message) + "\n");
}

async function handleToolCall(name: string, args: Record<string, any>) {
  switch (name) {
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
      const budgetMode = (args.budgetMode as "eco" | "balanced" | "deep_audit") || "eco";
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

    default:
      throw new Error(`Tool "${name}" tidak ditemukan pada PIEW MCP Server.`);
  }
}

async function handleMessage(rawMessage: string) {
  const trimmed = rawMessage.trim();
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

function checkExitCondition() {
  if (isStdinClosed && pendingRequests === 0) {
    process.exit(0);
  }
}

async function processLine(line: string) {
  pendingRequests++;
  try {
    await handleMessage(line);
  } finally {
    pendingRequests--;
    checkExitCondition();
  }
}

function main() {
  process.stderr.write(`[PIEW MCP Server v${SERVER_VERSION}] Menunggu koneksi JSON-RPC di stdio...\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", (line) => {
    processLine(line);
  });

  rl.on("close", () => {
    isStdinClosed = true;
    checkExitCondition();
  });
}

main();
