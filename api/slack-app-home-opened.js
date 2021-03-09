const transcript = require('./transcript')
const fetch = require('node-fetch')

module.exports = async user => {
  try {
    await fetch('https://slack.com/api/views.publish', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transcript('appHome.loading', {user}))
    }).then(r => r.json())

    await new Promise(resolve => setTimeout(resolve, 1000))
      // TODO: actually load in a page to do stuff with
    throw new Error('Not yet implemented')
  } catch (err) {
    await fetch('https://slack.com/api/views.publish', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transcript('appHome.error', {err}))
    }).then(r => r.json()).finally(d => console.log(d))
    throw err
  }
}