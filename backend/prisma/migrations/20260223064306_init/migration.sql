-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'SCRAPING', 'QUERYING_AI', 'SCORING', 'GENERATING_CONTENT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ScrapeType" AS ENUM ('CUSTOMER_SITE', 'COMPETITOR_SITE');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "HtmlQuality" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "BuyerStage" AS ENUM ('AWARENESS', 'CONSIDERATION', 'DECISION');

-- CreateEnum
CREATE TYPE "AiEngine" AS ENUM ('CHATGPT', 'PERPLEXITY', 'GEMINI', 'AI_OVERVIEW');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'IMPLEMENTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CmsType" AS ENUM ('WORDPRESS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExp" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "productsServices" TEXT NOT NULL,
    "keyDifferentiators" TEXT NOT NULL,
    "brandVoiceNotes" TEXT,
    "brandVoiceFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "websiteUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredBy" "TriggerType" NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ScrapeType" NOT NULL,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "htmlContent" TEXT,
    "htmlQuality" "HtmlQuality",
    "qualityScore" INTEGER,
    "qualityIssues" TEXT[],
    "responseTimeMs" INTEGER,
    "creditsUsed" DOUBLE PRECISION,
    "errorMsg" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetQuery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "analysisId" TEXT,
    "query" TEXT NOT NULL,
    "buyerStage" "BuyerStage" NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQueryResult" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "engine" "AiEngine" NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "companyMentioned" BOOLEAN NOT NULL DEFAULT false,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "mentionContext" TEXT,
    "citations" TEXT[],
    "shareOfVoice" DOUBLE PRECISION,
    "queriedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiQueryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoScore" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "industryBenchmark" DOUBLE PRECISION,
    "scrapeQuality" TEXT,
    "extractabilityScore" DOUBLE PRECISION NOT NULL,
    "extractabilityNotes" TEXT,
    "entityClarityScore" DOUBLE PRECISION NOT NULL,
    "entityClarityNotes" TEXT,
    "specificityScore" DOUBLE PRECISION NOT NULL,
    "specificityNotes" TEXT,
    "corroborationScore" DOUBLE PRECISION NOT NULL,
    "corroborationNotes" TEXT,
    "coverageScore" DOUBLE PRECISION NOT NULL,
    "coverageNotes" TEXT,
    "freshnessScore" DOUBLE PRECISION NOT NULL,
    "freshnessNotes" TEXT,
    "indexabilityScore" DOUBLE PRECISION NOT NULL,
    "indexabilityNotes" TEXT,
    "machineReadabilityScore" DOUBLE PRECISION NOT NULL,
    "machineReadabilityNotes" TEXT,
    "priorityActions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageRecommendation" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "improvements" TEXT[],
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetQuery" TEXT NOT NULL,
    "buyerStage" "BuyerStage" NOT NULL DEFAULT 'AWARENESS',
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "geoComplianceScore" DOUBLE PRECISION,
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "customerApproved" BOOLEAN NOT NULL DEFAULT false,
    "publishedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogRevision" (
    "id" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "newContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "CmsType" NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlostepApiLog" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "creditsUsed" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL,
    "errorMsg" TEXT,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OlostepApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GeoScore_analysisId_key" ON "GeoScore"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsConnection_companyId_key" ON "CmsConnection"("companyId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetQuery" ADD CONSTRAINT "TargetQuery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQueryResult" ADD CONSTRAINT "AiQueryResult_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQueryResult" ADD CONSTRAINT "AiQueryResult_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "TargetQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoScore" ADD CONSTRAINT "GeoScore_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageRecommendation" ADD CONSTRAINT "PageRecommendation_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogRevision" ADD CONSTRAINT "BlogRevision_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
