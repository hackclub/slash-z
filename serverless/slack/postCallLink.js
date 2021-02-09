const { default: fetch } = require("node-fetch")
const { registerZoomCall } = require("./registerZoomCall")

module.exports = async (req, res) => {
  console.log('starting to post the call link')
  const zoomMeeting = await (await fetch('http://localhost:3000/api/zoom/new')).json()
  const slackUser = {
    id: req.body.user_id,
    username: req.body.user_name
  }
  const call = await registerZoomCall({zoomMeeting, slackUser})
  const callbackUrl = req.body.response_url
  await fetch(callbackUrl, {
    method: 'post',
    body: {
      token: process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN,
      response_type: 'in_channel',
      text: 'A new Zoom Pro meeting was started with /z',
      blocks: [{
        type: 'call',
        call_id: call.id
      }]
    }
  }).catch(err => {console.log(err)})

  res.status(200).send({ok: true})
}