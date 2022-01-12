-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_schedulingLinkId_fkey";

-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "schedulingLinkId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_schedulingLinkId_fkey" FOREIGN KEY ("schedulingLinkId") REFERENCES "SchedulingLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
