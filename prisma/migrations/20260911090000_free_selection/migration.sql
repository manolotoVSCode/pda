-- Migration: replace group-based BlockResponse with word-based selection

-- Clean up all test data before restructuring (children before parents)
DELETE FROM "Report";
DELETE FROM "BlockResponse";
DELETE FROM "Assessment";

ALTER TABLE "BlockResponse" DROP CONSTRAINT IF EXISTS "BlockResponse_assessmentId_block_groupNumber_key";
ALTER TABLE "BlockResponse" DROP COLUMN IF EXISTS "groupNumber";
ALTER TABLE "BlockResponse" DROP COLUMN IF EXISTS "mostDim";
ALTER TABLE "BlockResponse" DROP COLUMN IF EXISTS "leastDim";
ALTER TABLE "BlockResponse" ADD COLUMN IF NOT EXISTS "wordKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BlockResponse" ADD COLUMN IF NOT EXISTS "dimension" "Dimension" NOT NULL DEFAULT 'D';
ALTER TABLE "BlockResponse" ADD CONSTRAINT "BlockResponse_assessmentId_block_wordKey_key" UNIQUE ("assessmentId", "block", "wordKey");
