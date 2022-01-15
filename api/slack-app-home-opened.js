import transcript from './transcript.js'
import fetch from 'node-fetch'
import getPublicMeetings from './get-public-meetings.js'
import getScheduledMeetings from './get-scheduled-meetings.js'
import Prisma from './prisma.js'
import zoomMeetingToRecording from './zoom-meeting-to-recording.js'

const publishPage = async ({blocks, user})=> {
  return await fetch('https://slack.com/api/views.publish', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: user,
      view: {
        type: 'home',
        blocks
      }
    })
  }).then(r => r.json())
}

const publishLoadingPage = async user => {
  const result = await publishPage({user,
    ...transcript('appHome.loading')
  })
  console.log(result)
  return result
}

const publishErrorPage = async ({user,err}) => {
  const result = await publishPage({user,
    ...transcript('appHome.error', {err})
  })
  console.log(result)
  return result
}

const publishHomePage = async ({user, results}) => {
  const blocks = []
  blocks.push(transcript('appHome.greeting', {user}))
  blocks.push(transcript('appHome.divider'))
  if (results.publicMeetings.length > 0) {
    blocks.push(transcript('appHome.publicMeetings', {publicMeetings: results.publicMeetings}))
    blocks.push(transcript('appHome.divider'))
  }
  if (results.recordings != {}) {
    if (results.recordings.processing.length > 0) {
      blocks.push(transcript('appHome.recordedMeetings.processing', {processingCount: results.recordings.processing.length}))
    }

    if (results.recordings.completed.length > 0) {
      const completedRecordings = results.recordings.completed.map(c => ({
        password: c?.settings?.password,
        url: c.share_url,
        meetingID: c.id,
        duration: Math.max(c.duration, 1) // '0 minute call' -> '1 minute call'
      }))
      blocks.push(transcript('appHome.recordedMeetings.completed', {completedRecordings}))
    }
    blocks.push(transcript('appHome.divider'))
  }
  blocks.push(transcript('appHome.calendarAddon.'+Boolean(results.user)))
  if (results.user) { // has access to the google calendar add-on
    const sm = results.scheduledMeetings
    if (sm.length > 1) {
      blocks.push(transcript('appHome.scheduledHostKeys.multiple', {sm}))
    } else if (sm.length == 1) {
      blocks.push(transcript('appHome.scheduledHostKeys.single', {hostKey: sm[0].meeting.hostKey}))
    } else {
      blocks.push(transcript('appHome.scheduledHostKeys.none'))
    }
  }
  blocks.push(transcript('appHome.divider'))
  const result = await publishPage({user, blocks})
  console.log(result)
  return result
}

const getUserInfo = async user => {
  return await Prisma.find('authedAccount', { where: { slackID: user } })
}

const getRecordings = async (user) => {
  const completedRecordingMeetings = await Prisma.get("meeting", {
    where: {
      creatorSlackID: user,
      webhookEvents: {
        some: {
          eventType: {
            contains: "recording.completed"
          },
        },
      },
    },
  });
  const processing = await Prisma.get("meeting", {
    where: {
      creatorSlackID: user,
      webhookEvents: {
        some: {
          eventType: {
            contains: "recording.started"
          },
        },
      },
      NOT: {
        webhookEvents: {
          some: {
            eventType: {
              contains: "recording.completed"
            },
          },
        },
      },
    },
  });
  const completed = completedRecordingMeetings.map(async meeting => {
    try {
      return await zoomMeetingToRecording(meeting.zoomID)
    } catch (err) {
      console.log(err)
      return null
    }
  }).filter(Boolean)

  return { completed, processing }
}

export default async (user, loading=true) => {
  const results = {}
  try {
    const taskArray = [
      getPublicMeetings().then(pm => results.publicMeetings = pm),
      getRecordings(user).then(r => results.recordings = r),
      getUserInfo(user).then(u => results.user = u),
      getScheduledMeetings(user).then(sm => results.scheduledMeetings = sm)
    ]

    // if running with the loading argument, show a loading page & ensure at
    // least 2 seconds of loading to prevent flashing the user with updates

    if (loading) {
      taskArray.push(new Promise(resolve => setTimeout(resolve, 2000)))
      taskArray.push(publishLoadingPage(user))
    }

    await Promise.all(taskArray)

    await publishHomePage({user, results})
  } catch (err) {
    await publishErrorPage({user, err})
  }
}