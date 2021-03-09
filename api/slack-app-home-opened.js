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

    setTimeout(() => {
      // TODO: actually load in a page to do stuff with
      throw new Error('Not yet implemented')
    }, 1000)
  } catch (err) {
    await fetch('https://slack.com/api/views.publish', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transcript('appHome.error', {err}))
    })
    throw err
  }
}