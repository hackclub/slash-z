const { default: fetch } = require("node-fetch")
const AirBridge = require("../airbridge")
const ensureSlackAuthenticated = require("../ensure-slack-authenticated")
const ZoomClient = require('../zoom-client')

module.exports = async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    
    // Acknowledge we got the message so Slack doesn't show an error to the user
    res.status(200).send('Working on it!')
    
    // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
    // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
    // ¯\_(ツ)_/¯
    let host = await AirBridge.find('Hosts', {filterByFormula:'{Open Meetings}<2'})
    
    // make a zoom client for the open host
    const zoom = new ZoomClient({zoomSecret: host.fields['API Secret'], zoomKey: host.fields['API Key']})
    
    // no zoom id? no problem! let's figure it out and cache it for next time
    if (!host.fields['Zoom ID'] || host.fields['Zoom ID'] == '') {
      // get the user's zoom id
      const hostZoom = await zoom.get({ path: `users/${host.fields['Email']}` })
      host = await AirBridge.patch('Hosts', host.id, {'Zoom ID': hostZoom.id})
      
      zoomUser = await zoom.patch({path: `users/${host.fields['Zoom ID']}/settings`, body: {
        meeting_security: {
          embed_password_in_join_link: true
        },
      }})
    }
    
    const hostKey = Math.random().toString().substr(2,6).padEnd(6,0)
    await zoom.patch({ path: `users/${host.fields['Zoom ID']}`, body: { host_key: hostKey}})
    
    // start a meeting with the zoom client
    const meeting = await zoom.post({
      path: `users/${host.fields['Zoom ID']}/meetings`,
      body: {
        type: 2, // type 2 == scheduled meeting
        host_video: true,
        participant_video: true,
        join_before_host: true,
      }
    })
    
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
    'Host': [host.id],
    'Started At': Date.now(),
    'Creator Slack ID': req.body.user_id,
    'Join URL': meeting.join_url,
  })
  
  const slackPostFields = {
    response_type: 'in_channel',
    text: 'A new Zoom Pro meeting was started with /z',
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `After running \`/z\`, you wander the creaky hallways and stumble upon the *${host.fields['Name Displayed to Users']}*. You try it and the door is unlocked.`
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
      text: 'You find a golden key',
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Something shiny catches your eye. You find <${meeting.start_url}|a golden key> you can use to make yourself the administrator of the *${host.fields['Name Displayed to Users']}*.`
        }
      }]
    })
  })
})
}