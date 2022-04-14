import slashZInner from '../../slash-z-inner.js'

export default async (req, res) => {
  await slashZInner({
    displayName: req.body.user_name,
    userId: req.body.user_id,
    channelId: req.body.channel_id,
    responseUrl: req.body.response_url
  })
}
