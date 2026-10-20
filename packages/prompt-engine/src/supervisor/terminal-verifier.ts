import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { AuditDefectItem } from "@prompt-workspace/prompt-contracts";

export interface TerminalExecutionResult {
  executed: boolean;
  command: string;
  exitCode: number | null;
  passed: boolean;
  durationMs: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  combinedSnippet: string;
  timedOut: boolean;
  error?: string;
  defects: AuditDefectItem[];
}

export interface TerminalExecutionOptions {
  workingDirectory: string;
  command: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  maxOutputChars?: number;
}

/**
 * Ekstraksi galat kompiler TypeScript atau compiler standar ke dalam AuditDefectItem
 */
export function parseCompilerAndLinterErrors(rawOutput: string): AuditDefectItem[] {
  const defects: AuditDefectItem[] = [];
  if (!rawOutput) return defects;

  const lines = rawOutput.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pola 1: TypeScript error misal `src/index.ts(12,5): error TS2322: Type 'string' is not assignable...`
    const tsMatch = trimmed.match(/^([a-zA-Z0-9_\-\.\/]+)\((\d+),(\d+)\):\s*(error\s+TS\d+:\s*.+)$/i);
    if (tsMatch) {
      defects.push({
        severity: "CRITICAL",
        category: "COMPILER_TYPE_ERROR",
        fileLocation: tsMatch[1],
        lineRange: `Line ${tsMatch[2]}, Col ${tsMatch[3]}`,
        failureMessage: tsMatch[4],
        rawOutputSnippet: trimmed,
      });
      continue;
    }

    // Pola 2: Jest/Vitest failed test `FAIL  src/tests/auth.test.ts`
    const testFailMatch = trimmed.match(/^FAIL\s+([a-zA-Z0-9_\-\.\/]+)/i);
    if (testFailMatch) {
      defects.push({
        severity: "CRITICAL",
        category: "TEST_SUITE_FAILURE",
        fileLocation: testFailMatch[1],
        failureMessage: `Test suite execution failed: ${trimmed}`,
        rawOutputSnippet: trimmed,
      });
      continue;
    }

    // Pola 3: Error: Cannot find module '...'
    const moduleMatch = trimmed.match(/^Error:\s*Cannot find module\s*['"]([^'"]+)['"]/i);
    if (moduleMatch) {
      defects.push({
        severity: "CRITICAL",
        category: "MISSING_DEPENDENCY",
        failureMessage: `Modul dependensi tidak ditemukan: ${moduleMatch[1]}`,
        rawOutputSnippet: trimmed,
      });
      continue;
    }

    // Pola 4: SyntaxError: Unexpected token ...
    if (/SyntaxError:/i.test(trimmed)) {
      defects.push({
        severity: "CRITICAL",
        category: "SYNTAX_ERROR",
        failureMessage: trimmed,
        rawOutputSnippet: trimmed,
      });
      continue;
    }
  }

  return defects;
}

/**
 * executeVerificationCommand: Menjalankan perintah terminal nyata di working directory
 * dengan pengaman batas waktu (timeout guard) dan ekstraksi galat otomatis.
 */
export function executeVerificationCommand(
  options: TerminalExecutionOptions
): TerminalExecutionResult {
  const {
    workingDirectory,
    command,
    timeoutMs = 60000,
    env = {},
    maxOutputChars = 4000,
  } = options;

  if (!fs.existsSync(workingDirectory)) {
    return {
      executed: false,
      command,
      exitCode: 1,
      passed: false,
      durationMs: 0,
      stdoutSnippet: "",
      stderrSnippet: `Working directory does not exist: ${workingDirectory}`,
      combinedSnippet: `Directory not found: ${workingDirectory}`,
      timedOut: false,
      error: `Directory not found: ${workingDirectory}`,
      defects: [
        {
          severity: "CRITICAL",
          category: "INVALID_WORKSPACE",
          failureMessage: `Working directory tidak ditemukan pada disk: ${workingDirectory}`,
        },
      ],
    };
  }

  const startTime = Date.now();
  let timedOut = false;

  try {
    const res = spawnSync(command, {
      cwd: workingDirectory,
      shell: true,
      timeout: timeoutMs,
      encoding: "utf-8",
      env: {
        ...process.env,
        ...env,
        CI: "true",
      },
      maxBuffer: 4 * 1024 * 1024,
    });

    const durationMs = Date.now() - startTime;
    if (res.error && (res.error as any).code === "ETIMEDOUT") {
      timedOut = true;
    }

    const stdout = res.stdout || "";
    const stderr = res.stderr || "";
    const exitCode = timedOut ? -1 : res.status;
    const passed = exitCode === 0;

    const truncate = (str: string, max: number) => {
      if (str.length <= max) return str;
      const head = str.slice(0, Math.floor(max * 0.6));
      const tail = str.slice(-Math.floor(max * 0.4));
      return `${head}\n... [${str.length - max} karakter dipotong] ...\n${tail}`;
    };

    const stdoutSnippet = truncate(stdout, maxOutputChars);
    const stderrSnippet = truncate(stderr, maxOutputChars);
    const combinedRaw = (stdout + "\n" + stderr).trim();
    const combinedSnippet = truncate(combinedRaw, maxOutputChars);

    // Parse defects jika gagal
    const defects = passed ? [] : parseCompilerAndLinterErrors(combinedRaw);
    if (!passed && defects.length === 0) {
      defects.push({
        severity: "CRITICAL",
        category: "COMMAND_FAILURE",
        failureMessage: `Perintah [${command}] gagal dengan exit code ${exitCode}`,
        rawOutputSnippet: (stderrSnippet || stdoutSnippet || `Exit code: ${exitCode}`).slice(0, 300),
      });
    }

    return {
      executed: true,
      command,
      exitCode,
      passed,
      durationMs,
      stdoutSnippet,
      stderrSnippet,
      combinedSnippet,
      timedOut,
      error: res.error ? res.error.message : undefined,
      defects,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      executed: false,
      command,
      exitCode: 1,
      passed: false,
      durationMs,
      stdoutSnippet: "",
      stderrSnippet: (err as Error).message,
      combinedSnippet: (err as Error).message,
      timedOut: false,
      error: (err as Error).message,
      defects: [
        {
          severity: "CRITICAL",
          category: "SPAWN_ERROR",
          failureMessage: `Gagal menjalankan perintah verifikasi: ${(err as Error).message}`,
        },
      ],
    };
  }
}
