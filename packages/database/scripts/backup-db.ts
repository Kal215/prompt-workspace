import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getTimestampString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export async function backupDatabase(customSource?: string, customDestDir?: string): Promise<{
  backupPath: string;
  recordCount: number;
}> {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("📦 DATABASE BACKUP AUTOMATION (packages/database)");
  console.log("═══════════════════════════════════════════════════════════════════");

  // 1. Tentukan source database
  const defaultSourceDb = path.resolve(__dirname, "../prisma/dev.db");
  let sourceDb = customSource || defaultSourceDb;

  // Jika source berupa file: URI, ekstrak path lokalnya
  if (sourceDb.startsWith("file:")) {
    sourceDb = sourceDb.replace(/^file:/, "");
  }

  if (!fs.existsSync(sourceDb)) {
    throw new Error(`Database sumber tidak ditemukan di: ${sourceDb}`);
  }

  // 2. Tentukan direktori backup
  const defaultBackupDir = path.resolve(__dirname, "../backups");
  const backupDir = customDestDir || defaultBackupDir;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 3. Nama file backup dengan format dev-backup-YYYYMMDD-HHMMSS.db
  const filename = `dev-backup-${getTimestampString()}.db`;
  const backupPath = path.join(backupDir, filename).replace(/\\/g, "/");

  // 4. Salin file secara aman (atomic / synchronous copy)
  fs.copyFileSync(sourceDb, backupPath);
  console.log(`✅ Salinan database berhasil dibuat: ${backupPath}`);

  // 5. Verifikasi integritas file backup dan hitung record SavedPrompt
  const backupPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${backupPath}`,
      },
    },
  });

  try {
    const recordCount = await backupPrisma.savedPrompt.count();
    console.log(`📊 Jumlah record SavedPrompt terverifikasi: ${recordCount}`);
    console.log("═══════════════════════════════════════════════════════════════════");
    console.log("🏁 BACKUP SELESAI DENGAN SUKSES");
    console.log("═══════════════════════════════════════════════════════════════════");
    return { backupPath, recordCount };
  } finally {
    await backupPrisma.$disconnect();
  }
}

// Eksekusi CLI jika dipanggil langsung
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  backupDatabase().catch((err) => {
    console.error("❌ Gagal melakukan backup database:", err);
    process.exit(1);
  });
}
