const ZoomMeeting = require("../zoom/meeting")
const SlackCall = require("./slack-call")

module.exports = async (req, res) => {
  // Acknowledge we got the message so Slack doesn't show an error to the user
  res.status(200).send('Working on it!')

  const user = {
    slackID: req.body.user_id,
    username: req.body.user_name
  }
  // generate a zoom call
  const meeting = new ZoomMeeting()
  await meeting.start()
  // register the call with slack
  const sc = new SlackCall({meeting, user})
  await sc.register()
  // post the call to slack
  await sc.post(req.body.response_url)
}