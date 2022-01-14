-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_hostID_fkey";

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostID_fkey" FOREIGN KEY ("hostID") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
