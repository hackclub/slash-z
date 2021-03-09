const transcript = require('./transcript')
const fetch = require('node-fetch')
const getPublicMeetings = require('./get-public-meetings')
const airbridge = require('./airbridge')

const publishPage = async ({user, body})=> {
  return await fetch('https://slack.com/api/views.publish', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(r => r.json())
}

const publishLoadingPage = async user => {
  return await publishPage({user, body: transcript('appHome.loading', {user})})
}

const publishErrorPage = async ({user,err}) => {
  return await publishPage({user, body: transcript('appHome.error', {err})})
}

const publishHomePage = async ({user, results}) => {
  return await publishPage({user, body: transcript('appHome.page', {...results})})
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
      getPublicMeetings().then(m => results.publicMeetings = m),
      getUserInfo(user).then(u => results.user = u)
    ])

    await publishHomePage({user, results})
  } catch (err) {
    await publishErrorPage({user, err})
  }
}