import closeZoomCall from "../close-zoom-call.js"
import Prisma from "../prisma.js"
import ensureZoomAuthenticated from "../ensure-zoom-authenticated.js"
import updateSlackCallParticipantList from "../update-slack-call-participant-list.js"
import slackAppHomeOpened from "../slack-app-home-opened.js"
import hackNightStats from "../hack-night.js"
import crypto from "crypto"

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
async function handleEvent(req, res, meeting) {
  // First, handle events that do not require a meeting
  switch(req.body.event) {
    case 'endpoint.url_validation':    
      const encryptedToken = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN).update(req.body.payload.plainToken).digest("hex");
      const response = {
        plainToken: req.body.payload.plainToken,
        encryptedToken: encryptedToken
      }  
      console.log(JSON.stringify(req.body))
      console.log(JSON.stringify(response))
      res.status(200).json(response)
      return;
  }

  if (!meeting) {
    console.log('Meeting not found, skipping...')
    res.status(404).send("That meeting does not exist")
    return
  }

  await handleSpecialHackNightLogic(req, meeting)
  console.log("webhook event received -> ", req.body.event);

  switch (req.body.event) {
    case 'meeting.ended':
      await Prisma.create('customLogs', { text: 'zoom_end_meeting_webhook', zoomCallId: meeting.zoomID || "undefined" })
      console.log('Attempting to close call w/ ID of', )
      await closeZoomCall(meeting.zoomID, true)
      break

      case 'meeting.participant_joined':
      console.log('triggered!')
      await updateSlackCallParticipantList('add', meeting.slackCallID, req.body.payload.object.participant)
      break

    case 'meeting.participant_left':
      await updateSlackCallParticipantList('remove', meeting.slackCallID, req.body.payload.object.participant)
      break

    case 'recording.completed':
      await slackAppHomeOpened(meeting.creatorSlackID, false)
      break

    default:
      console.log(`Recieved '${req.body.event}' event from Zoom webhook, which I don't know how to process... Skipping`)
      console.log(`Just in case, here's the info:`)
      console.log(JSON.stringify(req.body, null, 2))
      res.status(415).send("Unsupported webhook event")
      return;
  }

  res.status(200).send('Success!')
}

export default async (req, res) => {
  return await ensureZoomAuthenticated(req, res, async () => {
    console.log(`Recieved Zoom '${req.body.event}' webhook...`)
    const meeting = await getAssociatedMeeting(req);
    await persistWebhookEventsIfNecessary(req, meeting);
    await handleEvent(req, res, meeting);
  })
}
