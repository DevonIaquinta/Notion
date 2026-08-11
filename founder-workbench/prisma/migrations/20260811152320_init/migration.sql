-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConstraintProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "capitalAvailable" INTEGER NOT NULL,
    "hoursPerWeek" INTEGER NOT NULL,
    "monthsUntilRevenueNeeded" INTEGER NOT NULL,
    "riskTolerance" TEXT NOT NULL,
    "accessAssets" TEXT NOT NULL DEFAULT '[]',
    "toleranceProfile" TEXT NOT NULL DEFAULT '[]',
    "hardExclusions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConstraintProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStage" TEXT NOT NULL DEFAULT 'KILL_CRITERIA',
    "killReason" TEXT,
    "killedAt" DATETIME,
    "parkReason" TEXT,
    "fitReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Venture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KillCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "isFalsifiable" BOOLEAN NOT NULL DEFAULT false,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "triggeredNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KillCriterion_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "claimTested" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "assumptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceEntry_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceEntry_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "Assumption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNTESTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assumption_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionLogEntry_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventureId" TEXT NOT NULL,
    "whoItsFor" TEXT NOT NULL,
    "problemSolved" TEXT NOT NULL,
    "deliverable" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "guarantee" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ConstraintProfile_userId_key" ON "ConstraintProfile"("userId");

-- CreateIndex
CREATE INDEX "Venture_userId_idx" ON "Venture"("userId");

-- CreateIndex
CREATE INDEX "KillCriterion_ventureId_idx" ON "KillCriterion"("ventureId");

-- CreateIndex
CREATE INDEX "EvidenceEntry_ventureId_idx" ON "EvidenceEntry"("ventureId");

-- CreateIndex
CREATE INDEX "Assumption_ventureId_idx" ON "Assumption"("ventureId");

-- CreateIndex
CREATE INDEX "DecisionLogEntry_ventureId_idx" ON "DecisionLogEntry"("ventureId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_ventureId_key" ON "Offer"("ventureId");
