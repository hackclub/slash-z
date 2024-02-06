import removeTable from "./remove-table.js"
import batchUpload from "./batch-upload.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating scheduling links from airtable...`)

  if (reset) {
    await removeTable('schedulingLink', { startTS })
  }

  const count = await batchUpload({
    startTS,
    table: 'schedulingLink',
    airtableRecords: links,
    transform: (link) => ({
      id: link.id,
      name: link.fields['Name'],
      creatorSlackID: link.fields['Creator Slack ID'],
      authedAccountID: (link.fields['Authed Account'] || [])[0],
    })
  })

  console.log(`[${startTS}] Done migrating ${count} scheduling link(s)`)
}