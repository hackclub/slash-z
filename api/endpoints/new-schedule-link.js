const AirBridge = require("../airbridge")

module.exports = async (req, res) => {
  let user = await AirBridge.find('Authed Accounts', { filterByFormula: `{Name}='${req.query.id}'` })
  if (!user) {
    // in the future, we'll return an oauth challenge if we can't find a user
    // with this id. for now, let's just give them an account
    user = await AirBridge.create('Authed Accounts', {'Name': req.query.id})
  }

  // let's spice this name creation up in the future too
  const id = Math.random().toString(36).substring(7)
  res.status(200).send({id, videoUri: `https://hack.af/z?id=${id}`})

  AirBridge.create('Scheduling Links', {
    'Name': id,
    'Creator Slack ID': user.fields['Slack ID'],
    'Authed Account': [user.id],
  })
}