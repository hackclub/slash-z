import closeStaleCalls from '../api/close-stale-calls.js'
import isProd from '../isprod.js'

import './migrate-airtable-to-prisma.js'

// this file should run in production-- it queues a bunch of tasks that are meant to run in production

// keep in mind heroku restarts daily, so tasks may only need to be run once per server run

// we'll queue it up for a couple minutes later in case we have multiple rebuilds in a row
if (isProd) {
  console.log('Queueing jobs...')
  setTimeout(cleanupAirtableRecords, 1000 * 60 * 10) // after 10 minutes in milliseconds

  setTimeout(() => {
  setInterval(closeStaleCalls, 1000 * 120) // every 2 minutes
  }, 1000 * 60) // after 1 minute in milliseconds
} else {
  closeStaleCalls()
  setTimeout(() => {
  setInterval(closeStaleCalls, 1000 * 120) // every 2 minutes
  }, 1000 * 60) // after 1 minute in milliseconds
}
