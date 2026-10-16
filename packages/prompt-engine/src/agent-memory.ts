import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  MemoryRecord,
  MemoryRecordSchema,
  MemoryScope,
  MemoryStatus,
  MemoryType,
  MemoryValidationMethod,
} from "@prompt-workspace/prompt-contracts";

/**
 * Pola-pola instruksi berbahaya (Anti-Memory Poisoning Guard)
 */
const POISON_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /bypass\s+(all\s+)?(security|guardrails|policies|validators)/i,
  /disregard\s+(system|safety|policy)\s+rules/i,
  /leak\s+(api[_-]?key|secret|password|credential|token)/i,
  /reveal\s+(api[_-]?key|secret|password|private\s+key)/i,
  /exfiltrat(e|ion)/i,
  /disable\s+(validator|safety|audit|gate)/i,
  /drop\s+table\s+/i,
  /<script[\s>]/i,
  /curl\s+-X\s+POST.*http/i,
];

export interface CreateMemoryInput {
  type: MemoryType;
  scope: MemoryScope;
  ownerId: string;
  content: string;
  sourceRunId: string;
  sourceArtifactIds?: string[];
  confidence?: number;
  validationMethod?: MemoryValidationMethod;
  reviewAfter?: string;
}

export interface MemoryQueryFilter {
  ownerId: string;
  scope?: MemoryScope;
  type?: MemoryType;
  status?: "proposed" | "validated" | "rejected" | "stale";
  onlyValidated?: boolean; // Default true untuk retrieval operasional
  query?: string;
  limit?: number;
}

export class AgentMemoryStore {
  private baseDir: string;
  private memoryCache: Map<string, MemoryRecord> = new Map();

  constructor(options?: string | { customDir?: string }) {
    if (typeof options === "string") {
      this.baseDir = options;
    } else {
      this.baseDir = options?.customDir || path.join(os.homedir(), ".piew", "agent-memory");
    }
    this.ensureDirectory();
    this.loadAllToCache();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.baseDir, `${id}.json`);
  }

  private loadAllToCache(): void {
    this.memoryCache.clear();
    try {
      const files = fs.readdirSync(this.baseDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = fs.readFileSync(path.join(this.baseDir, file), "utf-8");
          const parsed = JSON.parse(raw);
          const validated = MemoryRecordSchema.parse(parsed);
          this.memoryCache.set(validated.id, validated);
        } catch {
          // Lewati file corrupt/tidak valid
        }
      }
    } catch {
      // Direktori mungkin belum terisi
    }
  }

  /**
   * Sanitasi konten dari kredensial/rahasia (Zero Secret Leakage)
   */
  public sanitizeContent(content: string): string {
    return content
      .replace(/gsk_[a-zA-Z0-9_-]{20,}/g, "[REDACTED_GROQ_KEY]")
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]")
      .replace(/api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_\-\.]{10,}["']?/gi, "api_key=[REDACTED]");
  }

  /**
   * Deteksi apakah konten mengandung upaya memory poisoning
   */
  public detectPoisoning(content: string): { isPoisoned: boolean; matchedPattern?: string } {
    for (const pattern of POISON_PATTERNS) {
      if (pattern.test(content)) {
        return { isPoisoned: true, matchedPattern: pattern.source };
      }
    }
    return { isPoisoned: false };
  }

  /**
   * Mengusulkan record memory baru (Otomatis berstatus 'proposed')
   */
  public proposeMemory(input: CreateMemoryInput): MemoryRecord {
    const sanitized = this.sanitizeContent(input.content);
    const poisonCheck = this.detectPoisoning(sanitized);

    if (poisonCheck.isPoisoned) {
      throw new Error(
        `ANTI_MEMORY_POISONING: Pola instruksi terlarang terdeteksi (${poisonCheck.matchedPattern})`
      );
    }

    const id = `mem-${crypto.randomBytes(8).toString("hex")}`;
    const contentHash = crypto.createHash("sha256").update(sanitized).digest("hex");

    const record: MemoryRecord = {
      id,
      type: input.type,
      scope: input.scope,
      ownerId: input.ownerId,
      content: sanitized,
      sourceRunId: input.sourceRunId || "direct_user_action",
      sourceArtifactIds: input.sourceArtifactIds || [],
      status: "proposed", // Memory baru selalu 'proposed'
      confidence: input.confidence ?? 0.5,
      validationMethod: input.validationMethod || "rule",
      createdAt: new Date().toISOString(),
      reviewAfter: input.reviewAfter,
      contentHash,
    };

    const validated = MemoryRecordSchema.parse(record);
    fs.writeFileSync(this.getFilePath(id), JSON.stringify(validated, null, 2), {
      mode: 0o600,
    });
    this.memoryCache.set(id, validated);

    return validated;
  }

  /**
   * Memvalidasi memory record dengan bukti empiris nyata (Mengubah status ke 'validated')
   */
  public validateMemoryRecord(
    id: string,
    evidenceOrMethod:
      | MemoryValidationMethod
      | {
          passed: boolean;
          validationMethod: MemoryValidationMethod;
          confidence?: number;
          reviewerOrReason?: string;
        },
    confidenceScore?: number
  ): MemoryRecord | null {
    const existing = this.memoryCache.get(id);
    if (!existing) return null;

    if (typeof evidenceOrMethod === "string") {
      existing.status = "validated";
      existing.validationMethod = evidenceOrMethod;
      if (confidenceScore !== undefined) {
        existing.confidence = confidenceScore;
      }
    } else {
      if (!evidenceOrMethod.passed) {
        existing.status = "rejected";
      } else {
        existing.status = "validated";
        existing.validationMethod = evidenceOrMethod.validationMethod;
        if (evidenceOrMethod.confidence !== undefined) {
          existing.confidence = evidenceOrMethod.confidence;
        }
      }
    }

    fs.writeFileSync(this.getFilePath(id), JSON.stringify(existing, null, 2), {
      mode: 0o600,
    });
    this.memoryCache.set(id, existing);
    return existing;
  }

  /**
   * Mengoreksi isi memory (Otomatis recalculate SHA-256 dan status)
   */
  public correctMemory(
    id: string,
    newContent: string,
    ownerId: string
  ): { success: boolean; record?: MemoryRecord; error?: string } {
    const existing = this.memoryCache.get(id);
    if (!existing) return { success: false, error: "MEMORY_NOT_FOUND" };

    // Anti-IDOR check
    if (existing.ownerId !== ownerId && existing.scope !== "global") {
      return { success: false, error: "ACCESS_DENIED_IDOR" };
    }

    const sanitized = this.sanitizeContent(newContent);
    const poisonCheck = this.detectPoisoning(sanitized);
    if (poisonCheck.isPoisoned) {
      return { success: false, error: "MEMORY_POISON_REJECTED" };
    }

    existing.content = sanitized;
    existing.contentHash = crypto.createHash("sha256").update(sanitized).digest("hex");
    existing.status = "proposed"; // Wajib re-validasi setelah koreksi konten!

    fs.writeFileSync(this.getFilePath(id), JSON.stringify(existing, null, 2), {
      mode: 0o600,
    });
    this.memoryCache.set(id, existing);
    return { success: true, record: existing };
  }

  /**
   * Menandai memory usang (stale)
   */
  public markMemoryStale(id: string, ownerId: string): boolean {
    const existing = this.memoryCache.get(id);
    if (!existing) return false;
    if (existing.ownerId !== ownerId && existing.scope !== "global") return false;

    existing.status = "stale";
    fs.writeFileSync(this.getFilePath(id), JSON.stringify(existing, null, 2), {
      mode: 0o600,
    });
    this.memoryCache.set(id, existing);
    return true;
  }

  /**
   * Menghapus memory secara permanen dari disk dan cache memori
   */
  public deleteMemory(id: string, callerOwnerId?: string): boolean {
    const existing = this.memoryCache.get(id);
    if (!existing) return false;
    if (callerOwnerId && existing.ownerId !== callerOwnerId && existing.scope !== "global") {
      return false;
    }

    this.memoryCache.delete(id);
    const filePath = this.getFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  }

  /**
   * Safe Retrieval Filter: Memfilter berdasarkan ownerId & scope TERLEBIH DAHULU (Pre-filter),
   * mencegah kebocoran data lintas-pengguna / cross-scope leakage (Anti-IDOR).
   */
  public queryMemories(filter: MemoryQueryFilter): MemoryRecord[] {
    const results: MemoryRecord[] = [];
    const limit = filter.limit || 10;
    const onlyValidated = filter.onlyValidated !== false; // Default true

    for (const record of this.memoryCache.values()) {
      // 1. FILTER KEAMANAN MUTLAK: Scope & Owner Check First
      if (record.scope !== "global" && record.ownerId !== filter.ownerId) {
        continue; // Tolak mentah-mentah jika milik owner lain
      }

      // 2. Filter Scope jika diminta spesifik
      if (filter.scope && record.scope !== filter.scope) {
        continue;
      }

      // 3. Filter Tipe Memory
      if (filter.type && record.type !== filter.type) {
        continue;
      }

      // 4. Filter Status (Hanya 'validated' untuk injeksi operasional aman)
      if (onlyValidated && record.status !== "validated") {
        continue;
      } else if (filter.status && record.status !== filter.status) {
        continue;
      }

      // 5. Pencarian Leksikal
      if (filter.query && filter.query.trim().length > 0) {
        const q = filter.query.toLowerCase();
        if (!record.content.toLowerCase().includes(q)) {
          continue;
        }
      }

      results.push(record);
      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Mengambil memory berdasarkan ID dengan pengecekan kepemilikan
   */
  public getMemory(id: string, ownerId: string): MemoryRecord | null {
    const rec = this.memoryCache.get(id);
    if (!rec) return null;
    if (rec.scope !== "global" && rec.ownerId !== ownerId) {
      return null; // Anti-IDOR: Jangan bocorkan keberadaan memory orang lain
    }
    return rec;
  }

  /**
   * Mengambil seluruh memory untuk manajemen vault (dengan penyortiran terbaru)
   */
  public listAllMemories(options?: {
    ownerId?: string;
    scope?: MemoryScope;
    type?: MemoryType;
    status?: MemoryStatus;
  }): MemoryRecord[] {
    const records: MemoryRecord[] = [];
    for (const record of this.memoryCache.values()) {
      if (
        options?.ownerId &&
        record.scope !== "global" &&
        record.ownerId !== options.ownerId
      ) {
        continue;
      }
      if (options?.scope && record.scope !== options.scope) continue;
      if (options?.type && record.type !== options.type) continue;
      if (options?.status && record.status !== options.status) continue;
      records.push({ ...record });
    }
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Jumlah record dalam memory store
   */
  public count(): number {
    return this.memoryCache.size;
  }
}
