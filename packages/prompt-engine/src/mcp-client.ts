import { spawn, ChildProcess } from "node:child_process";
import readline from "node:readline";
import {
  McpConnectorConfig,
  McpTool,
  McpResource,
  McpConnectionDiscoveryResult,
  McpConnectionStatus,
} from "@prompt-workspace/prompt-contracts";
import {
  getMcpConnector,
  updateConnectorDiscoveryResult,
} from "@prompt-workspace/provider-adapters";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Heuristik pendeteksi apakah sebuah tool bersifat mutatif (Write / Modify)
 */
export function isToolMutatingHeuristic(
  toolName: string,
  explicitIsMutating?: boolean
): boolean {
  if (typeof explicitIsMutating === "boolean") {
    return explicitIsMutating;
  }
  const mutatingPattern =
    /(?:create|update|delete|post|write|add|modify|send|remove|patch|exec|drop|insert|alter|publish|set|run)/i;
  return mutatingPattern.test(toolName);
}

/**
 * Live MCP Client untuk protokol JSON-RPC 2.0 (Stdio & HTTP/SSE)
 */
export class McpLiveClient {
  private child: ChildProcess | null = null;
  private pendingRequests = new Map<
    number | string,
    {
      resolve: (val: any) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private nextId = 1;
  private isClosed = false;

  constructor(
    private connector: McpConnectorConfig,
    private timeoutMs: number = 10000
  ) {}

  /**
   * Menghubungkan client ke server MCP melalui transport yang sesuai
   */
  public async connect(): Promise<void> {
    if (this.connector.transportType === "stdio") {
      await this.connectStdio();
    } else {
      // Untuk HTTP/SSE, verifikasi ketersediaan endpoint via fetch health/probe
      await this.probeHttp();
    }
  }

  /**
   * Membuka koneksi Stdio child process
   */
  private async connectStdio(): Promise<void> {
    const stdioConfig = this.connector.stdioConfig;
    if (!stdioConfig || !stdioConfig.command) {
      throw new Error(
        `Konektor '${this.connector.connectorId}' tidak memiliki konfigurasi stdio (command wajib diisi).`
      );
    }

    let command = stdioConfig.command;
    const args = stdioConfig.args || [];

    // Normalisasi command npm/npx di lingkungan Windows
    if (
      process.platform === "win32" &&
      (command === "npx" || command === "npm") &&
      !command.endsWith(".cmd")
    ) {
      command = `${command}.cmd`;
    }

    const env = {
      ...process.env,
      ...(stdioConfig.envVars || {}),
    };

    return new Promise((resolve, reject) => {
      try {
        this.child = spawn(command, args, {
          env,
          stdio: ["pipe", "pipe", "pipe"],
          shell: process.platform === "win32",
        });

        let hasResolved = false;

        this.child.on("error", (err) => {
          if (!hasResolved) {
            hasResolved = true;
            reject(
              new Error(
                `Gagal meluncurkan server MCP [${command}]: ${err.message}`
              )
            );
          }
        });

        if (this.child.stdout) {
          const rl = readline.createInterface({
            input: this.child.stdout,
            terminal: false,
          });

          rl.on("line", (line) => {
            this.handleIncomingLine(line);
          });
        }

        // Jika child process hidup dan tidak langsung crash, anggap terhubung
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }
        }, 300);
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Menguji endpoint HTTP/SSE
   */
  private async probeHttp(): Promise<void> {
    const httpConfig = this.connector.httpConfig;
    if (!httpConfig || !httpConfig.endpointUrl) {
      throw new Error(
        `Konektor '${this.connector.connectorId}' tidak memiliki endpointUrl HTTP/SSE.`
      );
    }
  }

  /**
   * Menangani baris JSON-RPC dari stdout server MCP
   */
  private handleIncomingLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("{")) return;

    try {
      const msg: JsonRpcResponse = JSON.parse(trimmed);
      if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
        const { resolve, reject, timer } = this.pendingRequests.get(msg.id)!;
        clearTimeout(timer);
        this.pendingRequests.delete(msg.id);

        if (msg.error) {
          reject(new Error(`MCP Error [${msg.error.code}]: ${msg.error.message}`));
        } else {
          resolve(msg.result);
        }
      }
    } catch {
      // Abaikan baris log non-JSON
    }
  }

  /**
   * Mengirim request JSON-RPC 2.0 dan menunggu respons
   */
  public async request(
    method: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    if (this.connector.transportType === "stdio") {
      return this.requestStdio(method, params);
    } else {
      return this.requestHttp(method, params);
    }
  }

  /**
   * Mengirim request via Stdio
   */
  private async requestStdio(
    method: string,
    params: Record<string, any>
  ): Promise<any> {
    if (!this.child || !this.child.stdin || this.isClosed) {
      throw new Error(
        `Server MCP [${this.connector.connectorId}] tidak aktif atau stdin tertutup.`
      );
    }

    const id = this.nextId++;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(
            new Error(
              `MCP Request '${method}' ke [${this.connector.connectorId}] timed out setelah ${this.timeoutMs}ms.`
            )
          );
        }
      }, this.timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.child!.stdin!.write(JSON.stringify(payload) + "\n");
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Mengirim notifikasi JSON-RPC (tanpa id, tanpa menunggu respons)
   */
  public sendNotification(
    method: string,
    params: Record<string, any> = {}
  ): void {
    if (this.connector.transportType === "stdio" && this.child?.stdin) {
      const payload = {
        jsonrpc: "2.0",
        method,
        params,
      };
      try {
        this.child.stdin.write(JSON.stringify(payload) + "\n");
      } catch {}
    }
  }

  /**
   * Mengirim request via HTTP POST
   */
  private async requestHttp(
    method: string,
    params: Record<string, any>
  ): Promise<any> {
    const httpConfig = this.connector.httpConfig!;
    const id = this.nextId++;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(httpConfig.customHeaders || {}),
    };

    if (httpConfig.apiKeyOrToken) {
      if (httpConfig.authHeaderType === "bearer") {
        headers["Authorization"] = `Bearer ${httpConfig.apiKeyOrToken}`;
      } else if (httpConfig.authHeaderType === "api_key") {
        headers["X-API-Key"] = httpConfig.apiKeyOrToken;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(httpConfig.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(
          `HTTP Error ${res.status}: ${res.statusText || "Gagal menghubungi endpoint MCP"}`
        );
      }

      const data: JsonRpcResponse = await res.json();
      if (data.error) {
        throw new Error(
          `MCP Error [${data.error.code}]: ${data.error.message}`
        );
      }
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Menjalankan siklus inisialisasi & discovery tools/resources
   */
  public async performHandshakeAndDiscovery(): Promise<{
    tools: McpTool[];
    resources: McpResource[];
  }> {
    // 1. Handshake initialize
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: "piew-mcp-connector-hub",
        version: "1.0.0",
      },
    });

    // 2. Kirim notifikasi initialized
    this.sendNotification("notifications/initialized", {});

    // 3. Ambil daftar tools
    let rawTools: any[] = [];
    try {
      const toolsResult = await this.request("tools/list", {});
      if (toolsResult && Array.isArray(toolsResult.tools)) {
        rawTools = toolsResult.tools;
      }
    } catch (e: any) {
      console.warn(`[MCP-Client] Gagal mengambil tools/list:`, e.message);
    }

    // 4. Ambil daftar resources
    let rawResources: any[] = [];
    try {
      const resourcesResult = await this.request("resources/list", {});
      if (resourcesResult && Array.isArray(resourcesResult.resources)) {
        rawResources = resourcesResult.resources;
      }
    } catch {}

    const tools: McpTool[] = rawTools.map((t) => ({
      name: t.name,
      description: t.description || "",
      inputSchema: t.inputSchema || {},
      isMutating: isToolMutatingHeuristic(t.name, t.isMutating),
    }));

    const resources: McpResource[] = rawResources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));

    return { tools, resources };
  }

  /**
   * Mengeksekusi sebuah tool pada server MCP
   */
  public async callTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    return this.request("tools/call", {
      name: toolName,
      arguments: args,
    });
  }

  /**
   * Menutup koneksi dan mematikan child process jika ada
   */
  public disconnect(): void {
    this.isClosed = true;
    for (const [id, { reject, timer }] of this.pendingRequests.entries()) {
      clearTimeout(timer);
      reject(new Error(`MCP Client diputus saat request ${id} sedang berjalan.`));
    }
    this.pendingRequests.clear();

    if (this.child) {
      try {
        this.child.stdin?.end();
        this.child.kill("SIGTERM");
      } catch {}
      this.child = null;
    }
  }
}

/**
 * Fungsi Diagnostik & Tool Discovery Nyata (Tombol ⚡️ Test & Discover)
 */
export async function testAndDiscoverMcpConnector(
  connectorId: string,
  customStorePath?: string,
  timeoutMs: number = 8000
): Promise<McpConnectionDiscoveryResult> {
  const startTime = Date.now();
  const connector = await getMcpConnector(connectorId, customStorePath, true);

  if (!connector) {
    return {
      ok: false,
      connectorId,
      connectionStatus: "error",
      latencyMs: 0,
      discoveredTools: [],
      discoveredResources: [],
      message: `MCP Connector '${connectorId}' tidak ditemukan di sistem.`,
    };
  }

  const client = new McpLiveClient(connector, timeoutMs);

  try {
    await client.connect();
    const { tools, resources } = await client.performHandshakeAndDiscovery();
    const latencyMs = Date.now() - startTime;

    // Perbarui status dan hasil discovery ke store
    await updateConnectorDiscoveryResult(
      connectorId,
      {
        connectionStatus: "connected",
        latencyMs,
        discoveredTools: tools,
        discoveredResources: resources,
        errorMessage: undefined,
      },
      customStorePath
    );

    return {
      ok: true,
      connectorId,
      connectionStatus: "connected",
      latencyMs,
      discoveredTools: tools,
      discoveredResources: resources,
      message: `Koneksi berhasil! Terhubung ke '${connector.name}' (${latencyMs}ms). Ditemukan ${tools.length} tool & ${resources.length} resource.`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.message || "Gagal melakukan handshake dengan server MCP.";

    await updateConnectorDiscoveryResult(
      connectorId,
      {
        connectionStatus: "error",
        latencyMs,
        errorMessage: errorMsg,
      },
      customStorePath
    );

    return {
      ok: false,
      connectorId,
      connectionStatus: "error",
      latencyMs,
      discoveredTools: connector.discoveredTools || [],
      discoveredResources: connector.discoveredResources || [],
      message: `Uji koneksi gagal ke '${connector.name}': ${errorMsg}`,
    };
  } finally {
    client.disconnect();
  }
}
