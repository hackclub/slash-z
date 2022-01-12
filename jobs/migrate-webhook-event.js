import airbridge from "../api/airbridge"
import prisma from "../api/prisma.js"
import removeTable from "./remove-table.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating webhook events from airtable...`)

  if (reset) {
    await removeTable('webhookEvent', {startTS})
  }

  const events = await airbridge.get('Webhook Events', { maxRecords: 10 })
  const results = await prisma.client.webhookEvent.createMany({
    data: events.map(event => ({
      id: event.id,
      meetingId: (event.fields['Meeting'] || [])[0],
      timestamp: new Date(event.fields['Timestamp']),
      eventType: event.fields['Event Type'],
      rawData: event.fields['Raw Data'],
    })),
    skipDuplicates: true,
  })

  console.log(`[${startTS}] ${results.count} webhook event(s) migrated`)
}