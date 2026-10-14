-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SavedPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'legacy_default_user',
    "originalPrompt" TEXT NOT NULL,
    "optimizedPrompt" TEXT NOT NULL,
    "intentSummary" TEXT,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SavedPrompt" ("createdAt", "id", "intentSummary", "optimizedPrompt", "originalPrompt", "score") SELECT "createdAt", "id", "intentSummary", "optimizedPrompt", "originalPrompt", "score" FROM "SavedPrompt";
DROP TABLE "SavedPrompt";
ALTER TABLE "new_SavedPrompt" RENAME TO "SavedPrompt";
CREATE INDEX "SavedPrompt_userId_idx" ON "SavedPrompt"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
