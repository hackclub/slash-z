import fetch from 'node-fetch'
import ensureSlackAuthenticated from '../../ensure-slack-authenticated.js'
import slashZInner from '../../slash-z-inner.js'
import Prisma from '../../prisma.js'

export default async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    // Acknowledge we got the message so Slack doesn't show an error to the user
    res.status(200).send()

    const payload = JSON.parse(req.body.payload)
    if (payload.actions.length < 1) return

    switch (payload.actions[0].value) {
      case 'slash-z-start':
        // Run /z as usual
        await slashZInner({
          displayName: payload.user.name,
          userId: payload.user.id,
          channelId: payload.container.channel_id,
          responseUrl: payload.response_url,
          skipWarning: true
        })
        break

      case 'slash-z-cancel':
        // Do nothing except delete the ephemeral message
        await fetch(payload.response_url, {
          method: 'post',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: '',
            delete_original: true
          })
        })
        break

      case 'slash-z-start-ignore':
        // Run /z and remember not to warn the user again
        if (!(await Prisma.get('ignoredWarningUser', payload.user.id)).length) {
          await Prisma.create('ignoredWarningUser', {
            id: payload.user.id
          })
        }
        await slashZInner({
          displayName: payload.user.name,
          userId: payload.user.id,
          channelId: payload.container.channel_id,
          responseUrl: payload.response_url,
          skipWarning: true
        })
        break

      default:
        throw new Error(
          `Unsupported interaction: '${payload.actions[0].value}'`
        )
    }
  })
}
