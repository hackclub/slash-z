const transcript = require('./transcript')
const fetch = require('node-fetch')
const getPublicMeetings = require('./get-public-meetings')
const getScheduledMeetings = require('./get-scheduled-meetings')
const airbridge = require('./airbridge')
const zoomMeetingToRecording = require('./zoom-meeting-to-recording')

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
      blocks.push(transcript('appHome.recordedMeetings.completed', {completedCount: results.recordings.completed.length}))
    }
    blocks.push(transcript('appHome.divider'))
  }
  blocks.push(transcript('appHome.calendarAddon.'+Boolean(results.user)))
  if (results.user) { // has access to the google calendar add-on
    const sm = results.scheduledMeetings
    if (sm.length > 1) {
      blocks.push(transcript('appHome.scheduledHostKeys.multiple', {sm}))
    } else if (sm.length == 1) {
      blocks.push(transcript('appHome.scheduledHostKeys.single', {hostKey: sm[0].meeting.fields['Host Key']}))
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
  const filterByFormula = `{Slack ID}='${user}'`
  return await airbridge.find('Authed Accounts', {filterByFormula})
}

const getRecordings = async (user) => {
  const recordedMeetings = await airbridge.get('Meetings', {
    filterByFormula: `AND({Creator Slack ID}='${user}',NOT({Recording Events}=BLANK()))`
  })
  const completed = recordedMeetings.filter(record => {
    return record.fields['Recording Events'].includes('recording.completed')
    // // if Zoom told us the recording is complete, assume it's complete
    // const markedComplete = record.fields['Recording Events'].includes('recording.completed')
    // // if Zoom hasn't told us the recording is c
    // const pastDue = record.fields['']
    // markedComplete || pastDue
  }).map(async meeting => {
    return await zoomMeetingToRecording(meeting.fields['Zoom ID'])
  })
  const processing = recordedMeetings.filter(record => {
    record.fields['Recording Events'].includes('recording.started')
  })

  return { completed, processing }
}

module.exports = async (user, loading=true) => {
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