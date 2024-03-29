import getPublicMeetings from "../../get-public-meetings.js"
import transcript from "../../transcript.js"
import fetch from 'node-fetch'

export default async (req, res) => {
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
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'ephemeral',
      text: messageText,
    })
  })
}