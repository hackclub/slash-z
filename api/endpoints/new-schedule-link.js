const AirBridge = require("../airbridge")

module.exports = async (req, res) => {
  let user = await AirBridge.find('Authed Accounts', { filterByFormula: `{Name}='${req.query.id}'` })
  if (!user) {
    user = await AirBridge.create('Authed Accounts', {'Name': req.query.id})
  }
  if (!user.fields['Slack ID']) {
    // No slack ID for this user? they're unauthenticated! Let's return an auth challenge
    const redirectUrl = 'https://hack.af/z/slack-auth'
    // const authUrl = `https://slack.com/oauth/v2/authorize?response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&user_scope=identify&client_id=2210535565.1711449950551&state=${user.id}`
    const authUrl = `https://js-slash-z.hackclub.com/auth-start.html?response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&user_scope=identify&client_id=2210535565.1711449950551&state=${user.id}`
    return res.json({
      error: 'AUTH',
      authUrl
    })
  }

  // let's spice this name creation up in the future too
  const id = Math.random().toString(36).substring(7)
  res.json({id, videoUri: `https://hack.af/z?id=${id}`, phoneUri: `https://hack.af/zphone?id=${id}` })

  AirBridge.create('Scheduling Links', {
    'Name': id,
    'Creator Slack ID': user.fields['Slack ID'],
    'Authed Account': [user.id],
  })
}