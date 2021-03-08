const ensureSlackAuthenticated = require("../../ensure-slack-authenticated")
const slackAppHomeOpened = require('../../slack-app-home-opened')

module.exports = async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    console.log(`Got verified Slack event of type '${req.body.type}'`)
    if (req.body.type == 'url_verification') {
      return res.send({ challenge: req.body.challenge })
    }
    if (req.body.type == 'event_callback') {
      console.log(`Got event of subtype ${req.body.event.type}`)
      switch (req.body.event.type) {
        case 'app_home_opened':
          const { user } = req.body.event
          const result = await slackAppHomeOpened(user)
          res.status(200).send()
          break
      default:
        throw new Error(`Unsupported slack event: '${req.body.type}'`)
      }
    }
  })
}