import cleanupAirtableRecords from './api/cleanup-airtable-records.js'
import closeStaleCalls from './api/close-stale-calls.js'

// this file should run in production-- it queues a bunch of tasks that are meant to run in production

// keep in mind heroku restarts daily, so tasks may only need to be run once per server run

// we'll queue it up for a couple minutes later in case we have multiple rebuilds in a row
if (process.env.NODE_ENV == 'production') {
  console.log('Queueing jobs...')
  setTimeout(() => cleanupAirtableRecords, 1000 * 60 * 10) // after 10 minutes in milliseconds

  setTimeout(() => {
    setInterval(closeStaleCalls, 1000 * 15) // every 15 seconds
  }, 1000 * 60) // after 1 minute in milliseconds
}