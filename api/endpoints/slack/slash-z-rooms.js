import getPublicMeetings from "../../get-public-meetings.js"
import transcript from "../../transcript.js"
import fetch from 'node-fetch'
import ensureSlackAuthenticated from '../../ensure-slack-authenticated.js'

// exported for the /api/endpoints/slack dispatcher, which verifies the
// request signature before dispatching here
export const slashZRooms = async (req, res) => {
  const meetings = await getPublicMeetings()

  let messageText = ''
  if (meetings.length > 1) {
    messageText = transcript('publicMeetings.multiple', {meetings})
  } else if (meetings.length > 0) {
    messageText = transcript('publicMeetings.single', {meeting: meetings[0]})
  } else {
    messageText = transcript('publicMeetings.none')
  }

  await fetch(req.body.response_url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'ephemeral',
      text: messageText,
    })
  })
}

// this file is also mounted directly at /api/endpoints/slack/slash-z-rooms by
// routes.js, so it must verify the Slack request signature itself
export default (req, res) => ensureSlackAuthenticated(req, res, () => slashZRooms(req, res))