const ensureSlackAuthenticated = require("../../ensure-slack-authenticated")
const { default: fetch } = require("node-fetch")
const { transcript } = require("../../transcript")

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
          // await displaySlackAppHomeFor(user)
          const { user } = req.body.event
          const result = await fetch('https://slack.com/api/views.publish', {
            method: 'post',
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(transcript('appHome.loading', {user}))
          }).then(r => r.json())
          // const secondRequest = await fetch('https://slack.com/api/views.publish', {
          //   method: 'post',
          //   headers: {
          //     'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
          //     'Content-Type': 'application/json'
          //   },
          //   body: JSON.stringify({
          //     user_id: user,
          //     view: {
          //       type: 'home',
          //       blocks: [{
          //         type: 'image',
          //         title: {
          //           type: 'plain_text',
          //           text: ":warning: This part of the mansion is still under construction, please pardon our dust.",
          //           emoji: true
          //         },
          //         image_url: 'https://cloud-oshyn030x-hack-club-bot.vercel.app/0z0q4jqa.gif',
          //         alt_text: 'skeletons dancing'
          //       }]
          //     }
          //   })
          // }).then(r => r.json())
          // console.log(secondRequest)
          res.status(200).send()
          break
      default:
        throw new Error(`Unsupported slack event: '${req.body.type}'`)
      }
    }
  })
}