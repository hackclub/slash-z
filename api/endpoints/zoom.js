import closeZoomCall from "../close-zoom-call.js"
import Prisma from "../prisma.js"
import ensureZoomAuthenticated from "../ensure-zoom-authenticated.js"
import updateSlackCallParticipantList from "../update-slack-call-participant-list.js"
import slackAppHomeOpened from "../slack-app-home-opened.js"


export default async (req, res) => {
  return await ensureZoomAuthenticated(req, res, async () => {
    console.log(`Recieved Zoom '${req.body.event}' webhook...`)

    // Zoom will sometimes send duplicate events, drop an event, or send an
    // event delayed (in testing I found up to 30 minutes late)

    // Let's lookup our webhook event to see if we already got this event.
    const zoomCallID = req.body.payload.object.id

    // const meeting = await AirBridge.find('Meetings', { filterByFormula: `{Zoom ID}='${zoomCallID}'` })
    const meeting = await Prisma.find('Meeting', { where: { zoomID: zoomCallID } })

    await Prisma.create('webhookEvent', {
      timestamp: req.body.event_ts,
      eventType: req.body.event,
      rawData: JSON.stringify(req.body, null, 2),
      meeting: meeting?.id
    })

    if (!meeting) {
      console.log('Meeting not found, skipping...', zoomCallID)
      return
    }

    switch (req.body.event) {
      case 'meeting.ended':
        console.log('Attempting to close call w/ ID of', zoomCallID)
        return await closeZoomCall(zoomCallID)
        break
      case 'meeting.participant_joined':
        return await updateSlackCallParticipantList('add', meeting.slackCallID, req.body.payload.object.participant)
        break
      case 'meeting.participant_left':
        return await updateSlackCallParticipantList('remove', meeting.slackCallID, req.body.payload.object.participant)
        break
      case 'recording.started':
        return await postSlackCallThread(meeting)
        break
      case 'recording.completed':
        return await slackAppHomeOpened(meeting.creatorSlackID, false)
        break
      default:
        console.log(`Recieved '${req.body.event}' event from Zoom webhook, which I don't know how to process... Skipping`)
        console.log(`Just in case, here's the info:`)
        console.log(JSON.stringify(req.body, null, 2))
        break
    }

  })
}