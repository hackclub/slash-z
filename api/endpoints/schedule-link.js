const AirBridge = require("../airbridge")
const openZoomMeeting = require("../open-zoom-meeting")

module.exports = async (req, res) => {
  const { query } = req

  // No scheduling link ID? Let's redirect the user to get a new one
  if (!query || !query.id) {
    res.redirect('new-schedule-link')
    return
  }

  // Find the scheduling link record with the ID we've been given
  let link = await AirBridge.find('Scheduling Links', {filterByFormula: `{Name}='${query.id}'` })
  if (!link) {
    res.status(404).send('Scheduled meeting not found!')
    return
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
      res.status(503).send('No open hosts!')
      return
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

  if (query.phone) {
    res.redirect('/phone.html?meetingID='+airtableMeeting.fields['Zoom ID'])
  } else {
    res.redirect(airtableMeeting.fields['Join URL'])
  }
}