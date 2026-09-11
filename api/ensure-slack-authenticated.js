// this is a helper method to make sure the slack request we get is authentic
// https://docs.slack.dev/authentication/verifying-requests-from-slack/
import crypto from 'crypto'

const MAX_TIMESTAMP_AGE_SECONDS = 60 * 5

export default async (req, res, callback) => {
  const secret = process.env.SLACK_SIGNING_SECRET
  // without the signing secret we can't tell real Slack requests from forged
  // ones, so refuse to handle the request at all
  if (!secret) {
    console.error('SLACK_SIGNING_SECRET is not set, refusing to handle Slack request')
    return res.status(500).send('Slack request verification is not configured')
  }

  const timestamp = req.header('X-Slack-Request-Timestamp')
  const givenSig = req.header('X-Slack-Signature')
  // req.rawBody is captured by the body parsers in server.js — the signature
  // is computed over the exact bytes Slack sent, not the parsed body
  if (!timestamp || !givenSig || !req.rawBody) {
    return res.status(403).send('Missing/invalid Slack request signature')
  }

  // reject requests older than five minutes to protect against replays
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > MAX_TIMESTAMP_AGE_SECONDS) {
    return res.status(403).send('Missing/invalid Slack request signature')
  }

  const mySig = 'v0=' + crypto.createHmac('sha256', secret)
    .update(`v0:${timestamp}:`)
    .update(req.rawBody)
    .digest('hex')

  // don't compare the signatures as strings: == / === short-circuits at the
  // first differing character, so response timing would reveal how much of a
  // guessed signature is correct. timingSafeEqual compares in constant time,
  // and only accepts Buffers of equal length — the length pre-check leaks
  // nothing, since valid signatures are always 'v0=' + 64 hex chars
  const mySigBuffer = Buffer.from(mySig)
  const givenSigBuffer = Buffer.from(givenSig)
  if (mySigBuffer.length === givenSigBuffer.length && crypto.timingSafeEqual(mySigBuffer, givenSigBuffer)) {
    return callback()
  }

  return res.status(403).send('Missing/invalid Slack request signature')
}
