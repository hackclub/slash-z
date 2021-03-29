const transcript = require('./transcript')
const fetch = require('node-fetch')
const getPublicMeetings = require('./get-public-meetings')
const getScheduledMeetings = require('./get-scheduled-meetings')
const airbridge = require('./airbridge')

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

module.exports = async user => {
  const results = {}
  try {
    await Promise.all([
      publishLoadingPage(user),
      new Promise(resolve => setTimeout(resolve, 2000)),
      getPublicMeetings().then(pm => results.publicMeetings = pm),
      getUserInfo(user).then(u => results.user = u),
      getScheduledMeetings(user).then(sm => results.scheduledMeetings = sm)
    ])

    await publishHomePage({user, results})
  } catch (err) {
    await publishErrorPage({user, err})
  }
}