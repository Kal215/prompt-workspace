import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  SkillManifest,
  SkillManifestSchema,
  SkillStatus,
} from "@prompt-workspace/prompt-contracts";

export interface SkillRegistryEntry {
  manifest: SkillManifest;
  status: SkillStatus;
  activeVersion: string;
  versionHistory: Array<{
    version: string;
    manifest: SkillManifest;
    status: SkillStatus;
    promotedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SkillValidationReport {
  valid: boolean;
  errors: string[];
  securityBlockers: string[];
}

export class AgentSkillRegistry {
  private baseDir: string;
  private skillsMap: Map<string, SkillRegistryEntry> = new Map();

  constructor(options?: string | { customSkillsDir?: string; customDir?: string }) {
    if (typeof options === "string") {
      this.baseDir = options;
    } else {
      this.baseDir =
        options?.customSkillsDir ||
        options?.customDir ||
        path.join(os.homedir(), ".piew", "agent-skills");
    }
    this.ensureDirectory();
    this.loadAllSkills();
    this.installBuiltInSkillsIfMissing();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  private getSkillFilePath(name: string): string {
    return path.join(this.baseDir, `${name}.json`);
  }

  private loadAllSkills(): void {
    this.skillsMap.clear();
    try {
      const files = fs.readdirSync(this.baseDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = fs.readFileSync(path.join(this.baseDir, file), "utf-8");
          const parsed = JSON.parse(raw);
          this.skillsMap.set(parsed.manifest.name, parsed);
        } catch {
          // Abaikan berkas corrupt
        }
      }
    } catch {
      // Belum ada file
    }
  }

  /**
   * Validasi Keamanan Mutlak Skill (Bab 8.2 & 8.5)
   * Blokir Mutlak Executable Skill & Privilege Escalation (Fail-closed)
   */
  public validateSkillManifest(manifestRaw: unknown): SkillValidationReport {
    const errors: string[] = [];
    const securityBlockers: string[] = [];

    const rawObj = manifestRaw as Record<string, unknown> | null;
    if (rawObj && typeof rawObj === "object") {
      if (rawObj.kind === "executable") {
        securityBlockers.push(
          "EXECUTABLE_SKILL_FORBIDDEN: Skill eksekusi biner/script dilarang keras demi keamanan host!"
        );
      }
      if (rawObj.network && rawObj.network !== "none") {
        securityBlockers.push(
          "NETWORK_ACCESS_FORBIDDEN: Skill tidak boleh mengakses jaringan eksternal secara liar."
        );
      }
      if (rawObj.filesystem && rawObj.filesystem !== "none") {
        securityBlockers.push(
          "FILESYSTEM_ACCESS_FORBIDDEN: Skill tidak boleh memanipulasi filesystem host secara langsung."
        );
      }
    }

    const parseRes = SkillManifestSchema.safeParse(manifestRaw);
    if (!parseRes.success) {
      for (const issue of parseRes.error.issues) {
        errors.push(`Field '${issue.path.join(".")}': ${issue.message}`);
      }
      return { valid: false, errors, securityBlockers };
    }

    const manifest = parseRes.data;

    // 1. BLOKIR MUTLAK: kind: 'executable'
    if (manifest.kind === "executable") {
      securityBlockers.push("EXECUTABLE_SKILL_FORBIDDEN: Skill eksekusi biner/script dilarang keras demi keamanan host!");
    }

    // 2. BLOKIR MUTLAK: Akses network !== 'none'
    if (manifest.network !== "none") {
      securityBlockers.push("NETWORK_ACCESS_FORBIDDEN: Skill tidak boleh mengakses jaringan eksternal secara liar.");
    }

    // 3. BLOKIR MUTLAK: Akses filesystem !== 'none'
    if (manifest.filesystem !== "none") {
      securityBlockers.push("FILESYSTEM_ACCESS_FORBIDDEN: Skill tidak boleh memanipulasi filesystem host secara langsung.");
    }

    // 4. BLOKIR MUTLAK: sideEffects !== 'none'
    if (manifest.sideEffects !== "none") {
      securityBlockers.push("SIDE_EFFECTS_FORBIDDEN: Skill deklaratif tidak diizinkan menimbulkan efek samping di luar konteks.");
    }

    // 5. Anti-Privilege Escalation: Izin terlarang
    for (const perm of manifest.permissions) {
      if (
        perm.includes("sudo") ||
        perm.includes("root") ||
        perm.includes("admin") ||
        perm.includes("policy:modify") ||
        perm.includes("system:reconfigure")
      ) {
        securityBlockers.push(`PRIVILEGE_ESCALATION_BLOCKED: Upaya meminta izin sensitif '${perm}' ditolak secara mutlak!`);
      }
    }

    const valid = errors.length === 0 && securityBlockers.length === 0;
    return { valid, errors, securityBlockers };
  }

  /**
   * Mendaftarkan Skill Baru ke Registry (Status awal: DRAFT / SCHEMA_VALIDATED)
   */
  public registerSkill(manifestRaw: unknown): {
    success: boolean;
    entry?: SkillRegistryEntry;
    validation: SkillValidationReport;
  } {
    const validation = this.validateSkillManifest(manifestRaw);
    if (!validation.valid) {
      if (validation.securityBlockers.length > 0) {
        throw new Error(validation.securityBlockers[0]);
      }
      return { success: false, validation };
    }

    const manifest = SkillManifestSchema.parse(manifestRaw);
    const existing = this.skillsMap.get(manifest.name);
    const now = new Date().toISOString();

    if (existing) {
      const versionExists = existing.versionHistory.some((v) => v.version === manifest.version);
      if (versionExists) {
        return {
          success: false,
          validation: {
            valid: false,
            errors: [`IMMUTABLE_VERSION_CONFLICT: Versi ${manifest.version} untuk skill ${manifest.name} sudah ada dan bersifat immutable!`],
            securityBlockers: [],
          },
        };
      }

      existing.versionHistory.push({
        version: manifest.version,
        status: "SCHEMA_VALIDATED",
        promotedAt: now,
        manifest,
      });
      existing.updatedAt = now;
      fs.writeFileSync(this.getSkillFilePath(manifest.name), JSON.stringify(existing, null, 2), {
        mode: 0o600,
      });
      return { success: true, entry: existing, validation };
    }

    const entry: SkillRegistryEntry = {
      activeVersion: manifest.version,
      status: "SCHEMA_VALIDATED",
      manifest,
      versionHistory: [
        {
          version: manifest.version,
          status: "SCHEMA_VALIDATED",
          promotedAt: now,
          manifest,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    fs.writeFileSync(this.getSkillFilePath(manifest.name), JSON.stringify(entry, null, 2), {
      mode: 0o600,
    });
    this.skillsMap.set(manifest.name, entry);

    return { success: true, entry, validation };
  }

  /**
   * Evaluasi Holdout dan Aktivasi Skill
   */
  public evaluateHoldoutAndActivate(
    skillName: string,
    targetVersion: string,
    passed: boolean
  ): boolean {
    const entry = this.skillsMap.get(skillName);
    if (entry && passed) {
      entry.activeVersion = targetVersion;
      entry.status = "ACTIVE";
      const historyItem = entry.versionHistory.find((v) => v.version === targetVersion);
      if (historyItem) {
        historyItem.status = "ACTIVE";
        entry.manifest = historyItem.manifest;
      }
      fs.writeFileSync(this.getSkillFilePath(skillName), JSON.stringify(entry, null, 2), {
        mode: 0o600,
      });
      return true;
    }
    return false;
  }

  /**
   * Evaluasi Holdout resmi dan aktivasi skill bila memenuhi ambang kualitas (Score >= 80)
   */
  public evaluateAndActivateSkill(
    skillName: string,
    holdoutReport: { passed: boolean; score: number; details?: string }
  ): { success: boolean; status: SkillStatus; message: string } {
    const entry = this.skillsMap.get(skillName);
    if (!entry) {
      return { success: false, status: "DISABLED", message: "SKILL_NOT_FOUND" };
    }

    if (!holdoutReport.passed || holdoutReport.score < 80) {
      entry.status = "DISABLED";
      fs.writeFileSync(this.getSkillFilePath(skillName), JSON.stringify(entry, null, 2), {
        mode: 0o600,
      });
      return {
        success: false,
        status: "DISABLED",
        message: `HOLDOUT_GATE_FAILED: Skor holdout ${holdoutReport.score} < 80 atau pengujian gagal.`,
      };
    }

    // Lulus Holdout -> Aktifkan
    entry.status = "ACTIVE";
    entry.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.getSkillFilePath(skillName), JSON.stringify(entry, null, 2), {
      mode: 0o600,
    });
    return {
      success: true,
      status: "ACTIVE",
      message: `Skill ${skillName} v${entry.activeVersion} resmi aktif setelah lulus evaluasi holdout.`,
    };
  }

  /**
   * Rollback Skill ke versi aman sebelumnya secara instan (Sub-millisecond)
   */
  public rollbackSkill(skillName: string): {
    success: boolean;
    rolledBackToVersion?: string;
    message: string;
  } {
    const entry = this.skillsMap.get(skillName);
    if (!entry) {
      return { success: false, message: "SKILL_NOT_FOUND" };
    }

    if (entry.versionHistory.length < 2) {
      return {
        success: false,
        message: "NO_PREVIOUS_VERSION: Tidak ada versi sebelumnya untuk di-rollback.",
      };
    }

    // Ambil versi sebelumnya
    const previous = entry.versionHistory[entry.versionHistory.length - 2];
    entry.activeVersion = previous.version;
    entry.manifest = previous.manifest;
    entry.status = "ROLLED_BACK";
    entry.updatedAt = new Date().toISOString();

    fs.writeFileSync(this.getSkillFilePath(skillName), JSON.stringify(entry, null, 2), {
      mode: 0o600,
    });

    return {
      success: true,
      rolledBackToVersion: previous.version,
      message: `Skill ${skillName} berhasil di-rollback ke versi ${previous.version}.`,
    };
  }

  /**
   * Mengambil daftar skill aktif
   */
  public getActiveSkills(): SkillManifest[] {
    const active: SkillManifest[] = [];
    for (const entry of this.skillsMap.values()) {
      if (entry.status === "ACTIVE" || entry.status === "AUTO_ACTIVATED_LOW_RISK") {
        active.push(entry.manifest);
      }
    }
    return active;
  }

  public getSkill(name: string): SkillRegistryEntry | null {
    return this.skillsMap.get(name) || null;
  }

  public getActiveSkill(skillName: string): SkillManifest | null {
    const entry = this.skillsMap.get(skillName);
    if (!entry) return null;
    if (entry.status !== "ACTIVE" && entry.status !== "ROLLED_BACK") return null;
    const historyItem = entry.versionHistory.find((v) => v.version === entry.activeVersion);
    return historyItem ? historyItem.manifest : entry.manifest;
  }

  /**
   * Pasang 3 Built-in Validated Declarative Skills jika belum terpasang
   */
  private installBuiltInSkillsIfMissing(): void {
    const builtins: unknown[] = [
      {
        schemaVersion: "1",
        name: "strict-json-output",
        version: "1.0.0",
        summary: "Memastikan LLM merespons dalam format JSON valid tanpa pembungkus markdown liar.",
        kind: "declarative",
        riskClass: "low",
        scope: ["global"],
        inputs: { targetSchema: "string" },
        outputs: { jsonPayload: "object" },
        permissions: [],
        network: "none",
        filesystem: "none",
        sideEffects: "none",
        limits: { maxInvocationsPerRun: 10 },
        validation: { requiredTests: ["json-syntax-check"] },
        activation: { autoActivate: true },
        rollback: {},
        provenance: { sourceRunIds: ["builtin-01"], evidenceArtifactIds: ["art-builtin-json"] },
        content: "Gunakan format JSON murni. Jangan tambahkan penjelasan pembuka atau penutup di luar blok JSON.",
      },
      {
        schemaVersion: "1",
        name: "hard-constraint-lock",
        version: "1.0.0",
        summary: "Mengunci batasan mutlak pengguna agar tidak dilanggar oleh saran atau optimasi sekunder.",
        kind: "declarative",
        riskClass: "low",
        scope: ["global"],
        inputs: { constraints: "array" },
        outputs: { enforcedText: "string" },
        permissions: [],
        network: "none",
        filesystem: "none",
        sideEffects: "none",
        limits: { maxInvocationsPerRun: 10 },
        validation: { requiredTests: ["negative-constraint-retention"] },
        activation: { autoActivate: true },
        rollback: {},
        provenance: { sourceRunIds: ["builtin-02"], evidenceArtifactIds: ["art-builtin-lock"] },
        content: "Batasan negatif (DILARANG) memiliki bobot mutlak di atas seluruh preferensi lain.",
      },
      {
        schemaVersion: "1",
        name: "mermaid-entity-consistency",
        version: "1.0.0",
        summary: "Menjaga konsistensi 100% antara entitas diagram Mermaid ERD dengan teks spesifikasi arsitektur.",
        kind: "declarative",
        riskClass: "low",
        scope: ["global"],
        inputs: { entities: "array" },
        outputs: { consistencyVerdict: "boolean" },
        permissions: [],
        network: "none",
        filesystem: "none",
        sideEffects: "none",
        limits: { maxInvocationsPerRun: 10 },
        validation: { requiredTests: ["cross-artifact-audit"] },
        activation: { autoActivate: true },
        rollback: {},
        provenance: { sourceRunIds: ["builtin-03"], evidenceArtifactIds: ["art-builtin-mermaid"] },
        content: "Setiap entitas yang muncul di diagram relasional wajib memiliki definisi atribut di modul database.",
      },
    ];

    for (const b of builtins) {
      const parsed = SkillManifestSchema.parse(b);
      if (!this.skillsMap.has(parsed.name)) {
        this.registerSkill(parsed);
        const entry = this.skillsMap.get(parsed.name);
        if (entry) {
          entry.status = "ACTIVE";
          fs.writeFileSync(this.getSkillFilePath(parsed.name), JSON.stringify(entry, null, 2), {
            mode: 0o600,
          });
        }
      }
    }
  }
}
