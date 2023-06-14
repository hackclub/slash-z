import closeZoomCall from "../close-zoom-call.js"
import Prisma from "../prisma.js"
import ensureZoomAuthenticated from "../ensure-zoom-authenticated.js"
import updateSlackCallParticipantList from "../update-slack-call-participant-list.js"
import slackAppHomeOpened from "../slack-app-home-opened.js"
import hackNightStats from "../hack-night.js"


export default async (req, res) => {
  return await ensureZoomAuthenticated(req, res, async () => {
    console.log(`Recieved Zoom '${req.body.event}' webhook...`)

    // Zoom will sometimes send duplicate events, drop an event, or send an
    // event delayed (in testing I found up to 30 minutes late)

    // Let's lookup our webhook event to see if we already got this event.
    const zoomCallID = req.body.payload.object.id

    const meeting = await Prisma.find('meeting', { where: { zoomID: zoomCallID.toString() }, include: { schedulingLink: true } })

    const fields = {
      timestamp: new Date(req.body.event_ts),
      eventType: req.body.event,
      rawData: JSON.stringify(req.body, null, 2),
    }
    if (meeting) {
      fields.meeting = { connect: { id: meeting.id } }
    }

    await Prisma.create('webhookEvent', fields)

    if (!meeting) {
      console.log('Meeting not found, skipping...', zoomCallID)
      return
    }
    
    const isHackNight = meeting?.schedulingLink?.name === "1vu13b";

    if (isHackNight) hackNightStats(req.body.event, meeting, req.body.paylod);

    switch (req.body.event) {
      case 'meeting.ended':
        await Prisma.create('customLogs', { message: 'zoom_end_meeting_webhook', zoomCallId })
        console.log('Attempting to close call w/ ID of', zoomCallID)
        return await closeZoomCall(zoomCallID, false, true)
        break
      case 'meeting.participant_joined':
        console.log('triggered!')
        return await updateSlackCallParticipantList('add', meeting.slackCallID, req.body.payload.object.participant)
        break
      case 'meeting.participant_left':
        return await updateSlackCallParticipantList('remove', meeting.slackCallID, req.body.payload.object.participant)
        break
      case 'recording.started':
        // return await postSlackCallThread(meeting)
        // ^ not implemented yet
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
