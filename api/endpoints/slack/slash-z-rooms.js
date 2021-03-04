const { default: fetch } = require("node-fetch")
const airbridge = require("../../airbridge")

module.exports = async (req, res) => {
  const filterByFormula = ` {Status}='OPEN' `
  const openMeetings = await airbridge.get('Meetings', {filterByFormula})
  const publicMeetings = []
  const openMeetingPromises = openMeetings.map(async (openMeeting) => {
    console.log('testing if this channel is public', openMeeting.fields['Slack Channel ID'])
    if (!openMeeting.fields['Slack Channel ID']) {
      console.log("...wait, that's not a Slack channel!")
      // No slack channel ID? it's probably a scheduled call, which isn't posted to Slack & should be private
      return false
    }
    if (openMeeting.fields['Slack Channel ID'][0] != 'C') {
      console.log("...it doesn't start with a 'c', so it probably isn't")
      // Slack channel IDs start with 'C', so groups ('G') or DMs ('D') won't be public
      return false
    }
    const channelInfo = await fetch(`https://slack.com/api/conversations.info?channel=${openMeeting.fields['Slack Channel ID']}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      },
    }).then(r => r.json())
    // if (!channelInfo.ok) {
    //   // If slack is rejecting our request, it's probably for a private channel
    //   // or DM we don't have access to... let's treat this as private
    //   return false
    // }
    console.log({channelInfo})
    if (channelInfo.channel['is_private']) {
      console.log("...slack just told me it's private")
      return false
    }
    console.log("... it is public!")
    publicMeetings.push(openMeeting)
  })
  console.log('converted to promises, now executing!')
  await Promise.all(openMeetingPromises)
  console.log('Now i have this many meetings:', publicMeetings.length)

  let messageText = 'There are currently no public meetings in the Slack. Why not start one? Just run `/z` in a public channel.'

  if (publicMeetings.length > 0) {
    publicMeetings.map(m => m.id).join(' ')
    messageText = 'Here are the public meetings currently running:'
    messageText = messageText+'\n'+publicMeetings.map(m => `- <${m.fields['Join URL']}|a call> in <#${m.fields['Slack Channel ID']}>`).join('\n')
  }

  const loadingSlackPost = await fetch(req.body.response_url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'in_channel',
      text: messageText,
    })
  })
}