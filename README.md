**English** · [Bahasa Indonesia](docs/readme/README_id.md)

# PIEW: Prompt Intelligence & Engineering Workspace

### Autonomous Lead Architect, Empirical Quality Gatekeeper & Model Context Protocol (MCP) Runtime

**Eliminate AI coding agent hallucinations, infinite loops, and the self-report trap with evidence-based physical verification.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%202.0-5c4ee5?style=flat-square)](https://modelcontextprotocol.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-orange?style=flat-square)](#monorepo-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

**[Quick Start](#quick-start)** · **[Why PIEW](#why-piew)** · **[Core Capabilities](#core-capabilities)** · **[How PIEW Works](#how-piew-works)** · **[MCP Integration](#ide-integration-mcp-server)** · **[CLI Reference](#cli-reference)** · **[Monorepo Map](#monorepo-architecture)**

```bash
npm run piew -- --help
```

> [!IMPORTANT]
> **Evidence Over Claims**: AI coding agents frequently claim a feature is complete while leaving broken imports, failing unit tests, or silently violating architecture constraints. PIEW never trusts agent self-reports; it verifies physical code diffs, compiler exit codes, and test runners before greenlighting progress.

---

## Why PIEW?

Modern AI coding agents (Cursor, Claude Code, Windsurf, Aider) are exceptional implementors, but they lack autonomous architectural governance:

| The AI Agent Failure Mode | The Real-World Impact | How PIEW Solves It |
|---|---|---|
| **Self-Report Trap** | Agent claims *"Everything is built and working!"* despite syntax errors. | **Empirical Audit**: Requires physical `git diff` proof and compiler exit code 0. |
| **Infinite Revision Loop** | Agent hallucinates repetitive fixes, burning tokens until context is exhausted. | **3x Circuit Breaker**: Hard limit of 3 revisions per milestone before escalating to a human. |
| **Negative Constraint Drift** | Agent uses dummy mock data or deletes critical transaction schemas. | **Negative Constraint Guard**: AST & regex auditing to prevent forbidden patterns. |
| **Scope Creep Monolith** | Agent tries to build DB, API, and UI in a single turn, resulting in broken stubs. | **Progressive Phasing**: Deconstructs projects into linear milestones (DB &rarr; API &rarr; UI). |

---

## Quick Start

### 1. Connect to Cursor / Claude Desktop (Model Context Protocol)

PIEW provides a native MCP server exposing physical code inspection and autonomous supervision tools to your IDE.

Add to your `cursor.json` or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "piew": {
      "command": "npx",
      "args": ["tsx", "scripts/piew-mcp-server.ts"]
    }
  }
}
```

Now, your IDE agent can autonomously invoke PIEW's quality gatekeeper before marking any task as complete.

### 2. Standalone Terminal CLI (PIEW CLI)

Run empirical quality audits directly on your local workspace:

```bash
# Verify active workspace against TypeScript compiler and test runners
npm run piew -- --audit --session=piew-proj-alpha --build-cmd="npm run typecheck" --test-cmd="npm test"

# Synthesize a high-structure Master Prompt with anti-scope-creep constraints
npm run piew -- "Build a bakery inventory management system. DO NOT use physical POS hardware." --supervise
```

### 3. Launch Web Mission Control (Next.js 15)

```bash
# Install dependencies across all 8 monorepo workspaces
npm install

# Start the web development server
npm run dev --workspace=web
```
Open [http://localhost:3000](http://localhost:3000) to inspect real-time audit graphs, milestone transitions, and circuit breaker metrics.

---

## Core Capabilities

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PIEW SUPERVISOR ENGINE                            │
├───────────────────────┬──────────────────────────┬──────────────────────────┤
│ 1. EMPIRICAL AUDIT    │ 2. DETERMINISTIC STEER   │ 3. ENTERPRISE MCP        │
│ • Git Diff Inspector  │ • 4-Component Directive  │ • 10 Standard Connectors │
│ • Terminal Verifier   │ • 3x Retry Circuit Break │ • GitHub, Linear, Sentry │
│ • Docker Health Check │ • Progressive Phasing    │ • Figma, DB, Puppeteer   │
│ • Negative Guard      │ • Human-in-the-Loop Gate │ • Sandboxed File System  │
└───────────────────────┴──────────────────────────┴──────────────────────────┘
```

### 1. Empirical Quality Gatekeeper (`packages/prompt-engine/src/supervisor/`)
* **`gitDiffInspector`**: Inspects physical additions, modifications, and flags unexpected file deletions.
* **`terminalVerifier`**: Executes build and test commands with isolated 60s timeout guards and structured error line parsing (`file(line,col): error`).
* **`dockerHealthChecker`**: Validates container runtime health, exposed ports, and crash-loop patterns.
* **`negativeConstraintGuard`**: Blocks regressions against explicit user prohibitions (e.g., forbidding dummy data or mock APIs).

### 2. Deterministic Steering & Circuit Breaker
When an audit fails, PIEW does not send vague feedback. It generates a **4-Component Steering Directive**:
1. **Empirical Diagnosis**: Exact compiler or runtime failure extracted from stderr.
2. **Defective Files & Lines**: Absolute file path, line number, and column.
3. **Mandatory Action**: Deterministic steps required to resolve the failure.
4. **Tolerance Boundaries**: Inviolable constraints and zero-tolerance regression rules.

*If an agent fails 3 consecutive repair attempts on the same milestone, PIEW trips the **Circuit Breaker** (`BLOCKED_CIRCUIT_BREAKER_TRIGGERED`), stopping token waste and requesting human intervention.*

### 3. 10 Enterprise MCP Connectors (`packages/provider-adapters/src/mcp-catalog.ts`)
Native integrations for production engineering workflows:
* **GitHub**: PR reviews, branch operations, and diff analysis.
* **Linear**: Issue synchronization and milestone tracking.
* **Sentry**: Crash telemetry and stack trace ingestion.
* **Figma**: UI token extraction and layout specs.
* **Docker Engine**: Local container diagnostics and log extraction.
* **Database**: PostgreSQL / SQLite schema inspection and query testing.
* **Brave / Firecrawl Search**: SSRF-protected technical documentation retrieval.
* **Sandboxed File System**: Safe workspace file operations.
* **Memory Bridge**: Semantic long-term retrieval via Qdrant & Mem0.
* **Puppeteer**: Headless browser DOM and screenshot capture.

---

## How PIEW Works

```text
User / Task Goal
       │
       ▼
┌────────────────────────┐
│  Phase Decomposition   │ ── Linear Milestones (DB ➔ API ➔ UI)
└────────────────────────┘
       │
       ▼
┌────────────────────────┐
│  Coding Agent Executes │ ── Cursor / Claude Code modifies local files
└────────────────────────┘
       │
       ▼
┌────────────────────────┐
│  PIEW Empirical Audit  │ ── Git Diff + Compiler (tsc) + Test Runner + Docker
└────────────────────────┘
       │
       ├─────────────────────────────────┐
       ▼ [PASS]                          ▼ [FAIL]
┌────────────────────────┐      ┌────────────────────────┐
│ Unlock Next Milestone  │      │ Issue Steering Prompt  │ ◄── Max 3 Retries
└────────────────────────┘      └────────────────────────┘
                                         │
                                         ▼ [Exceeded 3x]
                                ┌────────────────────────┐
                                │ TRIP CIRCUIT BREAKER   │ ── Escalate to Human
                                └────────────────────────┘
```

---

## Monorepo Architecture

PIEW is architected as an isolated, type-safe **Modular Monolith** using `npm workspaces`:

```text
prompt-workspace/
├── apps/
│   └── web/                         # Next.js 15 (Turbopack, App Router, Tailwind CSS, Lucide)
│       └── src/app/api/             # Next.js API Routes (/api/supervision, /api/agent-runs, /api/skills)
│
├── packages/
│   ├── prompt-contracts/            # Zod contracts & Single Source of Truth for schemas
│   ├── prompt-engine/               # Core engine & Autonomous Supervisor runtime
│   │   ├── src/supervisor/          # Physical audit tools, Steering Director & Circuit Breaker
│   │   └── scripts/                 # Empirical supervisor test suites
│   ├── provider-adapters/           # Multi-provider cascade router & 10 Enterprise MCP Connectors
│   ├── prompt-crawler/              # SSRF-guarded documentation scraper & secret redactor
│   ├── prompt-spider/               # 5-branch adversarial stress testing matrix
│   ├── domain-rules/                # Versioned domain engineering rule packs
│   └── database/                    # Prisma ORM & SQLite WAL storage engine
│
├── docs/
│   ├── readme/                      # Multi-language documentation (README_id.md)
│   ├── architecture/                # Architecture Decision Records (ADRs) & specs
│   └── product/                     # Release notes & user guides
│
├── scripts/
│   ├── piew-cli.ts                  # Autonomous supervisor CLI runner
│   └── piew-mcp-server.ts           # Standard Model Context Protocol (MCP) server
│
├── SUPERVISOR_EXECUTION_STATE.md    # Durable physical runtime checkpoint state
├── RANCANG_BANGUN_PIEW_AUTONOMOUS_SUPERVISOR.pdf  # Canonical 8-page architecture specification
└── package.json                     # Monorepo root workspace configuration
```

---

## Scripts & Quality Gates

All packages enforce strict zero-regression standards:

```bash
# Verify TypeScript compilation across all 8 workspaces
npm run typecheck

# Run the comprehensive autonomous supervisor empirical test suite
npx tsx packages/prompt-engine/scripts/test-empirical-supervisor.ts

# Test enterprise MCP catalog connectivity & JSON-RPC schema compliance
npm run test:mcp

# Test multi-provider failover pool and cascade router
npm run test:providers

# Run full monorepo production build
npm run build
```

---

## Contributing & Security

* **Contributing Guidelines**: Please review [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions, DoR (Definition of Ready), and DoD (Definition of Done).
* **Security & Vulnerability Reporting**: Refer to [SECURITY.md](SECURITY.md) for disclosure policies and secret rotation protocols.
* **Strict Boundary Rule**: Backend agents modify `packages/*` and `scripts/*`; Frontend agents modify `apps/web/*`.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
