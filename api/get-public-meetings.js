const { default: fetch } = require("node-fetch")
const airbridge = require("./airbridge")

async function getParticipantCount(slackCallID) {
  const callInfo = await fetch('https://slack.com/api/calls.info', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
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

module.exports = async function() {
  const filterByFormula = `AND({Status}='OPEN',{Public}=TRUE())`
  const meetings = await airbridge.get('Meetings', {filterByFormula})
  const meetingsWithParticipants = await Promise.all(
    meetings.map(async m => ({
      channel: m.fields['Slack Channel ID'],
      joinUrl: m.fields['Join URL'],
      participantCount: await getParticipantCount(m.fields['Slack Call ID'])
    }))
  )
  return meetingsWithParticipants.filter(m => m.participantCount > 0)
}