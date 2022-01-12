import airbridge from "../api/airbridge.js"
import prisma from "../api/prisma.js"
import removeTable from "./remove-table.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating scheduling links from airtable...`)

  if (reset) {
    await removeTable('schedulingLink', { startTS})
  }

  const links = await airbridge.get('Scheduling Links')
  const results = await prisma.client.schedulingLink.createMany({
    data: links.map(link => ({
      id: link.id,
      name: link.fields['Name'],
      creatorSlackID: link.fields['Creator Slack ID'],
      authedAccountID: (link.fields['Authed Account'] || [])[0]
    })),
    skipDuplicates: true,
  })

  console.log(`[${startTS}] ${results.count} scheduling link(s) migrated`)
}