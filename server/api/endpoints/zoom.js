const closeZoomCall = require("../close-zoom-call");
const AirBridge = require("../airbridge")
const ensureZoomAuthenticated = require("../ensure-zoom-authenticated");
const updateSlackCallParticipantList = require("../update-slack-call-participant-list");

module.exports = async (req, res) => {
  await ensureZoomAuthenticated(req, res, async () => {
    console.log(`Recieved Zoom '${req.body.event}' webhook...`)

    // Zoom will sometimes send duplicate events, drop an event, or send an
    // event delayed (in testing I found up to 30 minutes late)

    // Let's lookup our webhook event to see if we already got this event.
    const zoomCallID = req.body.payload.object.id

    const meeting = await AirBridge.find('Meetings', { filterByFormula: `{Zoom ID}='${zoomCallID}'` })

    await AirBridge.create('Webhook Events', {
      'Timestamp': req.body.event_ts,
      'Event Type': req.body.event,
      'Raw Data': JSON.stringify(req.body, null, 2),
      'Meeting': meeting ? [meeting.id] : []
    })

    if (!meeting) {
      console.log('Meeting not found, skipping...', zoomCallID)
      return
    }

    switch (req.body.event) {
      case 'meeting.ended':
        console.log('Attempting to close call w/ ID of', zoomCallID)
        closeZoomCall(zoomCallID)
        break
      case 'meeting.participant_joined':
        updateSlackCallParticipantList('add', meeting.fields['Slack Call ID'], req.body.payload.object.participant)
        break
      case 'meeting.participant_left':
        updateSlackCallParticipantList('remove', meeting.fields['Slack Call ID'], req.body.payload.object.participant)
        break
      default:
        console.log(`Recieved '${req.body.event}' event from Zoom webhook, which I don't know how to process... Skipping`)
        console.log(`Just in case, here's the info:`)
        console.log(JSON.stringify(req.body, null, 2))
        break
    }

  })
}