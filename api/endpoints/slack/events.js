import ensureSlackAuthenticated from "../../ensure-slack-authenticated.js"
import slackAppHomeOpened from '../../slack-app-home-opened.js'

export default async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    console.log(`Got verified Slack event of type '${req.body.type}'`)
    if (req.body.type == 'url_verification') {
      return res.send({ challenge: req.body.challenge })
    }
    if (req.body.type == 'event_callback') {
      console.log(`Got event of subtype ${req.body.event.type}`)
      switch (req.body.event.type) {
        case 'app_home_opened':
          res.status(200).send()
          if (req.body.event.tab === 'home') {
            const { user } = req.body.event
            const result = await slackAppHomeOpened(user)
          } else {
            console.log(`False alarm, this user is opening the '${req.body.event.tab}' tab. I'm ignoring it.`)
          }
          break
        default:
          throw new Error(`Unsupported slack event: '${req.body.type}'`)
      }
    }
  })
}