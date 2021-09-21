// slash-z.hackclub.com/api/endpoints/bank/create-meeting
export default async (req, res) => {
  const { userID, hostSettings={} } = req.body

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
      hostSettings,
    }
  })
  // example
  res.send({
    ok: false,
    error: 'No open hosts'
  })
}