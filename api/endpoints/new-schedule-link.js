const AirBridge = require("../airbridge")

module.exports = async (req, res) => {
  let user = await AirBridge.find('Authed Accounts', { filterByFormula: `{Name}='${req.query.id}'` })
  if (!user) {
    user = await AirBridge.create('Authed Accounts', {'Name': req.query.id})
  }
  if (!user.fields['Slack ID']) {
    // No slack ID for this user? they're unauthenticated! Let's return an auth challenge
    return res.json({
      error: 'AUTH',
      redirectTo: `https://hack.af/z/auth?id${user.id}`
    })
  }

  // let's spice this name creation up in the future too
  const id = Math.random().toString(36).substring(7)
  res.json({id, videoUri: `https://hack.af/z?id=${id}`})

  AirBridge.create('Scheduling Links', {
    'Name': id,
    'Creator Slack ID': user.fields['Slack ID'],
    'Authed Account': [user.id],
  })
}