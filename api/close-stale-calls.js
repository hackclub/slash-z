const airbridge = require("./airbridge")
const closeZoomCall = require("./close-zoom-call")

module.exports = async ({creatorSlackID} = {}) => {
  const startTS = Date.now()
  console.log(`Starting to close stale calls at ${startTS}`)

  const cutoff = 60 * 2 // 2 minutes (airtable uses seconds)

  let formula = ''
  if (creatorSlackID) {
    // if we have a creator slackID, go ahead and close their calls
    formula = `
      AND(
        {status}='OPEN',
        OR(
          DATETIME_DIFF(NOW(),{Started At})>${cutoff},
          {Creator Slack ID}='${creatorSlackID}'
        )
      )
    `
  } else {
    // no creator slackID? let's only close open calls that have been around
    // since the cutoff time
    formula = `
      AND(
        {status}='OPEN', DATETIME_DIFF(NOW(),{Started At})>${cutoff}
      )
    `
  }

  const staleCalls = await airbridge.get('Meetings', {filterByFormula: formula})
  if (staleCalls.length == 0) { return 0 }

  const closedCalls = []
  await Promise.all(staleCalls.map(async call => {
    const closedCall = await closeZoomCall(call.fields['Zoom ID'])
    if (closedCall) {
      closedCalls.push(closedCall)
    }
  }))

  console.log(`I closed a total of ${closedCalls.length} call(s) from my task at ${startTS}`)

  return closedCalls
}