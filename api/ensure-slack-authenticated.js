// this is a helper method to make sure the slack request we get is authentic
const crypto = require('crypto')
module.exports = async (req, res, callback) => {
  const timestamp = req.header('X-Slack-Request-Timestamp')
  const body = req.body()
  const sigBasestring = `v0:${timestamp}:${body}`
  const secret = process.env.SLACK_SIGNING_SECRET
  const mySig = `v0=${crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex')}`
  if (req.header('X-Slack-Signature') == mySig) {
    callback()
  } else {
    res.status(403).send('Missing/invalid Zoom verification token')
  }
}