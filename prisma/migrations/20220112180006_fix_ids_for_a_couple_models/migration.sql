/*
  Warnings:

  - You are about to drop the column `hostZoomID` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `callId` on the `WebhookEvent` table. All the data in the column will be lost.
  - Added the required column `hostID` to the `Meeting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meetingId` to the `WebhookEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_hostZoomID_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_callId_fkey";

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "hostZoomID",
ADD COLUMN     "hostID" TEXT NOT NULL,
ALTER COLUMN "slackChannelID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "callId",
ADD COLUMN     "meetingId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostID_fkey" FOREIGN KEY ("hostID") REFERENCES "Host"("zoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
