const { default: fetch } = require("node-fetch")
const AirBridge = require("../airbridge")
const ensureSlackAuthenticated = require("../ensure-slack-authenticated")
const openZoomMeeting = require('../open-zoom-meeting')

module.exports = async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    
    // Acknowledge we got the message so Slack doesn't show an error to the user
    res.status(200).send()

    const loadingSlackPost = await fetch(req.body.response_url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'in_channel',
        text: 'A new Zoom Pro meeting was started with /z',
      })
    })
    console.log({loadingSlackPost})
    
    // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
    // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
    // ¯\_(ツ)_/¯

    let meeting
    try {
      meeting = await openZoomMeeting({creatorSlackID: req.body.user_id})
    } catch (err) {
      const errorSlackPost = await fetch(req.body.response_url, {
        method: 'post',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response_type: 'in_channel',
          text: 'Out of open hosts!',
        })
      })
      throw err
    }
    
    // now register the call on slack
    const slackCallFields = {
      external_unique_id: meeting.id,
      join_url: meeting.join_url,
      created_by: req.body.user_id,
      date_start: Date.now(),
      desktop_app_join_url: `zoommtg://zoom.us/join?confno=${meeting.id}&zc=0`,
      external_display_id: meeting.id,
      title: `Zoom Pro meeting started by ${req.body.user_name}`
    }
    
    const slackCallResult = await fetch('https://slack.com/api/calls.add', {
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    method: 'post',
    body: JSON.stringify(slackCallFields)
  }).then(r => r.json())
  const slackCall = slackCallResult.call
  
  // & post to slack + airtable!
  AirBridge.create('Meetings', {
    'Zoom ID': '' + meeting.id,
    'Slack Call ID': slackCall.id,
    'Host': [meeting.host.id],
    'Started At': Date.now(),
    'Creator Slack ID': req.body.user_id,
    'Join URL': meeting.join_url,
    'Host Join URL': meeting.start_url,
    'Raw Data': JSON.stringify(meeting, null, 2),
  })
  
  const slackPostFields = {
    response_type: 'in_channel',
    text: 'A new Zoom Pro meeting was started with /z',
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `After running \`/z\`, you wander the creaky hallways and stumble upon the *${meeting.host.fields['Name Displayed to Users']}*. You try it and the door is unlocked.`
      }
    },{
      type: 'call',
      call_id: slackCall.id
    },{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_Psst ${meeting.join_url} is the call link._`
      }
    }]
  }
  const slackPost = await fetch(req.body.response_url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(slackPostFields)
  })

  await fetch(req.body.response_url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'ephemeral',
      text: ':key: You find a golden key',
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `You find a hastily scribbled note on the ground. You find the numbers **${meeting.hostKey}** you can use to <https://support.zoom.us/hc/en-us/articles/115001315866-Host-Key-Control-For-Zoom-Rooms|make yourself the host> of the *${meeting.host.fields['Name Displayed to Users']}*.`
        }
      }]
    })
  })
})
}