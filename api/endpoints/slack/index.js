const ensureSlackAuthenticated = require("../../ensure-slack-authenticated")
const slashZ = require('./slash-z')

module.exports = async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    
    // Acknowledge we got the message so Slack doesn't show an error to the user
    res.status(200).send()

    switch(req.body.command) {
      case 'z':
        await slashZ(req, res)
        break
      default:
        throw new Error('Unsupported slash command')
    }
})
}