-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "savedPromptId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "promptText" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "changesSummary" TEXT,
    "parentVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVersion_savedPromptId_fkey" FOREIGN KEY ("savedPromptId") REFERENCES "SavedPrompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpiderRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptVersionId" TEXT NOT NULL,
    "targetProvider" TEXT NOT NULL,
    "targetModel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "passedCases" INTEGER NOT NULL,
    "averageScore" REAL NOT NULL,
    "averageLatencyMs" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpiderRun_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpiderTestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spiderRunId" TEXT NOT NULL,
    "caseIndex" INTEGER NOT NULL,
    "testInput" TEXT NOT NULL,
    "expectedOutput" TEXT,
    "actualOutput" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "findings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpiderTestResult_spiderRunId_fkey" FOREIGN KEY ("spiderRunId") REFERENCES "SpiderRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrawlerSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "savedPromptId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "etag" TEXT,
    "contentHash" TEXT NOT NULL,
    "crawledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrawlerSource_savedPromptId_fkey" FOREIGN KEY ("savedPromptId") REFERENCES "SavedPrompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PromptVersion_savedPromptId_idx" ON "PromptVersion"("savedPromptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_savedPromptId_versionNumber_key" ON "PromptVersion"("savedPromptId", "versionNumber");

-- CreateIndex
CREATE INDEX "SpiderRun_promptVersionId_idx" ON "SpiderRun"("promptVersionId");

-- CreateIndex
CREATE INDEX "SpiderTestResult_spiderRunId_idx" ON "SpiderTestResult"("spiderRunId");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlerSource_savedPromptId_key" ON "CrawlerSource"("savedPromptId");
