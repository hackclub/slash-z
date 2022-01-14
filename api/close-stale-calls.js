import Prisma from "./prisma.js"
import closeZoomCall from "./close-zoom-call.js"

export default async ({creatorSlackID} = {}) => {
  const startTS = Date.now()
  console.log(`Starting to close stale calls at ${startTS}`)

  const cutoff = 60 * 2 * 1000 // 2 minutes

  const where = {
    endedAt: {
      equals: null,
    },
    startedAt: {
      lt: new Date(new Date() - cutoff)
    }
  }

  const staleCalls = await Prisma.get('meeting', { where })

  if (staleCalls.length == 0) { return 0 }

  const closedCalls = []
  await Promise.all(staleCalls.map(async call => {
    const closedCall = await closeZoomCall(call.zoomID)
    if (closedCall) {
      closedCalls.push(closedCall)
    }
  }))

  console.log(`I closed a total of ${closedCalls.length} call(s) from my task at ${startTS}`)

  return closedCalls
}