-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "testing" BOOLEAN NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "zoomID" TEXT NOT NULL,
    "errors" TEXT[],

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "zoomID" TEXT NOT NULL,
    "slackCallID" TEXT,
    "hostZoomID" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "creatorSlackID" TEXT NOT NULL,
    "joinURL" TEXT NOT NULL,
    "hostJoinURL" TEXT NOT NULL,
    "rawWebhookEvents" JSONB,
    "rawData" JSONB,
    "slackChannelID" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL,
    "hostKey" TEXT NOT NULL,
    "rawWebhookEventsTooLong" BOOLEAN NOT NULL DEFAULT false,
    "schedulingLinkId" TEXT NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingLink" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meetingsIds" TEXT[],
    "creatorSlackID" TEXT NOT NULL,
    "authedAccountID" TEXT NOT NULL,

    CONSTRAINT "SchedulingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "production" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "stackTrace" TEXT NOT NULL,
    "meetingId" TEXT,
    "hostZoomID" TEXT,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthedAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "slackID" TEXT,

    CONSTRAINT "AuthedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AuthedAccountToSchedulingLink" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Host_zoomID_key" ON "Host"("zoomID");

-- CreateIndex
CREATE UNIQUE INDEX "_AuthedAccountToSchedulingLink_AB_unique" ON "_AuthedAccountToSchedulingLink"("A", "B");

-- CreateIndex
CREATE INDEX "_AuthedAccountToSchedulingLink_B_index" ON "_AuthedAccountToSchedulingLink"("B");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostZoomID_fkey" FOREIGN KEY ("hostZoomID") REFERENCES "Host"("zoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_schedulingLinkId_fkey" FOREIGN KEY ("schedulingLinkId") REFERENCES "SchedulingLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingLink" ADD CONSTRAINT "SchedulingLink_authedAccountID_fkey" FOREIGN KEY ("authedAccountID") REFERENCES "AuthedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_hostZoomID_fkey" FOREIGN KEY ("hostZoomID") REFERENCES "Host"("zoomID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthedAccountToSchedulingLink" ADD FOREIGN KEY ("A") REFERENCES "AuthedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthedAccountToSchedulingLink" ADD FOREIGN KEY ("B") REFERENCES "SchedulingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
