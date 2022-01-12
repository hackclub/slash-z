import prisma from '../api/prisma.js'

const removedTables = []

// ex. await removeTable('host', {dep: ['meeting']})
const dependencies = {
  'host': ['meeting', 'errorLog'],
  'meeting': ['webhookEvent', 'errorLog'],
  'schedulingLink': ['meeting'],
  'webhookEvent': [],
  'authedAccount': ['schedulingLink'],
}

const removeTable = async (table, {startTS=Date.now(), depth=0}) => {
  const padding = ' '.repeat(depth)

  if (removedTables.includes(table)) {
    console.log(`${padding}[${startTS}] ${table}(s) already removed, skipping`)
    return
  }

  const deps = dependencies[table]
  if (deps) {
    for (const dep of deps) {
      console.log(`${padding}[${startTS}] ${table} depends on ${dep}...`)
      await removeTable(dep, {startTS, depth: depth+1})
    }
  }
  console.log(`${padding}[${startTS}] Removing ${table}(s)...`)
  const results = await prisma.client[table].deleteMany()
  removedTables.push(table)
  console.log(`${padding}[${startTS}] Removed ${results.count} ${table}(s)`)
}

export default removeTable