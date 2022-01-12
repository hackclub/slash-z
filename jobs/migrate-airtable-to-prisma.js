// migrate hosts from airtable to database

// only run this if intentional... it's a heavy process

if (true) {
  let reset = true

  await (await import('./migrate-host.js')).default({ reset })
  await (await import('./migrate-authed-account.js')).default({ reset })
  await (await import('./migrate-scheduling-link.js')).default({ reset })
  // These are a *VERY HEAVY* operation that will take a couple minutes on good internet... please be sure you actually want to run the below steps
  await (await import('./migrate-meeting.js')).default({ reset }),
  await (await import('./migrate-webhook-event.js')).default({ reset }),
  console.log('Migration from airtable complete!')
}