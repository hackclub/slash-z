import airbridge from './airbridge.js'
import transcript from './transcript.js'
import fetch from 'node-fetch'

async function getParticipantCount(slackCallID) {
  const callInfo = await fetch('https://slack.com/api/calls.info', {
    method: 'post',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: slackCallID
    })
  }).then(r => r.json())
  if (!callInfo.call.users) {
    return 0
  }
  return callInfo.call.users.length
}

export default async function () {
  const filterByFormula = `AND({Status}='OPEN',{Public}=TRUE())`
  const meetings = await airbridge.get('Meetings', { filterByFormula })
  const meetingsWithParticipants = await Promise.all(
    meetings.map(async m => ({
      channel: m.fields['Slack Channel ID'],
      channelFlavor: transcript(
        `channelFlavor.${m.fields['Slack Channel ID']}`,
        {},
        null
      ),
      joinUrl: m.fields['Join URL'],
      participantCount: await getParticipantCount(m.fields['Slack Call ID'])
    }))
  )
  return meetingsWithParticipants.filter(m => m.participantCount > 0)
}
