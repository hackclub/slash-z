// this file is only loading in production-- it queues a bunch of tasks that are meant to run in production

// keep in mind heroku restarts daily, so tasks may only need to be run once per server run

// we'll queue it up for a couple minutes later in case we have multiple rebuilds in a row
setTimeout(() => {
  const cleanupAirtableRecords = require('./api/cleanup-airtable-records')
  cleanupAirtableRecords()
}, 1000 * 60 * 10) // after 10 minutes in milliseconds

setTimeout(() => {
  const closeStaleCalls = require('./api/close-stale-calls')
  setInterval(closeStaleCalls, 1000 * 15) // every 15 seconds
}, 1000 * 60) // after 1 minute in milliseconds