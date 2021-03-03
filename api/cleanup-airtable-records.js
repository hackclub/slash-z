// Airtable has a record limit of 50k
// Before we reach that, this job should go through and prune all the old requests

// deletion logic here is kinda arbitrary, i'm just trying it out and we'll see if it works...

const airbridge = require("./airbridge")

module.exports = async () => {
  // step 1: if we're at over 40k log records, let's cleanup old webhook events that aren't related to a meeting 
  const cutoffSeconds = 60 * 60 * 24 * 7 // 7 days, counted in seconds
  const filterByFormula = `
  AND(
    {Meeting}=BLANK(),
    DATETIME_DIFF(NOW(),CREATED_TIME())>${cutoffSeconds}
  )
  `
  const events = await airbridge.get('Webhook Events', {filterByFormula, maxRecords: 5000})
  await Promise.all(events.map(event => airbridge.destroy('Webhook Events', event.id)))
}