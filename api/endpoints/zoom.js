import closeZoomCall from "../close-zoom-call.js"
import Prisma from "../prisma.js"
import ensureZoomAuthenticated from "../ensure-zoom-authenticated.js"
import updateSlackCallParticipantList from "../update-slack-call-participant-list.js"
import slackAppHomeOpened from "../slack-app-home-opened.js"
import hackNightStats from "../hack-night.js"


async function getAssociatedMeeting(req) {
  try {
      const meetingId = req.body.payload.object.id;
      return await Prisma.find('meeting', { where: { zoomID: meetingId }, include: { schedulingLink: true } })
  } catch {
    return null
  }
}

async function persistWebhookEventsIfNecessary(req, meeting) {
  if (!meeting)
    return

  await Prisma.create('webhookEvent', {
    timestamp: new Date(req.body.event_ts),
    eventType: req.body.event,
    rawData: JSON.stringify(req.body, null, 2),
    meeting: { connect: { id: meeting.id } }
  })
}

async function handleSpecialHackNightLogic(req, meeting) {
  const isHackNight = meeting.schedulingLink?.name === "1vu13b";

  if (isHackNight) 
    await hackNightStats(req.body.event, meeting, req.body.payload);
}

// Zoom will sometimes send duplicate events, drop an event, or send an
async function handleEvent(req, meeting) {
  // First, handle events that do not require a meeting
  switch(req.body.event) {
    case 'endpoint.url_validation':
      return true
  }

  if (!meeting) {
    console.log('Meeting not found, skipping...')
    return
  }

  await handleSpecialHackNightLogic(req, meeting)

  switch (req.body.event) {
    case 'meeting.ended':
      await Prisma.create('customLogs', { text: 'zoom_end_meeting_webhook', zoomCallId: meeting.id || "undefined" })
      console.log('Attempting to close call w/ ID of', )
      return await closeZoomCall(meeting.id, false)
    case 'meeting.participant_joined':
      console.log('triggered!')
      return await updateSlackCallParticipantList('add', meeting.slackCallID, req.body.payload.object.participant)
    case 'meeting.participant_left':
      return await updateSlackCallParticipantList('remove', meeting.slackCallID, req.body.payload.object.participant)
    case 'recording.completed':
      return await slackAppHomeOpened(meeting.creatorSlackID, false)
    default:
      console.log(`Recieved '${req.body.event}' event from Zoom webhook, which I don't know how to process... Skipping`)
      console.log(`Just in case, here's the info:`)
      console.log(JSON.stringify(req.body, null, 2))
      break
  }
}

export default async (req, res) => {
  return await ensureZoomAuthenticated(req, res, async () => {
    console.log(`Recieved Zoom '${req.body.event}' webhook...`)
    const meeting = await getAssociatedMeeting(req);
    await persistWebhookEventsIfNecessary(req, meeting);
    return await handleEvent(req, meeting);
  })
}
