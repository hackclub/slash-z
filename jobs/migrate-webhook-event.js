import batchUpload from "./batch-upload.js"
import removeTable from "./remove-table.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating webhook events from airtable...`)

  if (reset) {
    await removeTable('webhookEvent', {startTS})
  }

  
  const count = await batchUpload({
    startTS,
    table: 'webhookEvent',
    airtableRecords: events,
    transform: (event) => ({
      id: event.id,
      meetingId: (event.fields['Meeting'] || [])[0],
      timestamp: new Date(event.fields['Timestamp']),
      eventType: event.fields['Event Type'],
      rawData: event.fields['Raw Data'],
    })
  })

  console.log(`[${startTS}] ${count} webhook event(s) migrated`)
}