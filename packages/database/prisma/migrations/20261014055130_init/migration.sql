-- CreateTable
CREATE TABLE "SavedPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalPrompt" TEXT NOT NULL,
    "optimizedPrompt" TEXT NOT NULL,
    "intentSummary" TEXT,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
