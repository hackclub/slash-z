import Prisma from './prisma.js'
import isPublicSlackChannel from './is-public-slack-channel.js'
import userIsRestricted from './user-is-restricted.js'
import channelIsForbidden from './channel-is-forbidden.js'
import openZoomMeeting from './open-zoom-meeting.js'
import transcript from './transcript.js'
import fetch from 'node-fetch'

export default async ({
  displayName,
  userId,
  channelId,
  responseUrl,
  skipWarning = false
}) => {
  if (await userIsRestricted(userId)) {
    return fetch(responseUrl, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: transcript('errors.userIsRestricted')
      })
    })
  }

  if (channelIsForbidden(channelId)) {
    return fetch(responseUrl, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: transcript('errors.channelIsForbidden')
      })
    })
  }

  const isMeetingPublic = await isPublicSlackChannel(channelId)

  if (
    !skipWarning &&
    isMeetingPublic &&
    !(await Prisma.get('ignoredWarningUser', userId)).length
  ) {
    await fetch(responseUrl, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'ephemeral',
        ...transcript('publicChannelWarning')
      })
    })
    return
  }

  const loadingSlackPost = await fetch(responseUrl, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'in_channel',
      text: 'A new Zoom Pro meeting was started with /z'
    })
  })

  // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
  // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
  // ¯\_(ツ)_/¯

  let meeting
  try {
    meeting = await openZoomMeeting({ creatorSlackID: userId })
  } catch (err) {
    const errorSlackPost = await fetch(responseUrl, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'in_channel',
        text: 'Out of open hosts!'
      })
    })
    throw err
  }

  // now register the call on slack
  const slackCallFields = {
    external_unique_id: meeting.id,
    join_url: meeting.join_url,
    created_by: userId,
    date_start: Math.floor(Date.now() / 1000), // Slack works in seconds, Date.now gives ms
    desktop_app_join_url: `zoommtg://zoom.us/join?confno=${meeting.id}&zc=0&pwd=${meeting.encrypted_password}`,
    external_display_id: meeting.id,
    title: `Zoom Pro meeting started by ${displayName}`
  }

  const slackCallResult = await fetch('https://slack.com/api/calls.add', {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    method: 'post',
    body: JSON.stringify(slackCallFields)
  }).then(r => r.json())
  const slackCall = slackCallResult.call

  // & post to slack + db!
  await Prisma.create('meeting', {
    zoomID: '' + meeting.id,
    slackCallID: slackCall.id,
    host: {
      connect: {
        id: meeting.host.id
      }
    },
    startedAt: new Date(),
    creatorSlackID: userId,
    joinURL: meeting.join_url,
    hostJoinURL: meeting.start_url,
    rawData: JSON.stringify(meeting, null, 2),
    slackChannelID: channelId,
    public: isMeetingPublic,
    hostKey: meeting.hostKey
  })

  const slackPostFields = {
    response_type: 'in_channel',
    text: 'A new Zoom Pro meeting was started with /z',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `After running \`/z\`, you wander the creaky hallways and stumble upon the *${meeting.displayName}*. You try it and the door is unlocked.`
        }
      },
      {
        type: 'call',
        call_id: slackCall.id
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_Psst ${meeting.join_url} is the call link._`
        }
      }
    ]
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
  const slackPost = await fetch(responseUrl, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(slackPostFields)
  })

  await fetch(responseUrl, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'ephemeral',
      text: ':key: You find a golden key',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `You find a hastily scribbled note on the ground. You find the numbers *${meeting.hostKey}* you can use to <https://support.zoom.us/hc/en-us/articles/115001315866-Host-Key-Control-For-Zoom-Rooms|make yourself the host> of the *${meeting.displayName}*.`
          }
        }
      ]
    })
  })

  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: 'C02FAFA2JTT', // hardcode channel ID
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*New Zoom Meeting*\nUser: <@${userId}> (${userId})\nChannel: <#${channelId}> (${channelId})\nPublic Meeting? ${isMeetingPublic}\nZoom ID: ${meeting.id}`
            },
            accessory: {
              type: 'image',
              image_url:
                'https://cloud-nz8prdq79-hack-club-bot.vercel.app/0image.png',
              alt_text: 'slashz logo'
            }
          },
          {
            type: 'divider'
          }
        ]
      })
    })
  } catch (error) {
    // just in case I completely break /z
    console.error(error)
  }
}
