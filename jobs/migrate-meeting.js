import prisma from "../api/prisma.js"
import airbridge from "../api/airbridge.js"
import removeTable from "./remove-table.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating meetings from airtable...`)

  if (reset) {
    await removeTable('meeting', {startTS})
  }

  const meetings = await airbridge.get('Meetings')
  const results = await prisma.client.meeting.createMany({
    data: meetings.map(meeting => ({
      id: meeting.id,
      zoomID: meeting.fields['Zoom ID'],
      slackCallID: meeting.fields['Slack Call ID'],
      hostID: (meeting.fields['Host'] || [])[0],
      startedAt: meeting.fields['Started At'],
      endedAt: meeting.fields['Ended At'],
      creatorSlackID: meeting.fields['Creator Slack ID'],
      joinURL: meeting.fields['Join URL'],
      hostJoinURL: meeting.fields['Host Join URL'],
      rawWebhookEvents: meeting.fields['Raw Webhook Events'],
      rawData: meeting.fields['Raw Data'],
      slackChannelID: meeting.fields['Slack Channel ID'],
      public: meeting.fields['Public'] || false,
      hostKey: meeting.fields['Host Key'],
      rawWebhookEventsTooLong: meeting.fields['Raw Webhook Events Too Long'] || false,
      schedulingLinkId: (meeting.fields['Scheduling Link'] || [])[0]
    })),
    skipDuplicates: true,
  })

  console.log(`[${startTS}] ${results.count} meetings migrated`)
}