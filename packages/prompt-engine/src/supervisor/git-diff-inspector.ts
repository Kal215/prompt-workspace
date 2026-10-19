import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

export interface GitDiffInspectResult {
  isGitRepo: boolean;
  branchName?: string;
  changedFiles: string[];
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  deletionsDetected: boolean;
  diffSummary: string;
  rawDiffSnippet: string;
  error?: string;
}

export interface GitDiffInspectOptions {
  workingDirectory: string;
  baseRef?: string;
  maxDiffLines?: number;
}

/**
 * gitDiffInspector: Memeriksa perubahan fisik berkas melalui Git secara langsung.
 * Mendeteksi penambahan, modifikasi, serta penghapusan kode yang tidak sah.
 */
export function inspectGitDiff(options: GitDiffInspectOptions): GitDiffInspectResult {
  const { workingDirectory, baseRef, maxDiffLines = 150 } = options;

  if (!fs.existsSync(workingDirectory)) {
    return {
      isGitRepo: false,
      changedFiles: [],
      addedFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      deletionsDetected: false,
      diffSummary: "Working directory does not exist",
      rawDiffSnippet: "",
      error: `Directory not found: ${workingDirectory}`,
    };
  }

  try {
    // 1. Verifikasi apakah ini repositori git
    const isGit = execSync("git rev-parse --is-inside-work-tree", {
      cwd: workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    }).trim() === "true";

    if (!isGit) {
      return {
        isGitRepo: false,
        changedFiles: [],
        addedFiles: [],
        modifiedFiles: [],
        deletedFiles: [],
        deletionsDetected: false,
        diffSummary: "Not a git repository",
        rawDiffSnippet: "",
      };
    }

    // Ambil nama branch aktif
    let branchName = "HEAD";
    try {
      branchName = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: workingDirectory,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      }).trim();
    } catch {
      // fallback
    }

    // 2. Baca status porcelain untuk file modified/added/deleted/untracked
    const statusOutput = execSync("git status --porcelain", {
      cwd: workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    });

    const changedFiles: string[] = [];
    const addedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];

    const lines = statusOutput.split("\n");
    for (const line of lines) {
      if (!line || line.trim().length === 0) continue;
      const status = line.slice(0, 2);
      const filePath = line.slice(3).trim();

      changedFiles.push(filePath);
      if (status.includes("?") || status.includes("A")) {
        addedFiles.push(filePath);
      } else if (status.includes("D")) {
        deletedFiles.push(filePath);
      } else if (status.includes("M")) {
        modifiedFiles.push(filePath);
      }
    }

    // 3. Ambil diff konten
    const diffCommand = baseRef
      ? `git diff ${baseRef}`
      : "git diff HEAD";
    
    let rawDiff = "";
    try {
      rawDiff = execSync(diffCommand, {
        cwd: workingDirectory,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        maxBuffer: 2 * 1024 * 1024,
      });
    } catch {
      // Jika HEAD belum ada (commit pertama), fallback ke git diff --cached atau diff kosong
      try {
        rawDiff = execSync("git diff --cached", {
          cwd: workingDirectory,
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf-8",
        });
      } catch {
        rawDiff = "";
      }
    }

    // Ambil statistik ringkas diff
    let diffSummary = "";
    try {
      diffSummary = execSync("git diff --stat HEAD", {
        cwd: workingDirectory,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
      }).trim();
    } catch {
      diffSummary = `${changedFiles.length} file(s) changed in working tree`;
    }

    // Potong raw diff jika terlalu panjang agar tidak merusak token budget
    const diffLines = rawDiff.split("\n");
    const rawDiffSnippet = diffLines.length > maxDiffLines
      ? diffLines.slice(0, maxDiffLines).join("\n") + `\n... [${diffLines.length - maxDiffLines} baris diff dipotong]`
      : rawDiff;

    return {
      isGitRepo: true,
      branchName,
      changedFiles,
      addedFiles,
      modifiedFiles,
      deletedFiles,
      deletionsDetected: deletedFiles.length > 0,
      diffSummary: diffSummary || `${changedFiles.length} files changed`,
      rawDiffSnippet,
    };
  } catch (err) {
    return {
      isGitRepo: false,
      changedFiles: [],
      addedFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      deletionsDetected: false,
      diffSummary: `Git execution error: ${(err as Error).message}`,
      rawDiffSnippet: "",
      error: (err as Error).message,
    };
  }
}
