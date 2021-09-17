import Bottleneck from 'bottleneck'

import AirBridge from './airbridge.js'
import openZoomMeeting from "./open-zoom-meeting.js"

const findOrCreateMeeting = async (queryID) => {
  // Find the scheduling link record with the ID we've been given
  let link = await AirBridge.find('Scheduling Links', {filterByFormula: `{Name}='${queryID}'` })
  if (!link) {
    const err = Error('Scheduling meeting not found!')
    err.statusCode = 404
    throw err
  }

  let airtableMeeting
  // if no OPEN meeting for the schedule link, let's create one now!
  if (link.fields['Open Meetings'] == 0) {
    console.log(`No open meetings for scheduling link '${link.fields['Name']}', creating a new one`)
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
    fields['Zoom ID'] = zoomMeeting.id.toString()
    fields['Host'] = [zoomMeeting.host.id]
    fields['Started At'] = Date.now()
    fields['Join URL'] = zoomMeeting.join_url
    fields['Scheduling Link'] = [link.id]
    fields['Host Join URL'] = zoomMeeting.start_url
    fields['Public'] = false // hard coding this b/c scheduled meetings aren't shown on the public list atm
    fields['Host Key'] = zoomMeeting.hostKey
    if (link.fields['Creator Slack ID']) {
      fields['Creator Slack ID'] = link.fields['Creator Slack ID']
    }

    airtableMeeting = await AirBridge.create('Meetings', fields)
  } else {
    console.log(`There's already an open meeting for scheduling link '${link.fields['Name']}'`)
    airtableMeeting = await AirBridge.find('Meetings', {filterByFormula: `AND('${link.fields['Name']}'={Scheduling Link},{Status}='OPEN')`})
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
