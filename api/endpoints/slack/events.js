const ensureSlackAuthenticated = require("../../ensure-slack-authenticated")

module.exports = async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    res.status(200).send()
    console.log(`Got verified Slack event of type '${req.body.type}'`)
    switch(req.body.type) {
      case 'url_verification': {
        res.send({ challenge: req.body.challenge})
        break
      }
      case 'app_home_opened':
        // await displaySlackAppHomeFor(user)
        break
      default:
        throw new Error(`Unsupported slack event: '${req.body.type}'`)
    }
  })
}