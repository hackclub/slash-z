import airbridge from "../api/airbridge.js"
import prisma from "../api/prisma.js"
import removeTable from "./remove-table.js"

export default async ({ reset = false }) => {
  const startTS = Date.now()
  console.log(`[${startTS}] Migrating authed accounts from airtable...`)

  if (reset) {
    await removeTable('authedAccount', {startTS})
  }

  const accounts = await airbridge.get('Authed Accounts')
  const results = await prisma.client.authedAccount.createMany({
    data: accounts.map(account => ({
      id: account.id,
      name: account.fields['Name'],
      slackID: account.fields['Slack ID'],
    })),
    skipDuplicates: true,
  })
  console.log(`[${startTS}] ${results.count} authed accounts migrated`)
}