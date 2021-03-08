const transcript = require('./transcript')
module.exports = async user => {
  await fetch('https://slack.com/api/views.publish', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transcript('appHome.loading', {user}))
  }).then(r => r.json()).catch(async err => {
    await fetch('https://slack.com/api/views.publish', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transcript('appHome.error', {err}))
    })
    throw err
  }).finally(f => console.log(f))
}