-- CreateTable
CREATE TABLE "PlaygroundRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT,
    "promptTitle" TEXT NOT NULL,
    "renderedPrompt" TEXT NOT NULL,
    "variables" TEXT NOT NULL DEFAULT '{}',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "output" TEXT NOT NULL DEFAULT '',
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaygroundRun_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "baseURL" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5'
);

-- CreateIndex
CREATE INDEX "PlaygroundRun_promptId_idx" ON "PlaygroundRun"("promptId");

-- CreateIndex
CREATE INDEX "PlaygroundRun_createdAt_idx" ON "PlaygroundRun"("createdAt");
