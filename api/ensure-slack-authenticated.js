// this is a helper method to make sure the slack request we get is authentic
const crypto = require('crypto')
module.exports = async (req, res, callback) => {
  const secret = process.env.SLACK_SIGNING_SECRET
  // if there is no signing secret in the config, just skip
  if (!secret) {
    return callback()
  }
  const timestamp = req.header('X-Slack-Request-Timestamp')
  const body = req.body
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySig = `v0=${crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex')}`
  console.log({
    slackSig: req.header('X-Slack-Signature'),
    mySig
  })
  if (req.header('X-Slack-Signature') == mySig) {
    callback()
  } else {
    res.status(403).send('Missing/invalid Slack verification token')
  }
}