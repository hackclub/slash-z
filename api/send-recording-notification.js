import fetch from 'node-fetch'

// THIS IS A WIP
export default async meeting => {
  if (!meeting.fields['channel']) {
    // this isn't a message to post in the slack
    return null
  }
  const slackPost = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: '',
      thread_ts: '',
      text: ''
    })
  })
}
