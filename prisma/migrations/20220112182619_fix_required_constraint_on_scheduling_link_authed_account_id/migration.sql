-- DropForeignKey
ALTER TABLE "SchedulingLink" DROP CONSTRAINT "SchedulingLink_authedAccountID_fkey";

-- AlterTable
ALTER TABLE "SchedulingLink" ALTER COLUMN "authedAccountID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SchedulingLink" ADD CONSTRAINT "SchedulingLink_authedAccountID_fkey" FOREIGN KEY ("authedAccountID") REFERENCES "AuthedAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
