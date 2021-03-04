const airbridge = require("../../airbridge")

module.exports = async (req, res) => {
  const filterByFormula = `
  AND(
    {Status}='OPEN',
  )
  `
  const openMeetings = airbridge.get('Meetings', {filterByFormula})
  const publicMeetings = []
  await Promise.all(openMeetings.forEach(async openMeeting => {
    if (!openMeeting.fields['Slack Channel ID']) {
      // No slack channel ID? it's probably a scheduled call, which isn't posted to Slack & should be private
      return false
    }
    if (openMeeting.fields['Slack Channel ID'][0] != 'C') {
      // Slack channel IDs start with 'C', so groups ('G') or DMs ('D') won't be public
      return false
    }
    const channelInfo = await fetch('https://slack.com/api/conversations.info', {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: {
        channel: openMeeting.fields['Slack Channel ID']
      }
    }).then(r => r.json())
    if (channelInfo.channel['is_private']) {
      return false
    }
    publicMeetings.push(openMeeting)
  }))

  const loadingSlackPost = await fetch(req.body.response_url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'in_channel',
      text: publicMeetings.map(m => m.id).join(' '),
    })
  })
}