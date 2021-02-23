const { default: fetch } = require('node-fetch')
const AirBridge = require('../airbridge')
module.exports = async (req, res) => {
  const {code, state: recordID} = req.query
  const user = await AirBridge.find('Authed Accounts', {filterByFormula: `RECORD_ID()='${recordID}'`})

  if (user) {
    const tokenUrl = 'https://slack.com/api/oauth.v2.access' +
                      `?code=${code}` +
                      `&client_id=${process.env.SLACK_CLIENT_ID}` +
                      `&client_secret=${process.env.SLACK_CLIENT_SECRET}` +
                      `&redirect_uri=${encodeURIComponent('https://hack.af/z/slack-auth')}`
                      console.log({tokenUrl})
    const slackToken = await fetch(tokenUrl, {method: 'post'}).then(r => r.json())
    console.log({slackToken})
    AirBridge.patch('Authed Accounts', recordID, { 'Slack Auth Code': slackToken })
    const slackUser = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
    })
    res.status(200).send('It worked! You can close this tab now')
  } else {
    // oh, we're far off the yellow brick road now...
    res.status(422).send('Uh oh...')
  }
}