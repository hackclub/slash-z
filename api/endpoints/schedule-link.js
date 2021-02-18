const AirBridge = require("../airbridge")
const openZoomMeeting = require("../open-zoom-meeting")

module.exports = async (req, res) => {
  const { query } = req

  // No scheduling link ID? Let's redirect the user to get a new one
  if (!query || !query.id) {
    res.redirect('new-schedule-link')
    return
  }

  // Find or create a scheduling link record with the ID we've been given
  let link = await AirBridge.find('Scheduling Links', {filterByFormula: `{Name}='${query.id}'` })
  if (!link) {
    link = await AirBridge.create('Scheduling Links', {Name: query.id})
  }

  let airtableMeeting
  // if no OPEN meeting for the schedule link, let's create one now!
  if (link.fields['Open Meetings'] == 0) {
    console.log(`No open meetings for scheduling link '${link.fields['Name']}', creating a new one`)
    // start a meeting
    const zoomMeeting = await openZoomMeeting()
    console.log(`Created zoom meeting '${zoomMeeting.id}', recording on airtable`)
    // add it to the list of scheduled meetings
    airtableMeeting = await AirBridge.create('Meetings', {
      'Zoom ID': '' + zoomMeeting.id,
      'Creator Slack ID': link.fields['Creator Slack ID'],
      'Host': [zoomMeeting.hostID],
      'Started At': Date.now(),
      'Join URL': zoomMeeting.join_url,
      'Scheduling Link': [link.id]
    })
  } else {
    console.log(`There's already an open meeting for scheduling link '${link.fields['Name']}'`)
    airtableMeeting = await AirBridge.find('Meetings', {filterByFormula: `AND('${link.fields['Name']}'={Scheduling Link},{Status}='OPEN')`})
  }

  res.redirect(airtableMeeting.fields['Join URL'])

}