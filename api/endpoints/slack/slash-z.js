import AirBridge from "../../airbridge.js"
import isPublicSlackChannel from "../../is-public-slack-channel.js"
import userIsRestricted from "../../user-is-restricted.js"
import channelIsForbidden from "../../channel-is-forbidden.js"
import openZoomMeeting from '../../open-zoom-meeting.js'
import transcript from '../../transcript.js'
import fetch from 'node-fetch'

export default async (req, res) => {
  console.log({
    user_id: req.body.user_id,
    channel_id: req.body.channel_id,
    restricted: userIsRestricted(req.body.user_id),
    forbidden: channelIsForbidden(req.body.channel_id)
  })

  if (await userIsRestricted(req.body.user_id)) {
    return fetch(req.body.response_url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: transcript('errors.userIsRestricted')
      })
    })
  }

  if (channelIsForbidden(req.body.channel_id)) {
    return fetch(req.body.response_url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: transcript('errors.channelIsForbidden')
      })
    })
  }

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

  // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
  // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
  // ¯\_(ツ)_/¯

  let meeting
  try {
    meeting = await openZoomMeeting({ creatorSlackID: req.body.user_id })
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
  
  let member;
  try {
    member = await (await fetch('https://slack.com/api/users.profile.get', { // get a specific user from Slack
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user: req.body.user_id // fetch the user that called the command
      })
    }).json());
  } catch (err) {
    console.log(err);
  }
  let displayName;
  if (member && member.ok === true) {
    displayName = member.profile.display_name || member.profile.real_name || req.body.user_name; // if it doesn't have the name, use the name returned by Slack 
  } else {
    displayName = req.body.user_name; // if there was an error getting the user, use the name returned by Slack
  }
  
  // now register the call on slack
  const slackCallFields = {
    external_unique_id: meeting.id,
    join_url: meeting.join_url,
    created_by: req.body.user_id,
    date_start: Math.floor(Date.now() / 1000), // Slack works in seconds, Date.now gives ms
    desktop_app_join_url: `zoommtg://zoom.us/join?confno=${meeting.id}&zc=0&pwd=${meeting.encrypted_password}`,
    external_display_id: meeting.id,
    title: `Zoom Pro meeting started by ${displayName}`
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
    'Slack Channel ID': req.body.channel_id,
    'Public': await isPublicSlackChannel(req.body.channel_id),
    'Host Key': meeting.hostKey
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
    }, {
      type: 'call',
      call_id: slackCall.id
    }, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_Psst ${meeting.join_url} is the call link._`
      }
    }]
  }
  if (meeting.password) {
    slackPostFields.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_The meeting password is *${meeting.password}*_.`
      }
    })
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
          text: `You find a hastily scribbled note on the ground. You find the numbers *${meeting.hostKey}* you can use to <https://support.zoom.us/hc/en-us/articles/115001315866-Host-Key-Control-For-Zoom-Rooms|make yourself the host> of the *${meeting.host.fields['Name Displayed to Users']}*.`
        }
      }]
    })
  })
}
