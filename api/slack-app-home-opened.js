const transcript = require('./transcript')
module.exports = user => {
  return transcript('appHome.loading', {user})
  // await fetch('https://slack.com/api/views.publish', {
  //   method: 'post',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify(transcript('appHome.loading', {user}))
  // }).then(r => r.json()).finally(f => console.log(f))
}