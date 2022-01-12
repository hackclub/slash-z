import airbridge from "../api/airbridge.js"
import prisma from "../api/prisma.js"
import removeTable from "./remove-table.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating hosts from airtable...`)

  if (reset) {
    await removeTable('host', {startTS})
  }

  const hosts = await airbridge.get('Hosts')
  const results = await prisma.client.host.createMany({
    data: hosts.map(host => ({
      id: host.id,
      email: host.fields['Email'],
      enabled: host.fields['Enabled'] || false,
      displayName: host.fields['Name Displayed to Users'],
      apiKey: host.fields['API Key'],
      apiSecret: host.fields['API Secret'],
      zoomID: host.fields['Zoom ID'],
      testing: false
    })),
    skipDuplicates: true,
  })

  console.log(`[${startTS}] ${results.count} hosts migrated`)
}