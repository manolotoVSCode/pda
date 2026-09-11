-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('D', 'I', 'S', 'C');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConsistencyLevel" AS ENUM ('HIGH', 'MODERATE', 'LOW');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NarrativeSection" AS ENUM ('COMMUNICATION', 'MOTIVATORS', 'PRESSURE', 'ALERTS', 'INTERVIEW_QUESTIONS', 'PROJECTION', 'INTENSITY');

-- CreateEnum
CREATE TYPE "IntensityLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "idealD" DOUBLE PRECISION NOT NULL,
    "idealI" DOUBLE PRECISION NOT NULL,
    "idealS" DOUBLE PRECISION NOT NULL,
    "idealC" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "block3Text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockResponse" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "block" INTEGER NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "mostDim" "Dimension" NOT NULL,
    "leastDim" "Dimension" NOT NULL,

    CONSTRAINT "BlockResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "ppD" DOUBLE PRECISION NOT NULL,
    "ppI" DOUBLE PRECISION NOT NULL,
    "ppS" DOUBLE PRECISION NOT NULL,
    "ppC" DOUBLE PRECISION NOT NULL,
    "piD" DOUBLE PRECISION NOT NULL,
    "piI" DOUBLE PRECISION NOT NULL,
    "piS" DOUBLE PRECISION NOT NULL,
    "piC" DOUBLE PRECISION NOT NULL,
    "ptD" DOUBLE PRECISION NOT NULL,
    "ptI" DOUBLE PRECISION NOT NULL,
    "ptS" DOUBLE PRECISION NOT NULL,
    "ptC" DOUBLE PRECISION NOT NULL,
    "pcD" DOUBLE PRECISION NOT NULL,
    "pcI" DOUBLE PRECISION NOT NULL,
    "pcS" DOUBLE PRECISION NOT NULL,
    "pcC" DOUBLE PRECISION NOT NULL,
    "maskIndex" DOUBLE PRECISION NOT NULL,
    "consistencyIndex" DOUBLE PRECISION NOT NULL,
    "consistencyLevel" "ConsistencyLevel" NOT NULL,
    "contradictions" INTEGER NOT NULL,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "projectionScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiconTerm" (
    "id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "term" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LexiconTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NarrativeContent" (
    "id" TEXT NOT NULL,
    "section" "NarrativeSection" NOT NULL,
    "dimension" "Dimension",
    "subtype" TEXT,
    "questionIndex" INTEGER,
    "riskLevel" "RiskLevel",
    "intensity" "IntensityLevel",
    "content" TEXT NOT NULL,

    CONSTRAINT "NarrativeContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_token_key" ON "Assessment"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BlockResponse_assessmentId_block_groupNumber_key" ON "BlockResponse"("assessmentId", "block", "groupNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Report_assessmentId_key" ON "Report"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LexiconTerm_dimension_term_key" ON "LexiconTerm"("dimension", "term");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockResponse" ADD CONSTRAINT "BlockResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
