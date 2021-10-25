// Airtable has a record limit of 50k
// Before we reach that, this job should go through and prune all the old requests

// deletion logic here is kinda arbitrary, i'm just trying it out and we'll see if it works...

import airbridge from "./airbridge.js"
import Bottleneck from "bottleneck"

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 2000
});

const cleanupAirtableRecords = async (repeat=false) => {
  {
    // step 1: let's cleanup old webhook events that aren't related to a meeting 
    const cutoffSeconds = 60 * 60 * 24 * 1 // 1 days, counted in seconds
    const filterByFormula = `
    AND(
      {Meeting}=BLANK(),
      DATETIME_DIFF(NOW(),CREATED_TIME())>${cutoffSeconds}
    )
    `
    const events = await airbridge.get('Webhook Events', {filterByFormula, maxRecords: 1000})
    const limitedJobQueue = events.map(async event => (
      await limiter.schedule(() => airbridge.destroy('Webhook Events', event.id))
    ))
    await Promise.all(limitedJobQueue)
  }
  
  {
    // step 2: Lets cleanup old meetings that never had any events
    const filterByFormula = `
    AND(
      {Webhook Events}=BLANK(),
      {Raw Webhook Events}=BLANK(),
      {Status}='ENDED'
    )
    `
    const emptyMeetings = await airbridge.get('Meetings', {filterByFormula, maxRecords: 1000})
    const limitedJobQueue = emptyMeetings.map(async meeting => (
      await limiter.schedule(async () => {
        await airbridge.destroy('Meetings', meeting.id)
      })
    ))

    await Promise.all(limitedJobQueue)
  }

  {
    // step 3: if we have meetings that ended, let's cleanup their associated webhook events & pack those into the record itself
    const cutoffSeconds = 60 * 60 * 24 * 7 // 7 days, counted in seconds
    const filterByFormula = `
    AND(
      {Raw Webhook Events}=BLANK(),
      NOT({Webhook Events}=BLANK()),
      {Raw Webhook Events Too Long}=BLANK(),
      {Status}='ENDED',
      DATETIME_DIFF(NOW(),{Ended At})>${cutoffSeconds}
    )
    `
    const closedMeetings = await airbridge.get('Meetings', { filterByFormula, maxRecords: 1000 })
    const limitedJobQueue = closedMeetings.map(async closedMeeting =>
      await limiter.schedule(async () => {
        console.log('Archiving webhook events for meeting', closedMeeting.id)
        const eventFormula = `{Meeting}='${closedMeeting.fields['Zoom ID']}'`
        const events = await airbridge.get('Webhook Events', { filterByFormula: eventFormula })
        const joinedEvents = events.map(e => JSON.parse(e.fields['Raw Data']))
        const rawWebhookEvents = JSON.stringify(joinedEvents)
        // https://community.airtable.com/t/what-is-the-long-text-character-limit/1780/4
        // Airtable only supports lengths of 100,000 characters
        if (rawWebhookEvents.length <= 100000) {
          console.log('Updating meeting', closedMeeting.id)
          await airbridge.patch('Meetings', closedMeeting.id, { 'Raw Webhook Events': rawWebhookEvents })
          console.log('Done updating meeting', closedMeeting.id)
        } else {
          console.log('Not adding webhooks to', closedMeeting.id, '- raw JSON is too long for storing in Airtable')
          await airbridge.patch('Meetings', closedMeeting.id, { 'Raw Webhook Events Too Long': true })
        }
      })
    )
    await Promise.all(limitedJobQueue)
  }

  {
    // step 4: if we have webhook events that have already been packed into their meeting records let's clean them up
    const meetingFormula = `
      AND(
        NOT({Raw Webhook Events}=BLANK()),
        NOT({Webhook Events}=BLANK()),
        {Raw Webhook Events Too Long}=FALSE()
      )
    `
    const packedMeetings = await airbridge.get('Meetings', { filterByFormula: meetingFormula, maxRecords: 1000 })
    const limitedJobQueue = packedMeetings.map(async packedMeeting =>
      await limiter.schedule(async () => {
        console.log('Deleting webhook events for already archived meeting', packedMeeting.id)
        const eventFormula = `{Meeting}='${packedMeeting.fields['Zoom ID']}'`
        const events = await airbridge.get('Webhook Events', { filterByFormula: eventFormula })
        const joinedEvents = events.map(e => JSON.parse(e.fields['Raw Data']))
        const rawWebhookEvents = JSON.stringify(joinedEvents)
        // Before deleting the events, let's check the values are equal
        try {
          const meetingRecordEvents = packedMeeting.fields['Raw Webhook Events']
          if (meetingRecordEvents == rawWebhookEvents) {
            console.log(`Going forward with deletion for events on meeting '${packedMeeting.fields['Zoom ID']}'`)
            const eventDeletionJobs = events.map(event => {
              return airbridge.destroy('Webhook Events', event.id)
            })
            await Promise.all(eventDeletionJobs)
          } else {
            throw new Error(`Mismatch in events for meeting '${packedMeeting.fields['Zoom ID']}'`)
          }
        } catch (e) {
          console.error(`Skipping meeting '${packedMeeting.fields['Zoom ID']}'`)
        }
      }))

    await Promise.all(limitedJobQueue)
  }
  if (repeat) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          resolve(await cleanupAirtableRecords(true))
        } catch (e) {
          console.error(e)
        }
      }, 1000 * 60 * 3) // 3 minutes
    })
  }
}
export default cleanupAirtableRecords