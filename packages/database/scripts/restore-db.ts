import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RestoreOptions {
  backupFile?: string;
  targetFile?: string;
}

export function parseArgs(args: string[]): RestoreOptions {
  const options: RestoreOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--target" && i + 1 < args.length) {
      options.targetFile = args[i + 1];
      i++;
    } else if (arg === "--file" && i + 1 < args.length) {
      options.backupFile = args[i + 1];
      i++;
    } else if (!arg.startsWith("--") && !options.backupFile) {
      options.backupFile = arg;
    }
  }
  return options;
}

export async function restoreDatabase(options: RestoreOptions = {}): Promise<{
  targetPath: string;
  recordCount: number;
}> {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🔄 DATABASE RESTORE AUTOMATION (packages/database)");
  console.log("═══════════════════════════════════════════════════════════════════");

  // 1. Tentukan file backup sumber
  let backupPath = options.backupFile;
  const backupsDir = path.resolve(__dirname, "../backups");

  if (!backupPath) {
    // Cari backup terbaru di folder backups/
    if (fs.existsSync(backupsDir)) {
      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith("dev-backup-") && f.endsWith(".db"))
        .sort()
        .reverse();

      if (files.length > 0) {
        backupPath = path.join(backupsDir, files[0]);
        console.log(`ℹ️  Tidak ada file backup yang dispesifikasikan. Menggunakan backup terbaru: ${files[0]}`);
      }
    }
  }

  if (!backupPath || !fs.existsSync(backupPath)) {
    throw new Error(`File backup sumber tidak ditemukan: ${backupPath || "(kosong)"}`);
  }

  backupPath = path.resolve(backupPath).replace(/\\/g, "/");
  console.log(`📂 Memverifikasi file backup: ${backupPath}`);

  // 2. Verifikasi integritas SQLite backup sebelum restore
  // Periksa header SQLite standar (16 byte pertama: "SQLite format 3\0")
  const fd = fs.openSync(backupPath, "r");
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  const headerStr = buffer.toString("utf8");
  if (!headerStr.startsWith("SQLite format 3")) {
    throw new Error(`Integritas gagal: File ${backupPath} bukan format SQLite 3 yang valid.`);
  }

  // Verifikasi schema dan tabel dengan PrismaClient
  const verifyPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${backupPath}`,
      },
    },
  });

  let backupRecordCount = 0;
  try {
    backupRecordCount = await verifyPrisma.savedPrompt.count();
    console.log(`✅ Integritas file backup valid! Terdeteksi ${backupRecordCount} record SavedPrompt.`);
  } catch (err) {
    throw new Error(`Integritas schema gagal pada backup: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await verifyPrisma.$disconnect();
  }

  // 3. Tentukan target database
  const defaultTarget = path.resolve(__dirname, "../prisma/dev.db");
  let targetPath = options.targetFile ? path.resolve(options.targetFile) : defaultTarget;
  targetPath = targetPath.replace(/\\/g, "/");

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 4. Salin file backup ke target
  fs.copyFileSync(backupPath, targetPath);
  console.log(`✅ Berhasil memulihkan database ke target: ${targetPath}`);

  // 5. Verifikasi database target setelah restore
  const targetPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${targetPath}`,
      },
    },
  });

  try {
    const verifiedTargetCount = await targetPrisma.savedPrompt.count();
    console.log(`📊 Jumlah record pada target terverifikasi: ${verifiedTargetCount}`);
    if (verifiedTargetCount !== backupRecordCount) {
      throw new Error(`Mismatch record count: backup memiliki ${backupRecordCount}, target memiliki ${verifiedTargetCount}`);
    }

    console.log("═══════════════════════════════════════════════════════════════════");
    console.log("🏁 RESTORE SELESAI DENGAN SUKSES");
    console.log("═══════════════════════════════════════════════════════════════════");
    return { targetPath, recordCount: verifiedTargetCount };
  } finally {
    await targetPrisma.$disconnect();
  }
}

// Eksekusi CLI jika dipanggil langsung
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  restoreDatabase(options).catch((err) => {
    console.error("❌ Gagal melakukan restore database:", err);
    process.exit(1);
  });
}
