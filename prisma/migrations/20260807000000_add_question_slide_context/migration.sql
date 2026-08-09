-- AlterTable
ALTER TABLE "Question" ADD COLUMN "slidePageIndex" INTEGER;
ALTER TABLE "Question" ADD COLUMN "slideSetId" TEXT;

-- CreateIndex
CREATE INDEX "Question_slideSetId_idx" ON "Question"("slideSetId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_slideSetId_fkey" FOREIGN KEY ("slideSetId") REFERENCES "SlideSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
