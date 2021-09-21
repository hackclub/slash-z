export default async (req, res) => {
  const { authorization } = req.headers // in the format 'Bearer <token>'

  const {
    status, // 'OPEN', or 'ENDED'
    userID
  } = req.query

  res.send({
    ok: true,
    meetings: [
      {...} // see ./get-meeting.js for example object
    ]
  })
}