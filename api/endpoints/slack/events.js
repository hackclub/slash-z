const ensureSlackAuthenticated = require("../../ensure-slack-authenticated")

module.exports = async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    console.log(`Got verified Slack event of type '${req.body.type}'`)
    if (req.body.type == 'url_verification') {
      return res.send({ challenge: req.body.challenge })
    }
    if (req.body.type == 'event_callback') {
      switch (req.body.event.type) {
        case 'app_home_opened':
          // await displaySlackAppHomeFor(user)
          const { user } = req.body
          await fetch('https://slack.com/api/views.publish', {
            method: 'post',
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: user,
              view: {
                type: 'home',
                blocks: {
                  type: "section",
                  text: {
                    type: 'mrkdwn',
                    text: 'loading...'
                  }
                },
              }
            })
          })
          break
      default:
        throw new Error(`Unsupported slack event: '${req.body.type}'`)
      }
    }
  }
}