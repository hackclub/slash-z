const closeZoomCall = require("../close-zoom-call");
const AirBridge = require("../airbridge")
const ensureZoomAuthenticated = require("../ensure-zoom-authenticated")

module.exports = async (req, res) => {
  await ensureZoomAuthenticated(req, res, async () => {
    console.log(`Recieved Zoom '${req.body.event}' webhook...`)

    // Zoom will sometimes send duplicate events, drop an event, or send an
    // event delayed (in testing I found this up to 10 minutes late)

    // Let's lookup our webhook event to see if we already got this event.
    const zoomCallID = req.body.payload.object.id

    const meeting = await AirBridge.find('Meetings', { filterByFormula: `{Zoom ID}='${zoomCallID}'` })

    await AirBridge.create('Webhook Events', {
      'Timestamp': req.body.event_ts,
      'Event Type': req.body.event,
      'Raw Data': JSON.stringify(req.body, null, 2),
      'Meeting': [meeting.id]
    })
    switch (req.body.event) {
      case 'meeting.ended':
        console.log('Attempting to close call w/ ID of', zoomCallID)
        closeZoomCall(zoomCallID)
        break
      default:
        console.log(`Recieved '${req.body.event}' event from Zoom webhook, which I don't know how to process... Skipping`)
        console.log(`Just in case, here's the info:`)
        console.log(JSON.stringify(req.body, null, 2))
        break
    }

  })
}