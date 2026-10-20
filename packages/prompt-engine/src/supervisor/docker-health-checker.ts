import { execSync } from "node:child_process";
import { AuditDefectItem } from "@prompt-workspace/prompt-contracts";

export interface DockerHealthCheckResult {
  status: "RUNNING" | "STOPPED" | "CRASH_LOOP" | "NOT_CONFIGURED";
  containerId?: string;
  containerName?: string;
  image?: string;
  portsSnippet?: string;
  logTailSnippet?: string;
  restartCount?: number;
  summary: string;
  defects: AuditDefectItem[];
}

export interface DockerHealthCheckOptions {
  enabled: boolean;
  containerNameOrId?: string;
  expectedPorts?: number[];
  tailLines?: number;
}

/**
 * inspectDockerHealth: Memeriksa kestabilan kontainer Docker, mendeteksi crash loop,
 * status eksekusi, dan membaca log error terbaru kontainer.
 */
export function inspectDockerHealth(
  options: DockerHealthCheckOptions
): DockerHealthCheckResult {
  const { enabled, containerNameOrId, expectedPorts = [], tailLines = 50 } = options;

  if (!enabled || !containerNameOrId) {
    return {
      status: "NOT_CONFIGURED",
      summary: "Docker check is disabled or container name not specified",
      defects: [],
    };
  }

  // 1. Cek ketersediaan docker daemon
  try {
    execSync("docker info", {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
      encoding: "utf-8",
    });
  } catch {
    return {
      status: "NOT_CONFIGURED",
      summary: "Docker daemon is not running or current user lacks docker permissions",
      defects: [
        {
          severity: "MAJOR",
          category: "DOCKER_DAEMON_UNAVAILABLE",
          failureMessage: "Docker daemon tidak aktif atau tidak dapat diakses untuk inspeksi kontainer.",
        },
      ],
    };
  }

  try {
    // 2. Periksa status kontainer via docker inspect
    const inspectRaw = execSync(
      `docker inspect ${containerNameOrId} --format='{{json .State}}'`,
      {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
        encoding: "utf-8",
      }
    ).trim();

    const state = JSON.parse(inspectRaw);
    const isRunning = Boolean(state.Running);
    const isRestarting = Boolean(state.Restarting);
    const exitCode = typeof state.ExitCode === "number" ? state.ExitCode : null;
    const restartCount = typeof state.RestartCount === "number" ? state.RestartCount : 0;

    let logSnippet = "";
    try {
      logSnippet = execSync(`docker logs --tail ${tailLines} ${containerNameOrId}`, {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
        encoding: "utf-8",
      }).trim();
    } catch {
      logSnippet = "(Gagal membaca log kontainer)";
    }

    const defects: AuditDefectItem[] = [];

    if (isRestarting || (restartCount > 3 && !isRunning)) {
      defects.push({
        severity: "CRITICAL",
        category: "DOCKER_CRASH_LOOP",
        failureMessage: `Kontainer "${containerNameOrId}" mengalami crash-loop (Restart count: ${restartCount}, Exit code: ${exitCode})`,
        rawOutputSnippet: logSnippet.slice(-400),
      });

      return {
        status: "CRASH_LOOP",
        containerName: containerNameOrId,
        restartCount,
        logTailSnippet: logSnippet.slice(-1000),
        summary: `Kontainer "${containerNameOrId}" crash-loop (${restartCount} restart)`,
        defects,
      };
    }

    if (!isRunning) {
      defects.push({
        severity: "CRITICAL",
        category: "DOCKER_CONTAINER_STOPPED",
        failureMessage: `Kontainer "${containerNameOrId}" dalam keadaan mati/berhenti (Exit code: ${exitCode})`,
        rawOutputSnippet: logSnippet.slice(-400),
      });

      return {
        status: "STOPPED",
        containerName: containerNameOrId,
        restartCount,
        logTailSnippet: logSnippet.slice(-1000),
        summary: `Kontainer "${containerNameOrId}" berhenti dengan exit code ${exitCode}`,
        defects,
      };
    }

    return {
      status: "RUNNING",
      containerName: containerNameOrId,
      restartCount,
      logTailSnippet: logSnippet.slice(-500),
      summary: `Kontainer "${containerNameOrId}" beroperasi secara normal (Running)`,
      defects: [],
    };
  } catch (err) {
    return {
      status: "NOT_CONFIGURED",
      summary: `Gagal menginspeksi kontainer ${containerNameOrId}: ${(err as Error).message}`,
      defects: [
        {
          severity: "MAJOR",
          category: "DOCKER_INSPECT_ERROR",
          failureMessage: `Kontainer "${containerNameOrId}" tidak ditemukan atau gagal di-inspect.`,
        },
      ],
    };
  }
}
