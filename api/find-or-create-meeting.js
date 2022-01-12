import Bottleneck from 'bottleneck'

import Prisma from './prisma.js'
import openZoomMeeting from "./open-zoom-meeting.js"

const findOrCreateMeeting = async (queryID) => {
  // Find the scheduling link record with the ID we've been given
  let link = await Prisma.find('schedulingLink', {
    where: {name: queryID}
  })
  if (!link) {
    const err = Error('Scheduling meeting not found!')
    err.statusCode = 404
    throw err
  }

  let openMeetingsCount = await Prisma.count('meeting', { where: { endedAt: {
    equals: null,
  }, schedulingLinkId: link.id } })

  let airtableMeeting
  // if no OPEN meeting for the schedule link, let's create one now!
  if (openMeetingsCount == 0) {
    console.log(`No open meetings for scheduling link '${link.name}', creating a new one`)
    // start a meeting
    let zoomMeeting
    try {
      zoomMeeting = await openZoomMeeting()
    } catch (err) {
      err.statusCode = 503
      throw err
    }
    // add it to the list of scheduled meetings
    const fields = {}
    fields.zoomID = zoomMeeting.id.toString()
    fields.host = {connect: {
      zoomID: zoomMeeting.host.id
    }}
    fields.startedAt = Date.now()
    fields.joinURL = zoomMeeting.join_url
    fields.schedulingLinkId = link.id
    fields.hostJoinURl = zoomMeeting.start_url
    fields.public = false // hard coding this b/c scheduled meetings aren't shown on the public list atm
    fields.hostKey = zoomMeeting.hostKey
    if (link.creatorSlackID) {
      fields.creatorSlackID = link.creatorSlackID
    }

    airtableMeeting = await Prisma.create("meeting", fields)
  } else {
    console.log(`There's already an open meeting for scheduling link '${link.name}'`)
    airtableMeeting = await Prisma.find('meeting', {
      where: {
        schedulingLinkId: link.id,
        endedAt: {
          equals: null,
        }
      }
    })
  }

  return airtableMeeting
}

const limiters = {}
const getLimiter = id => {
  if (!limiters[id]) {
    limiters[id] = new Bottleneck({ maxConcurrent: 1 })
  }

  return limiters[id]
}

export default (queryID) => getLimiter(queryID).schedule(() => findOrCreateMeeting(queryID))
