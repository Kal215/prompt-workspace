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
} from "@prompt-workspace/prompt-engine";
import {
  SynthesisStylePreset,
  TokenBudgetMode,
} from "@prompt-workspace/prompt-contracts";
import { runPromptCrawler } from "@prompt-workspace/prompt-crawler";
import { runPromptSpider } from "@prompt-workspace/prompt-spider";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "piew-mcp-server";
const SERVER_VERSION = "2.2.0";

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
          groundingFactsCount: result.groundingFacts?.length ?? 0,
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
