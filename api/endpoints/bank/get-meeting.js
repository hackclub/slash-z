// slash-z.hackclub.com/api/endpoints/bank/get-meeting?zoomID=12334401293
export default async (req, res) => {
  const { zoomID } = req.query

  const { authorization } = req.headers // in the format 'Bearer <token>'

  res.send({
    ok: true,
    meeting: {
      userID,
      status, // 'OPEN' or 'ENDED
      zoomID,
      startedAt,
      endedAt,
      hostJoinURL, // not recommended– this will log them in as the host account, and they won't have their personal settings/preferences
      joinURL, // use this for sending to the user
      hostKey, // use this for sending to the user
    }
  })
  // example error
  res.send({
    ok: false,
    error: 'meeting not found, invalid zoomID'
  })
}