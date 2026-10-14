-- DropTable (Old v2 tables — empty, safe to drop)
DROP TABLE IF EXISTS "SpiderTestResult";
DROP TABLE IF EXISTS "SpiderRun";
DROP TABLE IF EXISTS "CrawlerSource";
DROP TABLE IF EXISTS "PromptVersion";

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "savedPromptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sourceRole" TEXT NOT NULL,
    "promptContent" TEXT NOT NULL,
    "groundingSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVersion_savedPromptId_fkey" FOREIGN KEY ("savedPromptId") REFERENCES "SavedPrompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrawlSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "bytesRead" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrawlItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crawlSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "surroundingContext" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "confidenceEstimate" REAL NOT NULL,
    "warningsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrawlItem_crawlSessionId_fkey" FOREIGN KEY ("crawlSessionId") REFERENCES "CrawlSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpiderRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "promptVersionId" TEXT NOT NULL,
    "testSuiteVersion" TEXT NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "criticalGatePassed" BOOLEAN NOT NULL DEFAULT false,
    "qualityMetricsJson" TEXT NOT NULL DEFAULT '{}',
    "securityJson" TEXT NOT NULL DEFAULT '[]',
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "SpiderRun_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpiderBranchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spiderRunId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "sanitizedInput" TEXT NOT NULL,
    "sanitizedOutput" TEXT NOT NULL,
    "rationale" TEXT,
    "deterministicPass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpiderBranchResult_spiderRunId_fkey" FOREIGN KEY ("spiderRunId") REFERENCES "SpiderRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PromptVersion_userId_idx" ON "PromptVersion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_savedPromptId_versionNumber_key" ON "PromptVersion"("savedPromptId", "versionNumber");

-- CreateIndex
CREATE INDEX "CrawlSession_userId_createdAt_idx" ON "CrawlSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlSession_userId_idempotencyKey_key" ON "CrawlSession"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CrawlItem_crawlSessionId_idx" ON "CrawlItem"("crawlSessionId");

-- CreateIndex
CREATE INDEX "CrawlItem_userId_idx" ON "CrawlItem"("userId");

-- CreateIndex
CREATE INDEX "SpiderRun_promptVersionId_idx" ON "SpiderRun"("promptVersionId");

-- CreateIndex
CREATE INDEX "SpiderRun_userId_createdAt_idx" ON "SpiderRun"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpiderRun_userId_idempotencyKey_key" ON "SpiderRun"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SpiderBranchResult_spiderRunId_idx" ON "SpiderBranchResult"("spiderRunId");
